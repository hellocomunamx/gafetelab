-- "Qué muestra tu QR": cada empresa decide a dónde lleva el código QR de sus
-- gafetes, y cada persona tiene un código propio para su página de verificación.
--   verificacion: página pública con "Vigente" o "Expirado" y los datos que la
--                 empresa elija mostrar (opción por omisión).
--   liga:         una liga de la empresa, que puede llevar {numero} o {codigo}.
--   dato:         el valor de un campo, por ejemplo el número de empleado.

-- ---------------------------------------------------------------------------
-- Ajuste por empresa
-- ---------------------------------------------------------------------------

alter table public.empresas
  add column qr_modo text not null default 'verificacion'
    check (qr_modo in ('verificacion', 'liga', 'dato')),
  -- Qué se ve en la página de verificación.
  add column qr_mostrar text[] not null default array['empresa', 'nombre', 'puesto']
    check (qr_mostrar <@ array['empresa', 'nombre', 'puesto', 'numero_empleado', 'departamento', 'foto']),
  -- Clave del campo de fecha que marca hasta cuándo vale el gafete; null = sin vencimiento.
  add column qr_vigencia text check (qr_vigencia ~ '^[a-z][a-z0-9_]{0,39}$'),
  add column qr_liga text check (qr_liga ~ '^https://[^[:space:]]+$' and char_length(qr_liga) <= 300),
  add column qr_dato text not null default 'numero_empleado' check (qr_dato ~ '^[a-z][a-z0-9_]{0,39}$'),
  add constraint empresas_qr_liga_completa check (qr_modo <> 'liga' or qr_liga is not null);

-- ---------------------------------------------------------------------------
-- Código público de cada persona
-- ---------------------------------------------------------------------------

-- 12 caracteres al azar (72 bits), seguros para ir en una liga.
create function privado.codigo_nuevo()
returns text
language sql
volatile
set search_path = ''
as $$
  select translate(encode(extensions.gen_random_bytes(9), 'base64'), '+/', '-_');
$$;

alter table public.empleados add column codigo text;
update public.empleados set codigo = privado.codigo_nuevo();
alter table public.empleados
  alter column codigo set not null,
  alter column codigo set default privado.codigo_nuevo(),
  add constraint empleados_codigo_unico unique (codigo);

-- El código lo pone siempre la base de datos y no cambia: nadie lo elige ni lo edita.
create function privado.fijar_codigo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.codigo := privado.codigo_nuevo();
  else
    new.codigo := old.codigo;
  end if;
  return new;
end;
$$;

create trigger fijar_codigo before insert or update on public.empleados
  for each row execute function privado.fijar_codigo();

-- Convierte un texto AAAA-MM-DD en fecha, o null si no lo es.
create function privado.fecha_o_nula(p_texto text)
returns date
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_texto !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    return null;
  end if;
  return p_texto::date;
exception when others then
  return null;
end;
$$;

revoke all on function privado.codigo_nuevo(), privado.fijar_codigo(), privado.fecha_o_nula(text) from public;
-- El valor por omisión de la columna se calcula con el rol de quien inserta.
grant execute on function privado.codigo_nuevo() to authenticated;

-- ---------------------------------------------------------------------------
-- Verificación pública
-- ---------------------------------------------------------------------------

-- Lo que ve quien escanea el QR. Solo devuelve lo que la empresa eligió mostrar.
-- Si la persona está de baja o pendiente, no devuelve ningún dato personal.
-- Devuelve null si el código no existe o la empresa no usa la página de verificación.
create function public.verificar_gafete(p_codigo text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_p public.empleados;
  v_e public.empresas;
  v_hasta date;
  v_estado text;
  v_r jsonb;
begin
  if p_codigo is null or p_codigo !~ '^[A-Za-z0-9_-]{12}$' then
    return null;
  end if;
  select * into v_p from public.empleados where codigo = p_codigo;
  if not found then
    return null;
  end if;
  select * into v_e from public.empresas where id = v_p.empresa_id;
  if v_e.qr_modo <> 'verificacion' then
    return null;
  end if;

  if v_e.qr_vigencia is not null then
    v_hasta := privado.fecha_o_nula(v_p.datos ->> v_e.qr_vigencia);
  end if;
  v_estado := case
    when v_p.estatus = 'baja' then 'baja'
    when v_p.estatus <> 'activo' then 'pendiente'
    when v_hasta is not null and v_hasta < (now() at time zone 'America/Mexico_City')::date then 'expirado'
    else 'vigente'
  end;

  v_r := jsonb_build_object('estado', v_estado);
  if 'empresa' = any (v_e.qr_mostrar) then
    v_r := v_r || jsonb_build_object('empresa', v_e.nombre);
  end if;
  if v_estado in ('vigente', 'expirado') then
    if v_hasta is not null then
      v_r := v_r || jsonb_build_object('vigente_hasta', v_hasta);
    end if;
    if 'nombre' = any (v_e.qr_mostrar) then
      v_r := v_r || jsonb_build_object('nombre', v_p.nombre);
    end if;
    if 'puesto' = any (v_e.qr_mostrar) and v_p.puesto is not null then
      v_r := v_r || jsonb_build_object('puesto', v_p.puesto);
    end if;
    if 'numero_empleado' = any (v_e.qr_mostrar) and v_p.numero_empleado is not null then
      v_r := v_r || jsonb_build_object('numero_empleado', v_p.numero_empleado);
    end if;
    if 'departamento' = any (v_e.qr_mostrar) and v_p.departamento is not null then
      v_r := v_r || jsonb_build_object('departamento', v_p.departamento);
    end if;
    if 'foto' = any (v_e.qr_mostrar) and v_p.foto_path is not null then
      v_r := v_r || jsonb_build_object('con_foto', true);
    end if;
  end if;
  return v_r;
end;
$$;

revoke all on function public.verificar_gafete(text) from public;
grant execute on function public.verificar_gafete(text) to anon, authenticated;
