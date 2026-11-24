-- Fase 3 de la plataforma: diseños de gafetes y credenciales.
-- Cada diseño guarda sus elementos en milímetros, medidos desde la esquina
-- superior izquierda del corte (tarjeta CR80 de 85.6 × 54 mm).

create table public.disenos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 80),
  orientacion text not null default 'horizontal' check (orientacion in ('horizontal', 'vertical')),
  -- { "fondo": "#ffffff", "imagen": "<ruta>", "elementos": [...] }
  frente jsonb not null default '{"fondo": "#ffffff", "elementos": []}'::jsonb
    check (octet_length(frente::text) <= 200000),
  -- null: el gafete se imprime por una sola cara.
  vuelta jsonb check (vuelta is null or octet_length(vuelta::text) <= 200000),
  predeterminado boolean not null default false,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index disenos_empresa_idx on public.disenos (empresa_id);
create unique index disenos_un_predeterminado on public.disenos (empresa_id) where predeterminado;

create trigger tocar_actualizado before update on public.disenos
  for each row execute function privado.tocar_actualizado();

-- El gafete emitido recuerda con qué diseño se hizo.
alter table public.gafetes
  add constraint gafetes_diseno_id_fkey foreign key (diseno_id) references public.disenos (id) on delete set null;
create index gafetes_diseno_idx on public.gafetes (diseno_id);

revoke all on public.disenos from anon, public;
grant select, insert, update, delete on public.disenos to authenticated;
alter table public.disenos enable row level security;

create policy "miembros: ver" on public.disenos
  for select to authenticated using (privado.es_miembro(empresa_id));
create policy "miembros: crear" on public.disenos
  for insert to authenticated with check (privado.es_miembro(empresa_id));
create policy "miembros: cambiar" on public.disenos
  for update to authenticated using (privado.es_miembro(empresa_id)) with check (privado.es_miembro(empresa_id));
create policy "miembros: borrar" on public.disenos
  for delete to authenticated using (privado.es_miembro(empresa_id));

-- ---------------------------------------------------------------------------
-- Fondos, logos e imágenes de los diseños: almacenamiento privado.
-- Ruta: <empresa_id>/<archivo>
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('disenos', 'disenos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "disenos: ver los de mis empresas" on storage.objects
  for select to authenticated
  using (bucket_id = 'disenos' and privado.es_miembro(privado.uuid_o_nulo((storage.foldername(name))[1])));
create policy "disenos: subir a mis empresas" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'disenos' and privado.es_miembro(privado.uuid_o_nulo((storage.foldername(name))[1])));
create policy "disenos: reemplazar en mis empresas" on storage.objects
  for update to authenticated
  using (bucket_id = 'disenos' and privado.es_miembro(privado.uuid_o_nulo((storage.foldername(name))[1])))
  with check (bucket_id = 'disenos' and privado.es_miembro(privado.uuid_o_nulo((storage.foldername(name))[1])));
create policy "disenos: borrar de mis empresas" on storage.objects
  for delete to authenticated
  using (bucket_id = 'disenos' and privado.es_miembro(privado.uuid_o_nulo((storage.foldername(name))[1])));
