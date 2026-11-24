-- Pantalla propia de la invitación (/invitacion/<id>).
--
-- La liga del correo de invitación abre una pantalla que muestra a qué empresas
-- invitaron a la persona, con qué rol y si su correo ya tiene cuenta, para
-- ofrecerle "Crear cuenta" o "Ya tengo cuenta". Esa pantalla se ve sin sesión,
-- así que la información sale de esta función y no de la tabla.
--
-- Devuelve la invitación pedida y las demás pendientes para el mismo correo
-- que hizo la misma persona (al invitar a varias empresas a la vez llega un
-- solo correo y se aceptan todas juntas). El id de la invitación es aleatorio
-- y solo lo conoce quien recibió el correo.

create function public.ver_invitacion(p_invitacion uuid)
returns table (id uuid, empresa_id uuid, empresa text, rol text, correo text, invita text, tiene_cuenta boolean)
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
    exists (select 1 from auth.users c where lower(c.email) = i.correo)
  from base b
  join public.invitaciones i
    on i.correo = b.correo
   and (i.id = p_invitacion or i.invitado_por = b.invitado_por)
  join public.empresas e on e.id = i.empresa_id
  left join auth.users u on u.id = i.invitado_por
  left join public.perfiles p on p.id = i.invitado_por
  order by (i.id = p_invitacion) desc, i.creado_en, e.nombre;
$$;

revoke all on function public.ver_invitacion(uuid) from public;
grant execute on function public.ver_invitacion(uuid) to anon, authenticated;
