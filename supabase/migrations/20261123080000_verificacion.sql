-- Verificación de la empresa: además de la Constancia de Situación Fiscal, la
-- empresa puede elegir con qué comprobar que los gafetes son suyos:
--   constancia  Constancia de Situación Fiscal (como hasta ahora).
--   ine         INE de quien responde + una prueba del negocio (liga a sus
--               redes, Google Maps o sitio, o una foto del local o del menú).
--   correo      Un correo con el dominio de la empresa, confirmado con código.
-- En las tres se acepta la carta de responsabilidad y la revisa a mano quien
-- opera LaGafetería. Se sigue usando la tabla `constancias`.

alter table public.constancias
  add column metodo text not null default 'constancia' check (metodo in ('constancia', 'ine', 'correo')),
  -- Reverso de la INE (opcional: el frente va en `ruta`).
  add column ruta_reverso text check (char_length(ruta_reverso) <= 200),
  -- Foto del local, la fachada, el menú o el uniforme.
  add column prueba_ruta text check (char_length(prueba_ruta) <= 200),
  -- Liga a Facebook, Instagram, Google Maps o el sitio del negocio.
  add column prueba_liga text check (char_length(prueba_liga) <= 500 and prueba_liga ~* '^https?://'),
  -- El nombre del negocio como aparece en los gafetes.
  add column negocio text check (char_length(negocio) <= 120),
  add column correo text check (char_length(correo) <= 200),
  -- Lo pone el servidor cuando la persona escribe el código que le llegó.
  add column correo_confirmado_en timestamptz,
  -- Carta de responsabilidad: cuándo se aceptó y qué versión.
  add column carta_aceptada_en timestamptz,
  add column carta_version text check (char_length(carta_version) <= 20);

alter table public.constancias alter column ruta drop not null;
alter table public.constancias alter column fecha_emision drop not null;

alter table public.constancias
  add constraint constancias_reverso_de_la_empresa check (ruta_reverso like empresa_id::text || '/%'),
  add constraint constancias_prueba_de_la_empresa check (prueba_ruta like empresa_id::text || '/%'),
  add constraint constancias_datos_del_metodo check (
    case metodo
      when 'constancia' then ruta is not null and fecha_emision is not null
      when 'ine' then ruta is not null and negocio is not null and (prueba_ruta is not null or prueba_liga is not null)
      when 'correo' then correo is not null and negocio is not null
    end
  );

-- Al subirla: siempre entra como pendiente, con la carta aceptada en ese
-- momento. La fecha de emisión solo cuenta para la constancia. El correo solo
-- lo marca como confirmado el servidor (con la llave secreta), nunca la empresa.
create or replace function privado.constancia_nueva()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_hoy date := (now() at time zone 'America/Hermosillo')::date;
  v_usuario uuid := (select auth.uid());
begin
  new.estado := 'pendiente';
  new.motivo := null;
  new.revisada_en := null;
  new.creado_en := now();
  if v_usuario is not null then
    new.subida_por := v_usuario;
    new.correo_confirmado_en := null;
  end if;
  if new.carta_version is null then
    raise exception 'Acepta la carta de responsabilidad.' using errcode = 'P0001';
  end if;
  new.carta_aceptada_en := now();
  if new.metodo = 'constancia' then
    if new.fecha_emision > v_hoy + 1 then
      raise exception 'La fecha de emisión no puede ser futura.' using errcode = 'P0001';
    end if;
    if new.fecha_emision < (v_hoy - interval '3 months')::date then
      raise exception 'La constancia debe tener máximo 3 meses de antigüedad.' using errcode = 'P0001';
    end if;
  else
    new.fecha_emision := null;
  end if;
  return new;
end;
$$;
revoke all on function privado.constancia_nueva() from public;
