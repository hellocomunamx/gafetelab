-- Cotizaciones: cada cotización que alguien descarga en PDF o pide por correo.
-- Sirve para dar seguimiento a quien la pidió por correo y para saber qué
-- búsquedas y anuncios traen cotizaciones de verdad.
--
-- Cada renglón lo escribe el servidor con la llave secreta, que vuelve a
-- calcular los importes: del navegador solo llegan la cantidad y las opciones.
-- Solo lo lee el panel de administración.

create table public.cotizaciones (
  id bigint generated always as identity primary key,
  en timestamptz not null default now(),
  folio text not null unique check (folio ~ '^LG-[0-9]{6}-[A-Z0-9]{4}$'),
  -- Cómo se la llevó: descargó el PDF o la pidió por correo.
  canal text not null check (canal in ('pdf', 'correo')),
  -- Solo cuando la pidió por correo.
  correo text check (char_length(correo) <= 254),
  empresa text check (char_length(empresa) <= 80),
  piezas integer not null check (piezas > 0),
  modalidad text not null check (modalidad in ('impreso', 'digital', 'ambos')),
  dos_caras boolean not null default false,
  material text check (char_length(material) <= 30),
  paquete integer,
  subtotal numeric(12, 2) not null,
  total numeric(12, 2) not null,
  -- De dónde llegó la visita (parámetros utm de la liga del anuncio). Null: no se sabe.
  origen text check (char_length(origen) <= 100),
  medio text check (char_length(medio) <= 100),
  campana text check (char_length(campana) <= 100),
  -- Palabra clave del anuncio que trajo la visita (utm_term).
  termino text check (char_length(termino) <= 100),
  contenido text check (char_length(contenido) <= 100),
  -- Página por la que entró al sitio.
  entrada text check (char_length(entrada) <= 200),
  dispositivo text check (dispositivo in ('celular', 'tableta', 'computadora'))
);
create index cotizaciones_en_idx on public.cotizaciones (en);

revoke all on public.cotizaciones from anon, authenticated, public;
grant select, insert on public.cotizaciones to service_role;
grant usage, select on sequence public.cotizaciones_id_seq to service_role;
alter table public.cotizaciones enable row level security;
