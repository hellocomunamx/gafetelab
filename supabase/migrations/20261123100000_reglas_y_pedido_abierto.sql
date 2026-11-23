-- Funciones que estaban marcadas "Muy pronto": reposiciones, predeterminados del
-- negocio, pedido abierto con aviso y diseños por reglas.
--
-- Los predeterminados viven en `empresas.predeterminados` (ya existía):
-- { material, fuente, sin_factura, aviso: { cantidad, altas, avisado_en } }.
-- La dirección y los datos fiscales predeterminados siguen usando sus banderas.

-- ---------------------------------------------------------------------------
-- Diseños por reglas: qué diseño le toca a cada persona según un dato suyo.
-- `campo` es una columna de `empleados` (puesto, departamento, tipo_contrato)
-- o la clave de un campo propio de la empresa (por ejemplo, sucursal).
-- ---------------------------------------------------------------------------

create table public.reglas_diseno (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  campo text not null check (campo ~ '^[a-z][a-z0-9_]{0,39}$'),
  valor text not null check (char_length(valor) between 1 and 120),
  diseno_id uuid not null references public.disenos (id) on delete cascade,
  orden integer not null default 0,
  creado_en timestamptz not null default now(),
  unique (empresa_id, campo, valor)
);
create index reglas_diseno_empresa_idx on public.reglas_diseno (empresa_id);
create index reglas_diseno_diseno_idx on public.reglas_diseno (diseno_id);

revoke all on public.reglas_diseno from anon, public;
grant select, insert, update, delete on public.reglas_diseno to authenticated;
alter table public.reglas_diseno enable row level security;

create policy "miembros: ver" on public.reglas_diseno
  for select to authenticated using (privado.es_miembro(empresa_id));
create policy "miembros: crear" on public.reglas_diseno
  for insert to authenticated with check (privado.es_miembro(empresa_id));
create policy "miembros: cambiar" on public.reglas_diseno
  for update to authenticated using (privado.es_miembro(empresa_id)) with check (privado.es_miembro(empresa_id));
create policy "miembros: borrar" on public.reglas_diseno
  for delete to authenticated using (privado.es_miembro(empresa_id));

-- ---------------------------------------------------------------------------
-- Pedido abierto: reposiciones (y altas) que la empresa va apartando para
-- pedirlas juntas. Una persona aparece una sola vez.
-- ---------------------------------------------------------------------------

create table public.pedido_abierto (
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  empleado_id uuid not null references public.empleados (id) on delete cascade,
  razon text not null check (razon in ('alta', 'perdido', 'danado', 'cambio_datos')),
  agregado_por uuid references auth.users (id) on delete set null,
  creado_en timestamptz not null default now(),
  primary key (empresa_id, empleado_id)
);

revoke all on public.pedido_abierto from anon, public;
grant select, insert, update, delete on public.pedido_abierto to authenticated;
alter table public.pedido_abierto enable row level security;

create policy "miembros: ver" on public.pedido_abierto
  for select to authenticated using (privado.es_miembro(empresa_id));
create policy "miembros: crear" on public.pedido_abierto
  for insert to authenticated with check (
    privado.es_miembro(empresa_id)
    and exists (select 1 from public.empleados e where e.id = empleado_id and e.empresa_id = pedido_abierto.empresa_id)
  );
create policy "miembros: cambiar" on public.pedido_abierto
  for update to authenticated using (privado.es_miembro(empresa_id)) with check (privado.es_miembro(empresa_id));
create policy "miembros: borrar" on public.pedido_abierto
  for delete to authenticated using (privado.es_miembro(empresa_id));

-- ---------------------------------------------------------------------------
-- Gafetes: por qué se repuso (se perdió, se dañó o cambiaron sus datos).
-- ---------------------------------------------------------------------------

alter table public.gafetes
  add column razon text check (razon in ('alta', 'perdido', 'danado', 'cambio_datos'));
