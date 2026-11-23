-- Acceso y usuarios: cada empresa puede invitar a más personas a su plataforma,
-- con tres roles.
--   propietario:   todo, incluido cambiar roles y quitar a cualquiera.
--   administrador: todo lo de la empresa (datos, envío, facturación) e invitar
--                  o quitar editores.
--   editor:        equipo, campos y diseños. Ve los datos de envío y de
--                  facturación, pero no los cambia.
-- Las invitaciones van por correo: quien entra con ese correo (ya verificado
-- por la liga, el código o su cuenta de Google o Microsoft) las ve y las acepta.

-- ---------------------------------------------------------------------------
-- Invitaciones
-- ---------------------------------------------------------------------------

create table public.invitaciones (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  correo text not null check (correo = lower(correo) and char_length(correo) between 5 and 254),
  rol text not null default 'editor' check (rol in ('administrador', 'editor')),
  invitado_por uuid references auth.users (id) on delete set null,
  creado_en timestamptz not null default now(),
  unique (empresa_id, correo)
);
create index invitaciones_correo_idx on public.invitaciones (correo);

-- ---------------------------------------------------------------------------
-- Funciones internas
-- ---------------------------------------------------------------------------

create function privado.rol_en(p_empresa uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select m.rol from public.miembros m
  where m.empresa_id = p_empresa and m.usuario_id = (select auth.uid());
$$;

-- Correo de la sesión, en minúsculas. Siempre está verificado: las cuentas se
-- crean solo con liga, código o proveedor externo.
create function privado.mi_correo()
returns text
language sql
stable
set search_path = ''
as $$
  select lower(nullif((select auth.jwt()) ->> 'email', ''));
$$;

revoke all on function privado.rol_en(uuid), privado.mi_correo() from public;
grant execute on function privado.rol_en(uuid), privado.mi_correo() to authenticated;

-- ---------------------------------------------------------------------------
-- Funciones de la API
-- ---------------------------------------------------------------------------

-- Personas con acceso a la empresa, con su correo y su nombre.
create function public.usuarios_de(p_empresa uuid)
returns table (usuario_id uuid, rol text, correo text, nombre text, desde timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select m.usuario_id, m.rol, u.email::text, p.nombre, m.creado_en
  from public.miembros m
  join auth.users u on u.id = m.usuario_id
  left join public.perfiles p on p.id = m.usuario_id
  where m.empresa_id = p_empresa and privado.es_miembro(p_empresa)
  order by case m.rol when 'propietario' then 0 when 'administrador' then 1 else 2 end, m.creado_en;
$$;

-- Invita a un correo. Si ya estaba invitado, actualiza su rol.
create function public.invitar_usuario(p_empresa uuid, p_correo text, p_rol text default 'editor')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rol text := privado.rol_en(p_empresa);
  v_correo text := lower(btrim(coalesce(p_correo, '')));
  v_invitacion uuid;
begin
  if v_rol is null or v_rol not in ('propietario', 'administrador') then
    raise exception 'No tienes permiso para invitar personas a esta empresa.' using errcode = '42501';
  end if;
  if p_rol not in ('administrador', 'editor') then
    raise exception 'Ese rol no existe.' using errcode = 'P0001';
  end if;
  if p_rol = 'administrador' and v_rol <> 'propietario' then
    raise exception 'Solo quien es dueño de la empresa puede invitar administradores.' using errcode = '42501';
  end if;
  if v_correo !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$' or char_length(v_correo) > 254 then
    raise exception 'Escribe un correo válido.' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.miembros m join auth.users u on u.id = m.usuario_id
    where m.empresa_id = p_empresa and lower(u.email) = v_correo
  ) then
    raise exception 'Esa persona ya tiene acceso a esta empresa.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.invitaciones where empresa_id = p_empresa) >= 50 then
    raise exception 'Llegaste al máximo de invitaciones pendientes.' using errcode = 'P0001';
  end if;

  insert into public.invitaciones (empresa_id, correo, rol, invitado_por)
  values (p_empresa, v_correo, p_rol, (select auth.uid()))
  on conflict (empresa_id, correo) do update
    set rol = excluded.rol, invitado_por = excluded.invitado_por, creado_en = now()
  returning id into v_invitacion;
  return v_invitacion;
end;
$$;

-- Invitaciones pendientes para el correo de la sesión, con el nombre de la empresa.
create function public.mis_invitaciones()
returns table (id uuid, empresa_id uuid, empresa text, rol text, creado_en timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select i.id, i.empresa_id, e.nombre, i.rol, i.creado_en
  from public.invitaciones i
  join public.empresas e on e.id = i.empresa_id
  where i.correo = privado.mi_correo()
  order by i.creado_en;
$$;

-- Acepta una invitación dirigida al correo de la sesión.
create function public.aceptar_invitacion(p_invitacion uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := (select auth.uid());
  v_inv public.invitaciones;
begin
  if v_usuario is null then
    raise exception 'Inicia sesión para aceptar la invitación.' using errcode = '28000';
  end if;
  select * into v_inv from public.invitaciones
  where id = p_invitacion and correo = privado.mi_correo();
  if not found then
    raise exception 'Esa invitación ya no está disponible.' using errcode = 'P0001';
  end if;

  insert into public.miembros (empresa_id, usuario_id, rol)
  values (v_inv.empresa_id, v_usuario, v_inv.rol)
  on conflict (empresa_id, usuario_id) do nothing;
  delete from public.invitaciones where id = v_inv.id;
  return v_inv.empresa_id;
end;
$$;

-- Cambia el rol de alguien. Solo quien es dueño, y nunca el propio ni el de otro dueño.
create function public.cambiar_rol_usuario(p_empresa uuid, p_usuario uuid, p_rol text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if privado.rol_en(p_empresa) is distinct from 'propietario' then
    raise exception 'Solo quien es dueño de la empresa puede cambiar roles.' using errcode = '42501';
  end if;
  if p_rol not in ('administrador', 'editor') then
    raise exception 'Ese rol no existe.' using errcode = 'P0001';
  end if;
  update public.miembros set rol = p_rol
  where empresa_id = p_empresa and usuario_id = p_usuario and rol <> 'propietario';
  if not found then
    raise exception 'No se puede cambiar el rol de esa persona.' using errcode = 'P0001';
  end if;
end;
$$;

-- Quita el acceso de alguien, o el propio (salir de la empresa).
-- Quien es dueño no se puede quitar: la empresa no se queda sin dueño.
create function public.quitar_usuario(p_empresa uuid, p_usuario uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rol text := privado.rol_en(p_empresa);
  v_objetivo text;
begin
  select rol into v_objetivo from public.miembros
  where empresa_id = p_empresa and usuario_id = p_usuario;
  if v_rol is null or v_objetivo is null then
    raise exception 'Esa persona no tiene acceso a esta empresa.' using errcode = 'P0001';
  end if;
  if v_objetivo = 'propietario' then
    raise exception 'La empresa no se puede quedar sin dueño.' using errcode = 'P0001';
  end if;
  if p_usuario <> (select auth.uid())
    and not (v_rol = 'propietario' or (v_rol = 'administrador' and v_objetivo = 'editor')) then
    raise exception 'No tienes permiso para quitar a esa persona.' using errcode = '42501';
  end if;
  delete from public.miembros where empresa_id = p_empresa and usuario_id = p_usuario;
end;
$$;

revoke all on function
  public.usuarios_de(uuid), public.invitar_usuario(uuid, text, text), public.mis_invitaciones(),
  public.aceptar_invitacion(uuid), public.cambiar_rol_usuario(uuid, uuid, text),
  public.quitar_usuario(uuid, uuid)
  from public, anon;
grant execute on function
  public.usuarios_de(uuid), public.invitar_usuario(uuid, text, text), public.mis_invitaciones(),
  public.aceptar_invitacion(uuid), public.cambiar_rol_usuario(uuid, uuid, text),
  public.quitar_usuario(uuid, uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Permisos y reglas de acceso (RLS)
-- ---------------------------------------------------------------------------

revoke all on public.invitaciones from anon, public;
grant select, delete on public.invitaciones to authenticated;
alter table public.invitaciones enable row level security;

-- Las ven quienes administran la empresa y la persona invitada.
create policy "invitaciones: ver" on public.invitaciones
  for select to authenticated
  using (privado.es_admin(empresa_id) or correo = privado.mi_correo());
-- Las cancela quien administra; las rechaza la persona invitada.
create policy "invitaciones: borrar" on public.invitaciones
  for delete to authenticated
  using (privado.es_admin(empresa_id) or correo = privado.mi_correo());

-- Envío y facturación: los ve todo el equipo de la plataforma, los cambia solo
-- quien administra. (Antes los cambiaba cualquier miembro; hasta ahora todas
-- las cuentas eran dueñas de su empresa, así que nadie pierde permisos.)
do $$
declare t text;
begin
  foreach t in array array['direcciones', 'datos_fiscales'] loop
    execute format('drop policy "miembros: crear" on public.%I', t);
    execute format('drop policy "miembros: cambiar" on public.%I', t);
    execute format('drop policy "miembros: borrar" on public.%I', t);
    execute format(
      'create policy "administradores: crear" on public.%I for insert to authenticated with check (privado.es_admin(empresa_id))', t);
    execute format(
      'create policy "administradores: cambiar" on public.%I for update to authenticated using (privado.es_admin(empresa_id)) with check (privado.es_admin(empresa_id))', t);
    execute format(
      'create policy "administradores: borrar" on public.%I for delete to authenticated using (privado.es_admin(empresa_id))', t);
  end loop;
end $$;
