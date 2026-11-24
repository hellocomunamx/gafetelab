-- Fases 1 y 2 de la plataforma: cuenta, empresa, datos guardados y equipo.
-- Regla de acceso única: una persona solo ve y cambia filas de las empresas
-- donde es miembro.

-- Funciones internas fuera del esquema público, para que no queden expuestas en la API.
create schema if not exists privado;

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text check (char_length(nombre) <= 120),
  telefono text check (char_length(telefono) <= 30),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(nombre) between 1 and 120),
  giro text check (char_length(giro) <= 80),
  -- Material, diseño, dirección y cantidad para el aviso de pedido abierto.
  predeterminados jsonb not null default '{}'::jsonb,
  creado_por uuid references auth.users (id) on delete set null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create table public.miembros (
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  usuario_id uuid not null references auth.users (id) on delete cascade,
  rol text not null default 'editor' check (rol in ('propietario', 'administrador', 'editor')),
  creado_en timestamptz not null default now(),
  primary key (empresa_id, usuario_id)
);
create index miembros_usuario_idx on public.miembros (usuario_id);

create table public.direcciones (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  alias text check (char_length(alias) <= 60),
  destinatario text not null check (char_length(destinatario) between 1 and 120),
  telefono text not null check (char_length(telefono) between 7 and 30),
  calle text not null check (char_length(calle) between 1 and 160),
  colonia text not null check (char_length(colonia) between 1 and 120),
  ciudad text not null check (char_length(ciudad) between 1 and 120),
  estado text not null check (char_length(estado) between 1 and 60),
  cp text not null check (cp ~ '^[0-9]{5}$'),
  referencias text check (char_length(referencias) <= 240),
  predeterminada boolean not null default false,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index direcciones_empresa_idx on public.direcciones (empresa_id);
create unique index direcciones_una_predeterminada on public.direcciones (empresa_id) where predeterminada;

create table public.datos_fiscales (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  rfc text not null check (rfc ~ '^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$'),
  razon_social text not null check (char_length(razon_social) between 1 and 200),
  regimen_fiscal text not null check (regimen_fiscal ~ '^[0-9]{3}$'),
  cp_fiscal text not null check (cp_fiscal ~ '^[0-9]{5}$'),
  uso_cfdi text not null check (uso_cfdi ~ '^[A-Z]{1,2}[0-9]{2}$'),
  correo text not null check (char_length(correo) between 5 and 254),
  predeterminado boolean not null default false,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index datos_fiscales_empresa_idx on public.datos_fiscales (empresa_id);
create unique index datos_fiscales_un_predeterminado on public.datos_fiscales (empresa_id) where predeterminado;

-- Campos que cada empresa usa en sus gafetes. Los de sistema corresponden a
-- columnas de `empleados`; los demás se guardan en `empleados.datos`.
create table public.campos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  clave text not null check (clave ~ '^[a-z][a-z0-9_]{0,39}$'),
  etiqueta text not null check (char_length(etiqueta) between 1 and 60),
  tipo text not null default 'texto' check (tipo in ('texto', 'fecha', 'foto', 'qr')),
  en_gafete boolean not null default true,
  cara text not null default 'frente' check (cara in ('frente', 'vuelta')),
  orden integer not null default 0,
  obligatorio boolean not null default false,
  de_sistema boolean not null default false,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (empresa_id, clave)
);

create table public.empleados (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  numero_empleado text check (char_length(numero_empleado) between 1 and 40),
  nombre text not null check (char_length(nombre) between 1 and 160),
  puesto text check (char_length(puesto) <= 120),
  departamento text check (char_length(departamento) <= 120),
  tipo_contrato text check (char_length(tipo_contrato) <= 60),
  estatus text not null default 'activo' check (estatus in ('activo', 'baja', 'pendiente')),
  fecha_baja date,
  -- Valores de los campos propios de la empresa, por clave.
  datos jsonb not null default '{}'::jsonb,
  -- Ruta en el almacenamiento privado `fotos`.
  foto_path text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  -- Varias personas pueden no tener número; con número, no se repite en la empresa.
  unique (empresa_id, numero_empleado)
);
create index empleados_empresa_estatus_idx on public.empleados (empresa_id, estatus);

-- Cada gafete emitido a una persona: responde cuántos se le han hecho y por qué.
-- Guarda una copia de los datos tal como se imprimieron. Se llena desde el
-- servidor cuando haya pedidos (fase 4); por ahora solo se lee.
create table public.gafetes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  empleado_id uuid not null references public.empleados (id) on delete cascade,
  tipo text not null check (tipo in ('impreso', 'digital')),
  motivo text not null check (motivo in ('alta', 'reposicion', 'cambio_datos')),
  estado text not null default 'en_pedido'
    check (estado in ('en_pedido', 'en_produccion', 'enviado', 'activo', 'desactivado', 'cancelado')),
  datos jsonb not null default '{}'::jsonb,
  diseno_id uuid,
  pedido_id uuid,
  emitido_en timestamptz not null default now()
);
create index gafetes_empleado_idx on public.gafetes (empleado_id);
create index gafetes_empresa_idx on public.gafetes (empresa_id);

