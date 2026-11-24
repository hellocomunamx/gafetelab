-- Facturas hechas a mano.
-- Mientras LaGafetería factura en el portal del SAT (sin Facturama), cada pedido
-- que pide factura tiene un renglón aquí: con qué datos se factura, si ya se
-- emitió, su folio fiscal y el PDF y el XML para que la empresa los descargue.
--
-- El renglón nace solo: cuando un pedido trae datos de facturación (al hacerlo
-- o al pedir la factura después), un disparador lo crea o lo actualiza. Una
-- factura ya emitida no se toca.
--
-- Nadie escribe facturas desde el navegador: las mueve el servidor con la llave
-- secreta. Las empresas solo leen las suyas.

create table public.facturas (
  pedido_id uuid primary key references public.pedidos (id) on delete cascade,
  empresa_id uuid not null references public.empresas (id) on delete restrict,
  estado text not null default 'por_emitir' check (estado in (
    'por_emitir',  -- la empresa la pidió; falta hacerla en el SAT
    'emitida',     -- ya timbrada en el SAT
    'cancelada'    -- cancelada en el SAT (por ejemplo, tras una devolución)
  )),
  -- Copia de los datos con que se factura: { rfc, razon_social, regimen_fiscal, cp_fiscal, uso_cfdi, correo }.
  datos jsonb not null,
  solicitada_por uuid references auth.users (id) on delete set null,
  solicitada_en timestamptz not null default now(),

  -- Lo que se captura al emitirla.
  folio_fiscal text check (folio_fiscal ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  pdf_ruta text check (char_length(pdf_ruta) <= 200),
  xml_ruta text check (char_length(xml_ruta) <= 200),
  emitida_por uuid references auth.users (id) on delete set null,
  emitida_en timestamptz,
  enviada_en timestamptz,
  cancelada_en timestamptz,

  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index facturas_estado_idx on public.facturas (estado, solicitada_en);
create index facturas_empresa_idx on public.facturas (empresa_id);

create trigger tocar_actualizado before update on public.facturas
  for each row execute function privado.tocar_actualizado();

-- Crea o pone al día la factura de un pedido cuando cambian sus datos de facturación.
create function privado.factura_de_pedido()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.facturacion is null then
    -- Si la empresa ya no quiere factura y no se ha emitido, se quita.
    delete from public.facturas where pedido_id = new.id and estado = 'por_emitir';
    return new;
  end if;
  insert into public.facturas (pedido_id, empresa_id, datos, solicitada_por)
  values (new.id, new.empresa_id, new.facturacion, new.creado_por)
  on conflict (pedido_id) do update
    set datos = excluded.datos, solicitada_en = now()
    where public.facturas.estado = 'por_emitir';
  return new;
end;
$$;
revoke all on function privado.factura_de_pedido() from public, anon, authenticated;

create trigger factura_al_crear after insert on public.pedidos
  for each row when (new.facturacion is not null)
  execute function privado.factura_de_pedido();
create trigger factura_al_cambiar after update of facturacion on public.pedidos
  for each row when (old.facturacion is distinct from new.facturacion)
  execute function privado.factura_de_pedido();

-- Los pedidos que ya pidieron factura.
insert into public.facturas (pedido_id, empresa_id, datos, solicitada_por, solicitada_en)
select id, empresa_id, facturacion, creado_por, creado_en
from public.pedidos
where facturacion is not null
on conflict (pedido_id) do nothing;

-- ---------------------------------------------------------------------------
-- Permisos y reglas de acceso (RLS)
-- ---------------------------------------------------------------------------

revoke all on public.facturas from anon, authenticated, public;
grant all on public.facturas to service_role;
grant select (
  pedido_id, empresa_id, estado, datos, solicitada_en, folio_fiscal, pdf_ruta, xml_ruta, emitida_en, cancelada_en
) on public.facturas to authenticated;
alter table public.facturas enable row level security;

create policy "facturas: ver las de mis empresas" on public.facturas
  for select to authenticated using (privado.es_miembro(empresa_id));

-- ---------------------------------------------------------------------------
-- Archivos: PDF y XML de cada factura, privados. Ruta: <empresa>/<pedido>.pdf
-- Los sube el servidor; la empresa los descarga con una liga firmada.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('facturas', 'facturas', false, 2097152, array['application/pdf', 'application/xml', 'text/xml'])
on conflict (id) do nothing;

create policy "facturas: ver las de mis empresas" on storage.objects
  for select to authenticated
  using (bucket_id = 'facturas' and privado.es_miembro(privado.uuid_o_nulo((storage.foldername(name))[1])));
