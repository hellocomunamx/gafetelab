-- Administración de la plataforma: quienes operan LaGafetería, no las empresas
-- clientes. Sirve para imprimir los gafetes de cualquier empresa.
-- Nadie se da de alta desde la app: se agrega a mano con SQL (ver el README).

create table privado.administradores (
  usuario_id uuid primary key references auth.users (id) on delete cascade,
  creado_en timestamptz not null default now()
);
-- Sin permisos ni reglas para nadie: solo se lee desde las funciones de abajo.
revoke all on privado.administradores from public, anon, authenticated;
alter table privado.administradores enable row level security;

-- ¿La sesión es de alguien que administra la plataforma?
create function public.es_admin_plataforma()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from privado.administradores a where a.usuario_id = (select auth.uid())
  );
$$;

-- Todas las empresas con lo que tienen para imprimir. Vacío si no es administradora.
create function public.admin_empresas()
returns table (id uuid, nombre text, creado_en timestamptz, activos bigint, disenos bigint, listos bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.nombre, e.creado_en,
    (select count(*) from public.empleados p where p.empresa_id = e.id and p.estatus = 'activo'),
    (select count(*) from public.disenos d where d.empresa_id = e.id),
    (select count(*) from public.gafetes_listos g where g.empresa_id = e.id)
  from public.empresas e
  where public.es_admin_plataforma()
  order by e.creado_en desc;
$$;

revoke all on function public.es_admin_plataforma(), public.admin_empresas() from public, anon;
grant execute on function public.es_admin_plataforma(), public.admin_empresas() to authenticated;
