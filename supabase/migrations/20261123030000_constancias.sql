-- Constancia de Situación Fiscal de cada empresa. Se pide al abrir la cuenta y
-- debe estar aprobada antes del primer pedido: así se comprueba que los gafetes
-- son de la propia empresa. La revisa a mano quien opera LaGafetería.

create table public.constancias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  -- Ruta en el almacenamiento privado `constancias`: <empresa_id>/<archivo>.
  ruta text not null check (char_length(ruta) <= 200),
  -- La fecha que trae impresa la constancia ("Lugar y fecha de emisión").
  fecha_emision date not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobada', 'rechazada')),
  -- Por qué se rechazó, en palabras para la empresa.
  motivo text check (char_length(motivo) <= 300),
  subida_por uuid references auth.users (id) on delete set null,
  revisada_en timestamptz,
  creado_en timestamptz not null default now(),
  constraint constancias_ruta_de_la_empresa check (ruta like empresa_id::text || '/%')
);
create index constancias_empresa_idx on public.constancias (empresa_id, creado_en desc);
create index constancias_pendientes_idx on public.constancias (creado_en) where estado = 'pendiente';

-- Al subirla: siempre entra como pendiente, a nombre de quien la sube, y con
-- no más de tres meses de antigüedad.
create function privado.constancia_nueva()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_hoy date := (now() at time zone 'America/Hermosillo')::date;
begin
  new.estado := 'pendiente';
  new.motivo := null;
  new.revisada_en := null;
  new.creado_en := now();
  new.subida_por := (select auth.uid());
  if new.fecha_emision > v_hoy + 1 then
    raise exception 'La fecha de emisión no puede ser futura.' using errcode = 'P0001';
  end if;
  if new.fecha_emision < (v_hoy - interval '3 months')::date then
    raise exception 'La constancia debe tener máximo 3 meses de antigüedad.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function privado.constancia_nueva() from public;

create trigger constancia_nueva before insert on public.constancias
  for each row execute function privado.constancia_nueva();

-- Las empresas la ven y la suben; no la cambian ni la borran. La aprobación o
-- el rechazo se hacen desde el panel de administración, con la llave secreta.
revoke all on public.constancias from anon, authenticated, public;
grant select, insert on public.constancias to authenticated;
alter table public.constancias enable row level security;

create policy "miembros: ver" on public.constancias
  for select to authenticated using (privado.es_miembro(empresa_id));
create policy "administradores: subir" on public.constancias
  for insert to authenticated with check (privado.es_admin(empresa_id));

-- ---------------------------------------------------------------------------
-- Archivos: almacenamiento privado, PDF o imagen de hasta 5 MB.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('constancias', 'constancias', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "constancias: ver las de mis empresas" on storage.objects
  for select to authenticated
  using (bucket_id = 'constancias' and privado.es_miembro(privado.uuid_o_nulo((storage.foldername(name))[1])));
create policy "constancias: subir a mis empresas" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'constancias' and privado.es_admin(privado.uuid_o_nulo((storage.foldername(name))[1])));
