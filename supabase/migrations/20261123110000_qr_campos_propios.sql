-- "Qué ve quien escanea" ya no es una lista fija: la empresa elige entre sus
-- propios campos (los de sistema y los que agregó), con el nombre que les puso.
-- qr_mostrar guarda claves de campo, más 'empresa' y 'foto'.

alter table public.empresas drop constraint if exists empresas_qr_mostrar_check;
alter table public.empresas add constraint empresas_qr_mostrar_check check (
  cardinality(qr_mostrar) <= 60
  and array_to_string(qr_mostrar, ',') ~ '^([a-z][a-z0-9_]{0,39}(,[a-z][a-z0-9_]{0,39})*)?$'
);

-- Lo que ve quien escanea el QR. Solo devuelve lo que la empresa eligió mostrar.
-- Si la persona está de baja o pendiente, no devuelve ningún dato personal.
-- Devuelve null si el código no existe o la empresa no usa la página de verificación.
-- `datos` lleva, en el orden de la página Campos, cada campo elegido con su
-- nombre actual y su valor. Se conservan puesto, numero_empleado y
-- departamento sueltos para la página anterior mientras se publica la nueva.
create or replace function public.verificar_gafete(p_codigo text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_p public.empleados;
  v_e public.empresas;
  v_c record;
  v_hasta date;
  v_estado text;
  v_valor text;
  v_datos jsonb := '[]'::jsonb;
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
    if 'foto' = any (v_e.qr_mostrar) and v_p.foto_path is not null then
      v_r := v_r || jsonb_build_object('con_foto', true);
    end if;

    for v_c in
      select clave, etiqueta, tipo
      from public.campos
      where empresa_id = v_e.id
        and tipo in ('texto', 'fecha')
        and clave <> 'nombre'
        and clave = any (v_e.qr_mostrar)
      order by orden, etiqueta
    loop
      v_valor := case v_c.clave
        when 'puesto' then v_p.puesto
        when 'numero_empleado' then v_p.numero_empleado
        when 'departamento' then v_p.departamento
        when 'tipo_contrato' then v_p.tipo_contrato
        else v_p.datos ->> v_c.clave
      end;
      v_valor := nullif(btrim(coalesce(v_valor, '')), '');
      if v_valor is not null then
        v_datos := v_datos || jsonb_build_array(jsonb_build_object(
          'clave', v_c.clave, 'etiqueta', v_c.etiqueta, 'tipo', v_c.tipo, 'valor', v_valor
        ));
        if v_c.clave in ('puesto', 'numero_empleado', 'departamento') then
          v_r := v_r || jsonb_build_object(v_c.clave, v_valor);
        end if;
      end if;
    end loop;
    v_r := v_r || jsonb_build_object('datos', v_datos);
  end if;
  return v_r;
end;
$$;

revoke all on function public.verificar_gafete(text) from public;
grant execute on function public.verificar_gafete(text) to anon, authenticated;
