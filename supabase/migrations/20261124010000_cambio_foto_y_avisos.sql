-- Cambio de foto desde el gafete digital y avisos por correo a quienes
-- administran cada empresa.
--
-- 1. Quien ya tiene su gafete digital puede pedir cambiar su foto (como una
--    foto de perfil). La foto nueva no se usa hasta que la empresa la aprueba
--    viendo la anterior y la nueva lado a lado.
--    Si la persona también tiene gafete impreso, se le avisa que cambiar la
--    foto implica uno impreso nuevo (reposición), con el costo y los
--    requisitos que fijó su empresa. Si solo tiene impreso, no hay opción en
--    la plataforma: lo ve con su empresa.
-- 2. Cada administrador elige, por tipo de aviso, si le llega al momento, en
--    un resumen semanal o nunca.

-- ---------------------------------------------------------------------------
-- Solicitudes de cambio de foto
-- ---------------------------------------------------------------------------

-- La escribe el servidor (página pública de la liga) con la llave secreta.
create table public.solicitudes_foto (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references public.empleados (id) on delete cascade,
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  -- Foto nueva, en el almacenamiento privado `fotos` (<empresa>/cambios/<persona>.jpg).
  foto_path text,
  -- Al aprobarse, copia de la foto que tenía antes (<empresa>/historial/<solicitud>.jpg),
  -- para seguir viendo el antes y el después.
  foto_anterior_path text,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobada', 'rechazada', 'cancelada')),
  -- Por qué se rechazó; la persona lo ve en su gafete digital.
  motivo text check (char_length(motivo) <= 300),
  -- La persona tenía gafete impreso y aceptó que necesitará una reposición.
  con_impreso boolean not null default false,
  -- Al aprobarse, se sumó su reposición al pedido abierto.
  reposicion_apartada boolean not null default false,
  creado_en timestamptz not null default now(),
  resuelto_en timestamptz,
  resuelto_por uuid references auth.users (id) on delete set null
);
-- Una sola solicitud abierta por persona: si vuelve a pedir, se reemplaza la foto.
create unique index solicitudes_foto_una_abierta on public.solicitudes_foto (empleado_id) where estado = 'pendiente';
create index solicitudes_foto_empresa_estado_idx on public.solicitudes_foto (empresa_id, estado, creado_en);

revoke all on public.solicitudes_foto from anon, authenticated, public;
grant select, update on public.solicitudes_foto to authenticated;
grant select, insert, update, delete on public.solicitudes_foto to service_role;
alter table public.solicitudes_foto enable row level security;

create policy "miembros: ver" on public.solicitudes_foto
  for select to authenticated using (privado.es_miembro(empresa_id));
create policy "miembros: resolver" on public.solicitudes_foto
  for update to authenticated using (privado.es_miembro(empresa_id)) with check (privado.es_miembro(empresa_id));

-- ---------------------------------------------------------------------------
-- Política de reposición de cada empresa: lo que le cobra a su gente por un
-- gafete impreso nuevo y qué le pide. Ese cobro es entre la empresa y su
-- persona: LaGafetería no lo cobra ni lo recibe.
-- { costo: número (MXN, 0 = sin costo), requisitos: [claves], nota: texto }
-- ---------------------------------------------------------------------------

alter table public.empresas
  add column reposicion jsonb not null default '{"costo": 0, "requisitos": ["entregar_anterior", "carta_extravio"], "nota": ""}'::jsonb
    check (jsonb_typeof(reposicion) = 'object' and pg_column_size(reposicion) <= 2000);

-- ---------------------------------------------------------------------------
-- Avisos por correo: qué le llega a cada quien
-- ---------------------------------------------------------------------------

-- Sin fila = el modo por omisión del tipo (ver privado.modo_aviso).
create table public.preferencias_aviso (
  usuario_id uuid not null references auth.users (id) on delete cascade,
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  tipo text not null check (tipo in ('cambio_foto', 'datos_liga')),
  modo text not null check (modo in ('inmediato', 'semanal', 'ninguno')),
  actualizado_en timestamptz not null default now(),
  primary key (usuario_id, empresa_id, tipo)
);

revoke all on public.preferencias_aviso from anon, authenticated, public;
grant select, insert, update, delete on public.preferencias_aviso to authenticated;
grant select on public.preferencias_aviso to service_role;
alter table public.preferencias_aviso enable row level security;

-- Cada quien ve y cambia solo las suyas, y solo en empresas que administra.
create policy "propias: ver" on public.preferencias_aviso
  for select to authenticated using (usuario_id = (select auth.uid()));
create policy "propias: guardar" on public.preferencias_aviso
  for insert to authenticated with check (usuario_id = (select auth.uid()) and privado.es_admin(empresa_id));
create policy "propias: cambiar" on public.preferencias_aviso
  for update to authenticated using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()) and privado.es_admin(empresa_id));
create policy "propias: borrar" on public.preferencias_aviso
  for delete to authenticated using (usuario_id = (select auth.uid()));

-- Resúmenes semanales ya mandados: si el cron se dispara dos veces, no se repite.
create table public.resumenes_enviados (
  usuario_id uuid not null references auth.users (id) on delete cascade,
  semana date not null,
  enviado_en timestamptz not null default now(),
  primary key (usuario_id, semana)
);
revoke all on public.resumenes_enviados from anon, authenticated, public;
grant select, insert, delete on public.resumenes_enviados to service_role;
alter table public.resumenes_enviados enable row level security;

-- ---------------------------------------------------------------------------
-- A quién avisar
-- ---------------------------------------------------------------------------

-- Dueños y administradores de cada empresa con el modo que eligieron para cada
-- tipo de aviso (o el de omisión: resumen semanal). Solo la llama el servidor.
create function public.destinatarios_aviso(p_empresa uuid default null)
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
  cross join (values ('cambio_foto'), ('datos_liga')) as t (tipo)
  left join public.perfiles p on p.id = m.usuario_id
  left join public.preferencias_aviso pa
    on pa.usuario_id = m.usuario_id and pa.empresa_id = m.empresa_id and pa.tipo = t.tipo
  where m.rol in ('propietario', 'administrador')
    and u.email is not null
    and (p_empresa is null or m.empresa_id = p_empresa);
$$;

revoke all on function public.destinatarios_aviso(uuid) from public, anon, authenticated;
grant execute on function public.destinatarios_aviso(uuid) to service_role;
