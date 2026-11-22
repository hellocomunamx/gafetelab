-- "Ya tengo mis gafetes listos": la empresa sube el gafete terminado de cada
-- persona (una imagen por cara) y se imprime tal cual, sin pasar por el editor.

create table public.gafetes_listos (
  empleado_id uuid primary key references public.empleados (id) on delete cascade,
  -- La pone la base de datos a partir de la persona (ver el trigger).
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  -- Ruta en el almacenamiento privado `gafetes` y medida de la imagen en pixeles.
  frente_path text,
  frente_ancho integer,
  frente_alto integer,
  vuelta_path text,
  vuelta_ancho integer,
  vuelta_alto integer,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint gafetes_listos_alguna_cara check (frente_path is not null or vuelta_path is not null),
  constraint gafetes_listos_frente check (
    (frente_path is null and frente_ancho is null and frente_alto is null)
    or (frente_path like empresa_id::text || '/%' and frente_ancho between 1 and 20000 and frente_alto between 1 and 20000)
  ),
  constraint gafetes_listos_vuelta check (
    (vuelta_path is null and vuelta_ancho is null and vuelta_alto is null)
    or (vuelta_path like empresa_id::text || '/%' and vuelta_ancho between 1 and 20000 and vuelta_alto between 1 and 20000)
  )
);
create index gafetes_listos_empresa_idx on public.gafetes_listos (empresa_id);

-- La empresa del gafete siempre es la de la persona: nadie la elige.
create function privado.empresa_del_empleado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select e.empresa_id into new.empresa_id from public.empleados e where e.id = new.empleado_id;
  return new;
end;
$$;
revoke all on function privado.empresa_del_empleado() from public;

create trigger empresa_del_empleado before insert or update on public.gafetes_listos
  for each row execute function privado.empresa_del_empleado();
create trigger tocar_actualizado before update on public.gafetes_listos
  for each row execute function privado.tocar_actualizado();

revoke all on public.gafetes_listos from anon, public;
grant select, insert, update, delete on public.gafetes_listos to authenticated;
alter table public.gafetes_listos enable row level security;

create policy "miembros: ver" on public.gafetes_listos
  for select to authenticated using (privado.es_miembro(empresa_id));
create policy "miembros: crear" on public.gafetes_listos
  for insert to authenticated with check (privado.es_miembro(empresa_id));
create policy "miembros: cambiar" on public.gafetes_listos
  for update to authenticated using (privado.es_miembro(empresa_id)) with check (privado.es_miembro(empresa_id));
create policy "miembros: borrar" on public.gafetes_listos
  for delete to authenticated using (privado.es_miembro(empresa_id));

-- ---------------------------------------------------------------------------
-- Imágenes de los gafetes terminados: almacenamiento privado.
-- Ruta: <empresa_id>/<empleado_id>-<frente|vuelta>.<jpg|png>
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gafetes', 'gafetes', false, 10485760, array['image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "gafetes: ver los de mis empresas" on storage.objects
  for select to authenticated
  using (bucket_id = 'gafetes' and privado.es_miembro(privado.uuid_o_nulo((storage.foldername(name))[1])));
create policy "gafetes: subir a mis empresas" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'gafetes' and privado.es_miembro(privado.uuid_o_nulo((storage.foldername(name))[1])));
create policy "gafetes: reemplazar en mis empresas" on storage.objects
  for update to authenticated
  using (bucket_id = 'gafetes' and privado.es_miembro(privado.uuid_o_nulo((storage.foldername(name))[1])))
  with check (bucket_id = 'gafetes' and privado.es_miembro(privado.uuid_o_nulo((storage.foldername(name))[1])));
create policy "gafetes: borrar de mis empresas" on storage.objects
  for delete to authenticated
  using (bucket_id = 'gafetes' and privado.es_miembro(privado.uuid_o_nulo((storage.foldername(name))[1])));
