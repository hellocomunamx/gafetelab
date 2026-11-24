-- Eventos: una organización (la empresa de siempre, su «Equipo de trabajo»)
-- puede tener proyectos de tipo Evento. Cada evento es una fila de `empresas`
-- con `tipo = 'evento'` y `padre_id` apuntando a la organización, así que usa
-- todo lo que ya existe (campos, Excel, fotos, diseños, reglas, pedidos, QR)
-- sin tocar esas tablas.
--
-- Lo que el evento suma: tipo de evento, fechas (inicio, fin y límite para
-- pedir), sede, categorías de gafete con color, cordón como agregado del
-- pedido y datos personales que se borran al terminar el evento.

-- ---------------------------------------------------------------------------
-- Columnas de empresas
-- ---------------------------------------------------------------------------

alter table public.empresas
  add column tipo text not null default 'equipo' check (tipo in ('equipo', 'evento')),
  add column padre_id uuid references public.empresas (id) on delete cascade,
  add column evento_tipo text check (evento_tipo in ('congreso', 'conferencia', 'corporativo', 'expo', 'escolar', 'otro')),
  add column evento_inicio date,
  add column evento_fin date,
  -- Último día para pedir y que los gafetes lleguen antes del evento.
  add column evento_limite date,
  add column evento_sede text check (char_length(evento_sede) <= 160),
  -- [{ "nombre": "Ponente", "color": "#e63946" }, ...], en el orden en que se muestran.
  add column categorias jsonb not null default '[]'::jsonb
    check (jsonb_typeof(categorias) = 'array' and jsonb_array_length(categorias) <= 20 and pg_column_size(categorias) <= 4000),
  -- Cuándo se borraron los datos personales de los asistentes. Null: todavía no.
  add column datos_borrados_en timestamptz;

alter table public.empresas add constraint empresas_evento_completo check (
  (tipo = 'equipo' and padre_id is null and evento_tipo is null and evento_inicio is null and evento_fin is null and evento_limite is null)
  or (tipo = 'evento' and padre_id is not null and evento_tipo is not null and evento_inicio is not null
      and evento_fin is not null and evento_fin >= evento_inicio and evento_limite is not null and evento_limite <= evento_fin)
);
-- Los eventos no tienen portal «Mi gafete».
alter table public.empresas add constraint empresas_evento_sin_portal check (tipo = 'equipo' or not portal_activo);

create index empresas_padre_idx on public.empresas (padre_id) where padre_id is not null;
create index empresas_eventos_por_vencer_idx on public.empresas (evento_fin) where tipo = 'evento' and datos_borrados_en is null;

-- El tipo y la organización de un proyecto no cambian después de crearlo.
create function privado.fijar_tipo_empresa()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.tipo is distinct from old.tipo or new.padre_id is distinct from old.padre_id then
    raise exception 'El tipo de proyecto no se puede cambiar.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger fijar_tipo before update on public.empresas
  for each row execute function privado.fijar_tipo_empresa();

-- ---------------------------------------------------------------------------
-- Cordón como agregado del pedido
-- ---------------------------------------------------------------------------

-- Cordones por color: [{ "categoria": "Ponente", "color": "#e63946", "piezas": 12 }, ...].
-- Null: el pedido no lleva cordón.
alter table public.pedidos
  add column cordones jsonb check (cordones is null or (jsonb_typeof(cordones) = 'array' and pg_column_size(cordones) <= 4000));

-- ---------------------------------------------------------------------------
-- Usuarios: quien está en la organización también está en sus eventos
-- ---------------------------------------------------------------------------

create function privado.copiar_miembros_a_eventos()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.miembros m
    using public.empresas e
    where e.padre_id = old.empresa_id and m.empresa_id = e.id and m.usuario_id = old.usuario_id;
    return old;
  end if;
  insert into public.miembros (empresa_id, usuario_id, rol)
  select e.id, new.usuario_id, new.rol
  from public.empresas e
  where e.padre_id = new.empresa_id
  on conflict (empresa_id, usuario_id) do update set rol = excluded.rol;
  return new;
end;
$$;

create trigger copiar_a_eventos after insert or update or delete on public.miembros
  for each row execute function privado.copiar_miembros_a_eventos();

-- ---------------------------------------------------------------------------
-- Crear un evento
-- ---------------------------------------------------------------------------

