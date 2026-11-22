-- Aceptación de los términos y condiciones y del aviso de privacidad.
-- Cada renglón es una constancia: quién aceptó, qué versiones y cuándo.
-- Solo se agregan; nadie las cambia ni las borra desde la app.

create table public.aceptaciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  terminos_version text not null check (terminos_version ~ '^[0-9]{1,3}\.[0-9]{1,3}$'),
  aviso_version text not null check (aviso_version ~ '^[0-9]{1,3}\.[0-9]{1,3}$'),
  aceptado_en timestamptz not null default now(),
  unique (usuario_id, terminos_version, aviso_version)
);

revoke all on public.aceptaciones from anon, public, authenticated;
-- Solo se pueden escribir las versiones: el usuario y la fecha los pone la base de datos.
grant select on public.aceptaciones to authenticated;
grant insert (terminos_version, aviso_version) on public.aceptaciones to authenticated;
alter table public.aceptaciones enable row level security;

create policy "aceptaciones: ver las mías" on public.aceptaciones
  for select to authenticated using (usuario_id = (select auth.uid()));
create policy "aceptaciones: registrar la mía" on public.aceptaciones
  for insert to authenticated with check (usuario_id = (select auth.uid()));
