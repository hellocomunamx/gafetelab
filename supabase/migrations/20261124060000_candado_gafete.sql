-- Candado del gafete digital: huella, cara o PIN del celular (passkeys, WebAuthn).
--
-- La liga de cada persona (/mi-gafete/<liga>) es fija. Si la persona lo activa,
-- su liga solo se abre después de confirmar con la huella, la cara o el PIN de
-- su propio celular. Aquí se guarda solo la llave pública de cada dispositivo:
-- la huella o la cara nunca salen del celular ni llegan a LaGafetería.
--
-- Todo lo escribe el servidor con la llave secreta. Quienes administran la
-- empresa ven cuántos dispositivos tiene cada persona y pueden quitar el
-- candado (por ejemplo, si cambió de celular) desde su ficha.

create table public.llaves_gafete (
  id uuid primary key default gen_random_uuid(),
  empleado_id uuid not null references public.empleados (id) on delete cascade,
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  -- Identificador de la llave y su llave pública (COSE), en base64url.
  credencial_id text not null unique check (length(credencial_id) between 16 and 1400),
  llave_publica text not null check (length(llave_publica) between 16 and 2000),
  -- Contador de firmas que lleva el dispositivo (contra llaves clonadas).
  contador bigint not null default 0 check (contador >= 0),
  transportes text[] not null default '{}',
  -- «iPhone», «Android», «Computadora»: solo para reconocerla en la lista.
  dispositivo text check (length(dispositivo) <= 40),
  creada_en timestamptz not null default now(),
  usada_en timestamptz
);
create index llaves_gafete_persona_idx on public.llaves_gafete (empleado_id);

revoke all on public.llaves_gafete from anon, authenticated, public;
-- Quienes administran la empresa ven qué dispositivos hay, nunca la llave.
grant select (id, empleado_id, empresa_id, dispositivo, creada_en, usada_en) on public.llaves_gafete to authenticated;
grant select, insert, update, delete on public.llaves_gafete to service_role;
alter table public.llaves_gafete enable row level security;
create policy "miembros: ver" on public.llaves_gafete
  for select to authenticated using (privado.es_miembro(empresa_id));