-- ---------------------------------------------------------------------------
-- Funciones
-- ---------------------------------------------------------------------------

create function privado.es_miembro(p_empresa uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.miembros m
    where m.empresa_id = p_empresa and m.usuario_id = (select auth.uid())
  );
$$;

create function privado.es_admin(p_empresa uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.miembros m
    where m.empresa_id = p_empresa
      and m.usuario_id = (select auth.uid())
      and m.rol in ('propietario', 'administrador')
  );
$$;

-- Convierte la primera carpeta de una ruta de archivo en uuid, o null si no lo es.
create function privado.uuid_o_nulo(p_texto text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return p_texto::uuid;
exception when others then
  return null;
end;
$$;

create function privado.tocar_actualizado()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

revoke all on schema privado from public;
grant usage on schema privado to authenticated;
revoke all on all functions in schema privado from public;
grant execute on function privado.es_miembro(uuid), privado.es_admin(uuid), privado.uuid_o_nulo(text) to authenticated;

do $$
declare t text;
begin
  foreach t in array array['perfiles', 'empresas', 'direcciones', 'datos_fiscales', 'campos', 'empleados'] loop
    execute format(
      'create trigger tocar_actualizado before update on public.%I for each row execute function privado.tocar_actualizado()', t);
  end loop;
end $$;

-- Crea la empresa, hace propietaria a quien la crea y le deja los campos base.
create function public.crear_empresa(p_nombre text, p_giro text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := (select auth.uid());
  v_empresa uuid;
begin
  if v_usuario is null then
    raise exception 'Inicia sesión para crear una empresa.' using errcode = '28000';
  end if;
  if (select count(*) from public.miembros where usuario_id = v_usuario and rol = 'propietario') >= 20 then
    raise exception 'Llegaste al máximo de empresas por cuenta.' using errcode = 'P0001';
  end if;

  insert into public.empresas (nombre, giro, creado_por)
  values (btrim(p_nombre), nullif(btrim(coalesce(p_giro, '')), ''), v_usuario)
  returning id into v_empresa;

  insert into public.miembros (empresa_id, usuario_id, rol)
  values (v_empresa, v_usuario, 'propietario');

  insert into public.campos (empresa_id, clave, etiqueta, tipo, en_gafete, cara, orden, obligatorio, de_sistema)
  values
    (v_empresa, 'nombre', 'Nombre', 'texto', true, 'frente', 1, true, true),
    (v_empresa, 'puesto', 'Puesto', 'texto', true, 'frente', 2, false, true),
    (v_empresa, 'numero_empleado', 'Número de empleado', 'texto', true, 'frente', 3, false, true),
    (v_empresa, 'foto', 'Fotografía', 'foto', true, 'frente', 4, false, true),
    (v_empresa, 'departamento', 'Departamento', 'texto', false, 'frente', 5, false, true),
    (v_empresa, 'tipo_contrato', 'Tipo de contrato', 'texto', false, 'frente', 6, false, true),
    (v_empresa, 'qr', 'Código QR', 'qr', false, 'vuelta', 7, false, true);

  return v_empresa;
end;
$$;

revoke all on function public.crear_empresa(text, text) from public, anon;
grant execute on function public.crear_empresa(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Permisos y reglas de acceso (RLS)
-- ---------------------------------------------------------------------------

revoke all on public.perfiles, public.empresas, public.miembros, public.direcciones,
  public.datos_fiscales, public.campos, public.empleados, public.gafetes from anon, public;

grant select, insert, update on public.perfiles to authenticated;
grant select, update on public.empresas to authenticated;
grant select on public.miembros to authenticated;
grant select, insert, update, delete on public.direcciones, public.datos_fiscales,
  public.campos, public.empleados to authenticated;
grant select on public.gafetes to authenticated;

alter table public.perfiles enable row level security;
alter table public.empresas enable row level security;
alter table public.miembros enable row level security;
alter table public.direcciones enable row level security;
alter table public.datos_fiscales enable row level security;
alter table public.campos enable row level security;
alter table public.empleados enable row level security;
alter table public.gafetes enable row level security;

create policy "perfil propio: ver" on public.perfiles
  for select to authenticated using (id = (select auth.uid()));
create policy "perfil propio: crear" on public.perfiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy "perfil propio: cambiar" on public.perfiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "empresas: ver las mías" on public.empresas
  for select to authenticated using (privado.es_miembro(id));
create policy "empresas: cambiar si administro" on public.empresas
  for update to authenticated using (privado.es_admin(id)) with check (privado.es_admin(id));

create policy "miembros: ver los de mis empresas" on public.miembros
  for select to authenticated using (privado.es_miembro(empresa_id));

do $$
declare t text;
begin
  foreach t in array array['direcciones', 'datos_fiscales', 'campos', 'empleados'] loop
    execute format(
      'create policy "miembros: ver" on public.%I for select to authenticated using (privado.es_miembro(empresa_id))', t);
    execute format(
      'create policy "miembros: crear" on public.%I for insert to authenticated with check (privado.es_miembro(empresa_id))', t);
    execute format(
      'create policy "miembros: cambiar" on public.%I for update to authenticated using (privado.es_miembro(empresa_id)) with check (privado.es_miembro(empresa_id))', t);
  end loop;
  foreach t in array array['direcciones', 'datos_fiscales', 'empleados'] loop
    execute format(
      'create policy "miembros: borrar" on public.%I for delete to authenticated using (privado.es_miembro(empresa_id))', t);
  end loop;
end $$;

-- Los campos de sistema no se borran: solo se quitan del gafete.
create policy "miembros: borrar campos propios" on public.campos
  for delete to authenticated using (privado.es_miembro(empresa_id) and not de_sistema);

create policy "gafetes: ver los de mis empresas" on public.gafetes
  for select to authenticated using (privado.es_miembro(empresa_id));

-- ---------------------------------------------------------------------------
-- Fotos del equipo: almacenamiento privado, una carpeta por empresa.
-- Ruta: <empresa_id>/<empleado_id>.jpg
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "fotos: ver las de mis empresas" on storage.objects
  for select to authenticated
  using (bucket_id = 'fotos' and privado.es_miembro(privado.uuid_o_nulo((storage.foldername(name))[1])));
create policy "fotos: subir a mis empresas" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fotos' and privado.es_miembro(privado.uuid_o_nulo((storage.foldername(name))[1])));
create policy "fotos: reemplazar en mis empresas" on storage.objects
  for update to authenticated
  using (bucket_id = 'fotos' and privado.es_miembro(privado.uuid_o_nulo((storage.foldername(name))[1])))
  with check (bucket_id = 'fotos' and privado.es_miembro(privado.uuid_o_nulo((storage.foldername(name))[1])));
create policy "fotos: borrar de mis empresas" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fotos' and privado.es_miembro(privado.uuid_o_nulo((storage.foldername(name))[1])));
