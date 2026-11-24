-- Portal de empleados «Mi gafete».
--
-- Cada empresa tiene una dirección propia (lagafeteria.com/e/<handle>). Su gente
-- entra ahí de dos formas:
--   1. Con el correo que la empresa tiene registrado: le llega un código y una
--      liga de un solo uso.
--   2. Sin correo: ID de acceso (por omisión, su número de empleado) y un NIP de
--      6 dígitos. La empresa le da un NIP inicial y la persona lo cambia al
--      entrar la primera vez.
-- Ya dentro, la persona hace solicitudes (corregir datos, reponer su gafete
-- por pérdida, robo o daño; el cambio de foto usa `solicitudes_foto`) y ve en
-- qué van. La empresa las revisa todas en una sola bandeja.
--
-- Todo lo del acceso (NIP, códigos y sesiones) solo lo toca el servidor con la
-- llave secreta. Las sesiones del portal son independientes de las cuentas de
-- empresa (Supabase Auth): un empleado nunca tiene usuario en auth.users.

-- ---------------------------------------------------------------------------
-- Dirección propia de cada empresa
-- ---------------------------------------------------------------------------

alter table public.empresas
  add column handle text
    check (handle ~ '^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$' and handle !~ '--'),
  add column portal_activo boolean not null default false;
create unique index empresas_handle_unico on public.empresas (handle);

-- ---------------------------------------------------------------------------
-- Acceso con ID y NIP (para quien no tiene correo)
-- ---------------------------------------------------------------------------

create table public.accesos_empleado (
  empleado_id uuid primary key references public.empleados (id) on delete cascade,
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  -- Lo que la persona escribe como «ID de acceso». Por omisión, su número de empleado.
  id_acceso text not null check (id_acceso ~ '^[A-Za-z0-9._-]{1,40}$'),
  -- PBKDF2-SHA256 con sal propia: pbkdf2$<iteraciones>$<sal>$<hash>. Nunca el NIP.
  nip_hash text,
  -- El NIP lo puso la empresa: se tiene que cambiar al entrar.
  nip_temporal boolean not null default true,
  -- Intentos fallidos seguidos y hasta cuándo está bloqueado.
  intentos integer not null default 0 check (intentos >= 0),
  bloqueado_hasta timestamptz,
  nip_cambiado_en timestamptz,
  ultimo_ingreso timestamptz,
  actualizado_en timestamptz not null default now()
);
create unique index accesos_empleado_id_unico on public.accesos_empleado (empresa_id, lower(id_acceso));

revoke all on public.accesos_empleado from anon, authenticated, public;
-- Quienes administran la empresa ven el estado del acceso, nunca el hash.
grant select (empleado_id, empresa_id, id_acceso, nip_temporal, intentos, bloqueado_hasta, nip_cambiado_en, ultimo_ingreso, actualizado_en)
  on public.accesos_empleado to authenticated;
grant select, insert, update, delete on public.accesos_empleado to service_role;
alter table public.accesos_empleado enable row level security;
create policy "miembros: ver" on public.accesos_empleado
  for select to authenticated using (privado.es_miembro(empresa_id));

-- ---------------------------------------------------------------------------
-- Códigos y ligas de un solo uso que llegan al correo
-- ---------------------------------------------------------------------------

create table public.codigos_empleado (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references public.empleados (id) on delete cascade,
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  -- SHA-256 del código de 6 dígitos (con sal) y de la liga; nunca el valor.
  codigo_hash text not null,
  enlace_hash text not null unique,
  intentos integer not null default 0,
  expira_en timestamptz not null,
  usado_en timestamptz,
  creado_en timestamptz not null default now()
);
create index codigos_empleado_persona_idx on public.codigos_empleado (empleado_id, creado_en desc);

revoke all on public.codigos_empleado from anon, authenticated, public;
grant select, insert, update, delete on public.codigos_empleado to service_role;
alter table public.codigos_empleado enable row level security;

-- ---------------------------------------------------------------------------
-- Sesiones del portal (cookie propia, separada de las cuentas de empresa)
-- ---------------------------------------------------------------------------

create table public.sesiones_empleado (
  id uuid primary key default gen_random_uuid(),
  -- SHA-256 del valor de la cookie.
  token_hash text not null unique,
  empleado_id uuid not null references public.empleados (id) on delete cascade,
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  metodo text not null check (metodo in ('codigo', 'enlace', 'nip')),
  creado_en timestamptz not null default now(),
  expira_en timestamptz not null,
  visto_en timestamptz not null default now()
);
create index sesiones_empleado_persona_idx on public.sesiones_empleado (empleado_id);

