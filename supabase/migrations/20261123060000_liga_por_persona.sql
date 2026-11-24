-- Liga por persona: cada persona del equipo tiene una liga propia para llenar
-- sus datos y subir su foto sin crear cuenta. Lo que manda no cambia nada
-- hasta que la empresa lo aprueba.

-- ---------------------------------------------------------------------------
-- Correo y liga de cada persona
-- ---------------------------------------------------------------------------

-- 24 caracteres al azar (144 bits): no se puede adivinar. Es distinta del
-- código del QR, que es público y solo sirve para verificar.
create function privado.liga_nueva()
returns text
language sql
volatile
set search_path = ''
as $$
  select translate(encode(extensions.gen_random_bytes(18), 'base64'), '+/', '-_');
$$;

alter table public.empleados
  -- Correo de la persona, para mandarle su liga. No se imprime en el gafete.
  add column correo text check (correo is null or (char_length(correo) <= 200 and correo ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$')),
  add column liga text,
  -- Última vez que la empresa le mandó o copió su liga.
  add column liga_enviada_en timestamptz;

update public.empleados set liga = privado.liga_nueva();
alter table public.empleados
  alter column liga set not null,
  alter column liga set default privado.liga_nueva(),
  add constraint empleados_liga_unica unique (liga);

-- La liga la pone siempre la base de datos. Nadie la elige: si alguien la
-- cambia, se genera una nueva (así se renueva una liga que se compartió de más).
create function privado.fijar_liga()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.liga is distinct from old.liga then
    new.liga := privado.liga_nueva();
  end if;
  return new;
end;
$$;

create trigger fijar_liga before insert or update on public.empleados
  for each row execute function privado.fijar_liga();

revoke all on function privado.liga_nueva(), privado.fijar_liga() from public;
-- El valor por omisión de la columna se evalúa con el rol de quien inserta.
grant execute on function privado.liga_nueva() to authenticated;

-- ---------------------------------------------------------------------------
-- Qué se le pide a cada persona
-- ---------------------------------------------------------------------------

alter table public.empresas
  -- Claves de los campos que la persona puede llenar desde su liga.
  add column liga_campos text[] not null default '{nombre}' check (cardinality(liga_campos) <= 30),
  -- Si se le pide su fotografía.
  add column liga_foto boolean not null default true;

-- ---------------------------------------------------------------------------
-- Lo que manda cada persona, en espera de que la empresa lo apruebe
-- ---------------------------------------------------------------------------

-- Una fila por persona: si vuelve a mandar, se reemplaza. La escribe el
-- servidor (página pública de la liga) con la llave secreta.
create table public.propuestas (
  empleado_id uuid primary key references public.empleados (id) on delete cascade,
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  -- Valores propuestos, por clave de campo.
  datos jsonb not null default '{}'::jsonb,
  -- Foto propuesta, en el almacenamiento privado `fotos` (<empresa>/pendientes/<persona>.jpg).
  foto_path text,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobada', 'rechazada')),
  -- Por qué se rechazó; la persona lo ve en su liga.
  motivo text check (char_length(motivo) <= 300),
  enviado_en timestamptz not null default now(),
  resuelto_en timestamptz
);
create index propuestas_empresa_estado_idx on public.propuestas (empresa_id, estado);

revoke all on public.propuestas from anon, authenticated, public;
grant select, update, delete on public.propuestas to authenticated;
grant select, insert, update, delete on public.propuestas to service_role;
alter table public.propuestas enable row level security;

create policy "miembros: ver" on public.propuestas
  for select to authenticated using (privado.es_miembro(empresa_id));
create policy "miembros: resolver" on public.propuestas
  for update to authenticated using (privado.es_miembro(empresa_id)) with check (privado.es_miembro(empresa_id));
create policy "miembros: borrar" on public.propuestas
  for delete to authenticated using (privado.es_miembro(empresa_id));
