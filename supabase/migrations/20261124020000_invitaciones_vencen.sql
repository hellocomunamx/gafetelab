-- Las invitaciones vencen a las 24 horas de enviadas.
--
-- «Reenviar invitación» renueva el plazo (invitar_usuario ya pone creado_en =
-- now() al volver a invitar). Una invitación vencida ya no aparece en «Tus
-- invitaciones» ni se puede aceptar; la pantalla de la liga explica que venció.

-- Invitaciones vigentes para el correo de la sesión (cualquier forma de entrar:
-- liga, código, contraseña, Google o Microsoft; el correo se compara en minúsculas).
create or replace function public.mis_invitaciones()
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
    and i.creado_en > now() - interval '24 hours'
  order by i.creado_en;
$$;

create or replace function public.aceptar_invitacion(p_invitacion uuid)
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
  if v_inv.creado_en <= now() - interval '24 hours' then
    raise exception 'Esa invitación venció. Pide que te la reenvíen.' using errcode = 'P0001';
  end if;

  insert into public.miembros (empresa_id, usuario_id, rol)
  values (v_inv.empresa_id, v_usuario, v_inv.rol)
  on conflict (empresa_id, usuario_id) do nothing;
  delete from public.invitaciones where id = v_inv.id;
  return v_inv.empresa_id;
end;
$$;

-- La pantalla de la liga: la invitación pedida (aunque haya vencido, para
-- explicarlo) y las demás vigentes que la misma persona hizo a ese correo.
drop function public.ver_invitacion(uuid);
create function public.ver_invitacion(p_invitacion uuid)
returns table (id uuid, empresa_id uuid, empresa text, rol text, correo text, invita text, tiene_cuenta boolean, vencida boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with base as (
    select i.correo, i.invitado_por from public.invitaciones i where i.id = p_invitacion
  )
  select
    i.id,
    i.empresa_id,
    e.nombre,
    i.rol,
    i.correo,
    coalesce(nullif(btrim(p.nombre), ''), u.email::text),
    exists (select 1 from auth.users c where lower(c.email) = i.correo),
    i.creado_en <= now() - interval '24 hours'
  from base b
  join public.invitaciones i
    on i.correo = b.correo
   and (i.id = p_invitacion or (i.invitado_por = b.invitado_por and i.creado_en > now() - interval '24 hours'))
  join public.empresas e on e.id = i.empresa_id
  left join auth.users u on u.id = i.invitado_por
  left join public.perfiles p on p.id = i.invitado_por
  order by (i.id = p_invitacion) desc, i.creado_en, e.nombre;
$$;

revoke all on function public.ver_invitacion(uuid) from public;
grant execute on function public.ver_invitacion(uuid) to anon, authenticated;
