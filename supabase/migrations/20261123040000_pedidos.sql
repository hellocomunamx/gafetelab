-- Pedidos y pago con Stripe.
-- Un pedido guarda una copia de todo lo que se va a imprimir y a cobrar (diseño,
-- datos de cada persona, dirección, datos de facturación e importes), para que
-- nada cambie después de que la empresa lo aprobó y lo pagó.
--
-- Nadie escribe pedidos desde el navegador: los crea y los mueve el servidor,
-- con la llave secreta, después de validar permisos y de calcular el precio.
-- Las empresas solo los leen.

create sequence public.pedidos_folio_seq start with 1001;

create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  folio text not null unique default ('LG-' || nextval('public.pedidos_folio_seq')::text),
  empresa_id uuid not null references public.empresas (id) on delete restrict,
  creado_por uuid references auth.users (id) on delete set null,
  estado text not null default 'por_pagar' check (estado in (
    'por_pagar',        -- creado, todavía sin pago
    'pago_en_proceso',  -- ficha de OXXO o instrucciones de transferencia generadas; el dinero no ha llegado
    'autorizado',       -- tarjeta autorizada y sin cobrar: corren los minutos de gracia para cancelar sin costo
    'pagado',           -- pago confirmado por Stripe; listo para revisarse y producirse
    'en_produccion',
    'enviado',
    'entregado',
    'cancelado',
    'reembolsado'
  )),

  -- Qué se pidió.
  modalidad text not null default 'impreso' check (modalidad in ('impreso', 'digital', 'ambos')),
  material text check (material in ('estandar', 'rudo', 'adhesivo', 'proximidad')),
  dos_caras boolean not null default false,
  piezas integer not null check (piezas between 1 and 5000),
  fuente text not null check (fuente in ('diseno', 'listos')),
  diseno_id uuid references public.disenos (id) on delete set null,
  -- Copia del diseño: { nombre, orientacion, frente, vuelta }. Null con gafetes listos.
  diseno jsonb check (diseno is null or octet_length(diseno::text) <= 450000),

  -- Importes en pesos mexicanos. `subtotal` y `envio` van antes de IVA.
  por_pieza numeric(10, 2) not null check (por_pieza >= 0),
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  envio numeric(10, 2) not null default 0 check (envio >= 0),
  iva numeric(12, 2) not null check (iva >= 0),
  total numeric(12, 2) not null check (total > 0),
  constraint pedidos_total_cuadra check (total = subtotal + envio + iva),

  -- Copias de la dirección de envío y de los datos de facturación (null: sin factura).
  direccion jsonb,
  facturacion jsonb,

  -- Evidencia de que la empresa aprobó la vista previa y los términos:
  -- { vista_previa, terminos_version, aviso_version, correo, ip, navegador, en }.
  aprobacion jsonb not null,

  -- Controles antes de producir.
  primer_pedido boolean not null default false,
  alertas text[] not null default '{}',
  revisado_en timestamptz,
  revisado_por uuid references auth.users (id) on delete set null,
  notas text check (char_length(notas) <= 2000),

  -- Cobro.
  solo_transferencia boolean not null default false,
  metodo text check (metodo in ('tarjeta', 'oxxo', 'spei')),
  intento integer not null default 0,
  stripe_sesion text unique,
  stripe_url text,
  stripe_pago text unique,
  -- Liga de Stripe a la ficha de OXXO o a los datos de la transferencia.
  ficha_url text,
  -- Con tarjeta: hasta cuándo se puede cancelar sin costo. Pasada esa hora se hace el cargo.
  gracia_hasta timestamptz,
  disputa text check (disputa in ('abierta', 'ganada', 'perdida')),

  -- Envío.
  paqueteria text check (char_length(paqueteria) <= 60),
  guia text check (char_length(guia) <= 80),

  pagado_en timestamptz,
  produccion_en timestamptz,
  enviado_en timestamptz,
  entregado_en timestamptz,
  cancelado_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index pedidos_empresa_idx on public.pedidos (empresa_id, creado_en desc);
create index pedidos_estado_idx on public.pedidos (estado);

create trigger tocar_actualizado before update on public.pedidos
  for each row execute function privado.tocar_actualizado();

-- Cada gafete del pedido es un renglón de `gafetes`, con la copia de los datos
-- de la persona tal como se van a imprimir.
alter table public.gafetes
  add constraint gafetes_pedido_id_fkey foreign key (pedido_id) references public.pedidos (id) on delete cascade;
create index gafetes_pedido_idx on public.gafetes (pedido_id);

-- Bitácora del pedido: cambios de estado, avisos de Stripe y lo que haga la
-- administradora. Sirve de evidencia ante una disputa. Solo la lee el servidor.
create table public.pedido_eventos (
  id bigint generated always as identity primary key,
  pedido_id uuid not null references public.pedidos (id) on delete cascade,
  tipo text not null check (char_length(tipo) between 1 and 60),
  detalle jsonb not null default '{}'::jsonb,
  por uuid references auth.users (id) on delete set null,
  creado_en timestamptz not null default now()
);
create index pedido_eventos_pedido_idx on public.pedido_eventos (pedido_id, creado_en);

-- Avisos de Stripe ya recibidos, para no procesar dos veces el mismo.
create table public.stripe_eventos (
  id text primary key check (char_length(id) between 1 and 255),
  tipo text not null,
  recibido_en timestamptz not null default now()
);

-- Cliente de Stripe de cada empresa. Aparte de `empresas`, que sí puede
-- cambiar quien la administra: este dato solo lo toca el servidor.
create table public.stripe_clientes (
  empresa_id uuid primary key references public.empresas (id) on delete cascade,
  cliente text not null unique check (cliente ~ '^cus_[A-Za-z0-9]+$'),
  creado_en timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Permisos y reglas de acceso (RLS)
-- ---------------------------------------------------------------------------

revoke all on public.pedidos, public.pedido_eventos, public.stripe_eventos, public.stripe_clientes
  from anon, authenticated, public;
revoke all on sequence public.pedidos_folio_seq from anon, authenticated, public;
grant all on public.pedidos, public.pedido_eventos, public.stripe_eventos, public.stripe_clientes to service_role;
grant usage, select on sequence public.pedidos_folio_seq to service_role;
grant usage, select on sequence public.pedido_eventos_id_seq to service_role;

alter table public.pedidos enable row level security;
alter table public.pedido_eventos enable row level security;
alter table public.stripe_eventos enable row level security;
alter table public.stripe_clientes enable row level security;

-- La empresa ve sus pedidos, pero no las notas internas ni los controles de revisión.
grant select (
  id, folio, empresa_id, creado_por, estado, modalidad, material, dos_caras, piezas, fuente, diseno_id,
  por_pieza, subtotal, envio, iva, total, direccion, facturacion, solo_transferencia, metodo, ficha_url, gracia_hasta,
  paqueteria, guia, pagado_en, produccion_en, enviado_en, entregado_en, cancelado_en, creado_en
) on public.pedidos to authenticated;

create policy "pedidos: ver los de mis empresas" on public.pedidos
  for select to authenticated using (privado.es_miembro(empresa_id));

-- Los gafetes de un pedido también los escribe solo el servidor. Hasta ahora
-- la app podía intentar escribir en `gafetes` y la detenían las reglas de
-- acceso; se le quita también el permiso, para que sean dos candados.
revoke all on public.gafetes from authenticated;
grant select on public.gafetes to authenticated;
