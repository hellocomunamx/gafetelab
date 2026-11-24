-- Visitas al sitio: un conteo propio y anónimo de páginas vistas.
-- No usa cookies ni guarda la dirección IP, el navegador completo ni nada que
-- identifique a una persona: solo la página, de dónde llegó, el tipo de
-- dispositivo y el país y estado que informa Cloudflare.
--
-- Cada renglón lo escribe el servidor (ruta /api/visita) con la llave secreta.
-- Solo lo lee el panel de administración, ya sumado.

create table public.visitas (
  id bigint generated always as identity primary key,
  en timestamptz not null default now(),
  -- Página vista, sin parámetros. Las ligas personales se guardan recortadas ("/v").
  ruta text not null check (char_length(ruta) between 1 and 200),
  -- true en la primera página de una visita (llegó de fuera o entró directo).
  entrada boolean not null default false,
  -- De dónde llegó: el sitio que la mandó ("google.com") o la campaña (utm_source). Null: directo.
  origen text check (char_length(origen) <= 100),
  dispositivo text not null check (dispositivo in ('celular', 'tableta', 'computadora')),
  pais text check (char_length(pais) <= 2),
  region text check (char_length(region) <= 60)
);
create index visitas_en_idx on public.visitas (en);

revoke all on public.visitas from anon, authenticated, public;
grant select, insert on public.visitas to service_role;
grant usage, select on sequence public.visitas_id_seq to service_role;
alter table public.visitas enable row level security;

-- Las visitas de un periodo, ya sumadas. Los días se cortan con la hora de Sonora.
create function public.resumen_visitas(p_desde timestamptz, p_hasta timestamptz)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with v as (
    select *, (en at time zone 'America/Hermosillo')::date as dia
    from public.visitas
    where en >= p_desde and en < p_hasta
  )
  select jsonb_build_object(
    'vistas', (select count(*) from v where ruta <> '/v'),
    'visitas', (select count(*) from v where entrada and ruta <> '/v'),
    'escaneos', (select count(*) from v where ruta = '/v'),
    'dias', coalesce((
      select jsonb_agg(jsonb_build_object('dia', dia, 'vistas', vistas, 'visitas', visitas) order by dia)
      from (
        select dia, count(*) as vistas, count(*) filter (where entrada) as visitas
        from v where ruta <> '/v' group by dia
      ) d
    ), '[]'::jsonb),
    'paginas', coalesce((
      select jsonb_agg(jsonb_build_object('ruta', ruta, 'vistas', vistas, 'entradas', entradas) order by vistas desc, ruta)
      from (
        select ruta, count(*) as vistas, count(*) filter (where entrada) as entradas
        from v where ruta <> '/v' group by ruta order by count(*) desc, ruta limit 20
      ) p
    ), '[]'::jsonb),
    'origenes', coalesce((
      select jsonb_agg(jsonb_build_object('origen', origen, 'visitas', visitas) order by visitas desc, origen)
      from (
        select coalesce(origen, '') as origen, count(*) as visitas
        from v where entrada and ruta <> '/v' group by 1 order by count(*) desc, 1 limit 20
      ) o
    ), '[]'::jsonb),
    'dispositivos', coalesce((
      select jsonb_agg(jsonb_build_object('dispositivo', dispositivo, 'visitas', visitas) order by visitas desc)
      from (
        select dispositivo, count(*) as visitas from v where entrada and ruta <> '/v' group by dispositivo
      ) x
    ), '[]'::jsonb),
    'lugares', coalesce((
      select jsonb_agg(jsonb_build_object('pais', pais, 'region', region, 'visitas', visitas) order by visitas desc, pais, region)
      from (
        select coalesce(pais, '') as pais, coalesce(region, '') as region, count(*) as visitas
        from v where entrada and ruta <> '/v' group by 1, 2 order by count(*) desc, 1, 2 limit 15
      ) l
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.resumen_visitas(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.resumen_visitas(timestamptz, timestamptz) to service_role;