revoke all on public.sesiones_empleado from anon, authenticated, public;
grant select, insert, update, delete on public.sesiones_empleado to service_role;
alter table public.sesiones_empleado enable row level security;

-- ---------------------------------------------------------------------------
-- Solicitudes del portal: corregir datos y reponer el gafete
-- ---------------------------------------------------------------------------

create table public.solicitudes_empleado (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  empleado_id uuid not null references public.empleados (id) on delete cascade,
  tipo text not null check (tipo in ('datos', 'reposicion')),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobada', 'rechazada', 'cancelada')),
  -- Corrección de datos: { clave: valor nuevo }.
  datos jsonb not null default '{}'::jsonb check (jsonb_typeof(datos) = 'object' and pg_column_size(datos) <= 8000),
  -- Reposición: por qué.
  causa text check (causa in ('perdida', 'robo', 'dano')),
  -- Lo que la persona escribió.
  nota text check (char_length(nota) <= 500),
  -- Requisitos de la política de reposición que la persona confirmó, y el costo que vio.
  requisitos text[] not null default '{}',
  costo integer check (costo between 0 and 5000),
  -- Carta o denuncia que subió (almacenamiento privado `fotos`, <empresa>/solicitudes/<id>.<ext>).
  archivo_path text,
  -- Por qué no se aprobó; la persona lo ve en su portal.
  motivo text check (char_length(motivo) <= 300),
  -- Al aprobarse, si se sumó su gafete impreso al pedido abierto.
  reposicion_apartada boolean not null default false,
  creado_en timestamptz not null default now(),
  resuelto_en timestamptz,
  resuelto_por uuid references auth.users (id) on delete set null
);
-- Una solicitud abierta por tipo y persona.
create unique index solicitudes_empleado_una_abierta on public.solicitudes_empleado (empleado_id, tipo) where estado = 'pendiente';
create index solicitudes_empleado_empresa_estado_idx on public.solicitudes_empleado (empresa_id, estado, creado_en);

revoke all on public.solicitudes_empleado from anon, authenticated, public;
grant select, update on public.solicitudes_empleado to authenticated;
grant select, insert, update, delete on public.solicitudes_empleado to service_role;
alter table public.solicitudes_empleado enable row level security;
create policy "miembros: ver" on public.solicitudes_empleado
  for select to authenticated using (privado.es_miembro(empresa_id));
create policy "miembros: resolver" on public.solicitudes_empleado
  for update to authenticated using (privado.es_miembro(empresa_id)) with check (privado.es_miembro(empresa_id));

-- ---------------------------------------------------------------------------
-- Seguimiento de la impresión: aprobada → en impresión → en camino → entregada.
-- Lo avanza el servidor cuando el pedido que trae su gafete cambia de estado.
-- ---------------------------------------------------------------------------

alter table public.solicitudes_empleado
  add column impresion text check (impresion in ('en_impresion', 'en_camino', 'entregada')),
  add column pedido_id uuid references public.pedidos (id) on delete set null;
alter table public.solicitudes_foto
  add column impresion text check (impresion in ('en_impresion', 'en_camino', 'entregada')),
  add column pedido_id uuid references public.pedidos (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Avisos a administradores: nuevo tipo «solicitudes»
-- ---------------------------------------------------------------------------

alter table public.preferencias_aviso drop constraint preferencias_aviso_tipo_check;
alter table public.preferencias_aviso
  add constraint preferencias_aviso_tipo_check check (tipo in ('cambio_foto', 'datos_liga', 'solicitudes'));

create or replace function public.destinatarios_aviso(p_empresa uuid default null)
returns table (usuario_id uuid, correo text, nombre text, empresa_id uuid, empresa text, tipo text, modo text)
language sql
stable
security definer
set search_path = ''
as $$
  select m.usuario_id, u.email::text, p.nombre, e.id, e.nombre, t.tipo, coalesce(pa.modo, 'semanal')
  from public.miembros m
  join auth.users u on u.id = m.usuario_id
  join public.empresas e on e.id = m.empresa_id
  cross join (values ('cambio_foto'), ('datos_liga'), ('solicitudes')) as t (tipo)
  left join public.perfiles p on p.id = m.usuario_id
  left join public.preferencias_aviso pa
    on pa.usuario_id = m.usuario_id and pa.empresa_id = m.empresa_id and pa.tipo = t.tipo
  where m.rol in ('propietario', 'administrador')
    and u.email is not null
    and (p_empresa is null or m.empresa_id = p_empresa);
$$;

revoke all on function public.destinatarios_aviso(uuid) from public, anon, authenticated;
grant execute on function public.destinatarios_aviso(uuid) to service_role;