-- Solo quien administra la organización. Copia a sus usuarios, sus
-- direcciones y sus datos de facturación, y deja los campos de un evento.
create function public.crear_evento(
  p_organizacion uuid,
  p_nombre text,
  p_tipo text,
  p_inicio date,
  p_fin date,
  p_limite date,
  p_sede text,
  p_categorias jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := (select auth.uid());
  v_org public.empresas;
  v_evento uuid;
begin
  if v_usuario is null then
    raise exception 'Inicia sesión para crear un evento.' using errcode = '28000';
  end if;
  select * into v_org from public.empresas where id = p_organizacion;
  if not found or not privado.es_admin(p_organizacion) then
    raise exception 'Solo quien administra la organización puede crear eventos.' using errcode = 'P0001';
  end if;
  if v_org.tipo <> 'equipo' then
    raise exception 'Los eventos se crean desde la organización.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.empresas where padre_id = p_organizacion and datos_borrados_en is null) >= 30 then
    raise exception 'Llegaste al máximo de eventos activos. Escríbenos y lo ampliamos.' using errcode = 'P0001';
  end if;
  if p_fin < p_inicio then
    raise exception 'El evento no puede terminar antes de empezar.' using errcode = 'P0001';
  end if;
  if p_limite > p_fin then
    raise exception 'La fecha límite para pedir debe ser antes de que termine el evento.' using errcode = 'P0001';
  end if;

  insert into public.empresas (
    nombre, giro, creado_por, tipo, padre_id, evento_tipo, evento_inicio, evento_fin, evento_limite, evento_sede, categorias,
    qr_modo, qr_mostrar, liga_campos, liga_foto
  )
  values (
    btrim(p_nombre), v_org.giro, v_usuario, 'evento', p_organizacion, p_tipo, p_inicio, p_fin, p_limite,
    nullif(btrim(coalesce(p_sede, '')), ''), coalesce(p_categorias, '[]'::jsonb),
    'verificacion', array['empresa', 'nombre', 'categoria', 'institucion'], array['nombre', 'puesto', 'institucion'], false
  )
  returning id into v_evento;

  -- Los mismos usuarios, con el mismo rol.
  insert into public.miembros (empresa_id, usuario_id, rol)
  select v_evento, m.usuario_id, m.rol from public.miembros m where m.empresa_id = p_organizacion
  on conflict do nothing;

  insert into public.direcciones (empresa_id, alias, destinatario, telefono, calle, colonia, ciudad, estado, cp, referencias, predeterminada)
  select v_evento, alias, destinatario, telefono, calle, colonia, ciudad, estado, cp, referencias, predeterminada
  from public.direcciones where empresa_id = p_organizacion;

  insert into public.datos_fiscales (empresa_id, rfc, razon_social, regimen_fiscal, cp_fiscal, uso_cfdi, correo, predeterminado)
  select v_evento, rfc, razon_social, regimen_fiscal, cp_fiscal, uso_cfdi, correo, predeterminado
  from public.datos_fiscales where empresa_id = p_organizacion;

  -- Campos de un evento. «Número de empleado» queda como folio de registro.
  insert into public.campos (empresa_id, clave, etiqueta, tipo, en_gafete, cara, orden, obligatorio, de_sistema)
  values
    (v_evento, 'nombre', 'Nombre', 'texto', true, 'frente', 1, true, true),
    (v_evento, 'categoria', 'Categoría', 'texto', true, 'frente', 2, true, false),
    (v_evento, 'puesto', 'Cargo', 'texto', true, 'frente', 3, false, true),
    (v_evento, 'institucion', 'Empresa o institución', 'texto', true, 'frente', 4, false, false),
    (v_evento, 'numero_empleado', 'Folio de registro', 'texto', false, 'frente', 5, false, true),
    (v_evento, 'foto', 'Fotografía', 'foto', false, 'frente', 6, false, true),
    (v_evento, 'departamento', 'Departamento', 'texto', false, 'frente', 7, false, true),
    (v_evento, 'tipo_contrato', 'Tipo de contrato', 'texto', false, 'frente', 8, false, true),
    (v_evento, 'qr', 'QR de acceso', 'qr', true, 'vuelta', 9, false, true);

  return v_evento;
end;
$$;

revoke all on function public.crear_evento(uuid, text, text, date, date, date, text, jsonb) from public, anon;
grant execute on function public.crear_evento(uuid, text, text, date, date, date, text, jsonb) to authenticated;

-- El tope de 20 empresas por cuenta cuenta solo organizaciones, no eventos.
create or replace function public.crear_empresa(p_nombre text, p_giro text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := (select auth.uid());
  v_empresa uuid;
begin
  if v_usuario is null then
    raise exception 'Inicia sesión para crear una empresa.' using errcode = '28000';
  end if;
  if (
    select count(*) from public.miembros m join public.empresas e on e.id = m.empresa_id
    where m.usuario_id = v_usuario and m.rol = 'propietario' and e.tipo = 'equipo'
  ) >= 20 then
    raise exception 'Llegaste al máximo de empresas por cuenta.' using errcode = 'P0001';
  end if;

  insert into public.empresas (nombre, giro, creado_por)
  values (btrim(p_nombre), nullif(btrim(coalesce(p_giro, '')), ''), v_usuario)
  returning id into v_empresa;

  insert into public.miembros (empresa_id, usuario_id, rol)
  values (v_empresa, v_usuario, 'propietario');

  insert into public.campos (empresa_id, clave, etiqueta, tipo, en_gafete, cara, orden, obligatorio, de_sistema)
  values
    (v_empresa, 'nombre', 'Nombre', 'texto', true, 'frente', 1, true, true),
    (v_empresa, 'puesto', 'Puesto', 'texto', true, 'frente', 2, false, true),
    (v_empresa, 'numero_empleado', 'Número de empleado', 'texto', true, 'frente', 3, false, true),
    (v_empresa, 'foto', 'Fotografía', 'foto', true, 'frente', 4, false, true),
    (v_empresa, 'departamento', 'Departamento', 'texto', false, 'frente', 5, false, true),
    (v_empresa, 'tipo_contrato', 'Tipo de contrato', 'texto', false, 'frente', 6, false, true),
    (v_empresa, 'qr', 'Código QR', 'qr', false, 'vuelta', 7, false, true);

  return v_empresa;
end;
$$;

revoke all on function public.crear_empresa(text, text) from public, anon;
grant execute on function public.crear_empresa(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Datos que vencen al terminar el evento
-- ---------------------------------------------------------------------------

-- Borra los datos personales de los asistentes de un evento ya terminado:
-- nombre, datos propios, foto, correos y la copia de cada gafete. Deja el
-- conteo de gafetes y los pedidos, que se necesitan para facturar. Lo llama
-- el servidor (con la llave secreta) después de borrar las fotos del
-- almacenamiento.
create function public.borrar_datos_evento(p_evento uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_personas integer;
begin
  if not exists (select 1 from public.empresas where id = p_evento and tipo = 'evento') then
    raise exception 'No es un evento.' using errcode = 'P0001';
  end if;

  update public.empleados
  set nombre = 'Asistente',
      numero_empleado = null,
      puesto = null,
      departamento = null,
      tipo_contrato = null,
      datos = '{}'::jsonb,
      foto_path = null,
      estatus = 'baja',
      fecha_baja = coalesce(fecha_baja, (now() at time zone 'America/Mexico_City')::date)
  where empresa_id = p_evento;
  get diagnostics v_personas = row_count;

  update public.gafetes set datos = '{}'::jsonb where empresa_id = p_evento;
  update public.empresas set datos_borrados_en = now() where id = p_evento;
  return v_personas;
end;
$$;

revoke all on function public.borrar_datos_evento(uuid) from public, anon, authenticated;
grant execute on function public.borrar_datos_evento(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- QR de acceso: la página de verificación sabe de eventos
-- ---------------------------------------------------------------------------

-- Igual que antes para los equipos. En un evento, el gafete vale hasta el
-- último día del evento, se muestra la categoría con su color y los datos del
-- evento, y después de borrar los datos ya no se verifica.
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
  v_cat jsonb;
begin
  if p_codigo is null or p_codigo !~ '^[A-Za-z0-9_-]{12}$' then
    return null;
  end if;
  select * into v_p from public.empleados where codigo = p_codigo;
  if not found then
    return null;
  end if;
  select * into v_e from public.empresas where id = v_p.empresa_id;
  if v_e.qr_modo <> 'verificacion' or v_e.datos_borrados_en is not null then
    return null;
  end if;

  if v_e.tipo = 'evento' then
    v_hasta := v_e.evento_fin;
  elsif v_e.qr_vigencia is not null then
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
  if v_e.tipo = 'evento' then
    v_r := v_r || jsonb_build_object('evento', jsonb_build_object(
      'nombre', v_e.nombre, 'inicio', v_e.evento_inicio, 'fin', v_e.evento_fin, 'sede', v_e.evento_sede
    ));
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
    if v_e.tipo = 'evento' and 'categoria' = any (v_e.qr_mostrar) then
      select c into v_cat
      from jsonb_array_elements(v_e.categorias) c
      where lower(btrim(c ->> 'nombre')) = lower(btrim(coalesce(v_p.datos ->> 'categoria', '')))
      limit 1;
      if v_cat is not null then
        v_r := v_r || jsonb_build_object('categoria', jsonb_build_object('nombre', v_cat ->> 'nombre', 'color', v_cat ->> 'color'));
      end if;
    end if;

    for v_c in
      select clave, etiqueta, tipo
      from public.campos
      where empresa_id = v_e.id
        and tipo in ('texto', 'fecha')
        and clave <> 'nombre'
        and not (v_e.tipo = 'evento' and clave = 'categoria')
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
