-- Carrito y saldo de gafetes prepagados.
--
-- Lo que se compra en el carrito (paquetes, paquete a la medida o gafetes del
-- cotizador) se cobra como un pedido de tipo 'prepago'. Al confirmarse el pago,
-- su contenido queda como saldo de la empresa: gafetes y envíos que se usan
-- después, al hacer un pedido de impresión con su equipo y su diseño.

-- ---------------------------------------------------------------------------
-- Pedidos: tipo, conceptos y uso de saldo
-- ---------------------------------------------------------------------------

alter table public.pedidos
  add column tipo text not null default 'impresion' check (tipo in ('impresion', 'prepago')),
  -- Renglones del cobro: [{ nombre, cantidad, precio }]. Null en pedidos anteriores a este cambio.
  add column conceptos jsonb check (conceptos is null or (jsonb_typeof(conceptos) = 'array' and octet_length(conceptos::text) <= 20000)),
  -- Solo en compras del carrito: lo que se compró y el saldo que deja al pagarse.
  add column articulos jsonb check (articulos is null or (jsonb_typeof(articulos) = 'array' and octet_length(articulos::text) <= 40000)),
  -- Solo en pedidos de impresión: cuántos gafetes y si el envío salieron del saldo.
  add column gafetes_de_saldo integer not null default 0 check (gafetes_de_saldo >= 0),
  add column envio_de_saldo boolean not null default false;

-- Las compras del carrito no salen de un diseño.
alter table public.pedidos drop constraint pedidos_fuente_check;
alter table public.pedidos add constraint pedidos_fuente_check check (fuente in ('diseno', 'listos', 'carrito'));

-- Un pedido que se cubre completo con saldo no cobra nada.
alter table public.pedidos drop constraint pedidos_total_check;
alter table public.pedidos add constraint pedidos_total_check check (total >= 0);

alter table public.pedidos drop constraint pedidos_metodo_check;
alter table public.pedidos add constraint pedidos_metodo_check check (metodo in ('tarjeta', 'oxxo', 'spei', 'saldo'));

grant select (tipo, conceptos, articulos, gafetes_de_saldo, envio_de_saldo) on public.pedidos to authenticated;

-- ---------------------------------------------------------------------------
-- Saldo
-- ---------------------------------------------------------------------------

create table public.saldos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  -- La compra del carrito que lo pagó.
  compra_id uuid not null references public.pedidos (id) on delete restrict,
  -- Posición dentro de la compra, para no crear dos veces el mismo saldo.
  renglon smallint not null check (renglon between 0 and 200),
  concepto text not null check (concepto in ('gafetes', 'envios')),
  material text check (material in ('estandar', 'rudo', 'adhesivo', 'proximidad')),
  dos_caras boolean not null default false,
  cantidad integer not null check (cantidad between 1 and 5000),
  vence_en timestamptz not null,
  -- Si se devolvió el dinero de la compra, el saldo deja de servir.
  anulado_en timestamptz,
  creado_en timestamptz not null default now(),
  unique (compra_id, renglon),
  constraint saldos_material_cuadra check ((concepto = 'gafetes') = (material is not null))
);
create index saldos_empresa_idx on public.saldos (empresa_id, vence_en);

-- Lo que cada pedido de impresión tomó de cada saldo. Si el pedido se cancela,
-- se borran sus usos y el saldo regresa.
create table public.saldo_usos (
  id bigint generated always as identity primary key,
  saldo_id uuid not null references public.saldos (id) on delete cascade,
  pedido_id uuid not null references public.pedidos (id) on delete cascade,
  cantidad integer not null check (cantidad between 1 and 5000),
  creado_en timestamptz not null default now(),
  unique (saldo_id, pedido_id)
);
create index saldo_usos_pedido_idx on public.saldo_usos (pedido_id);

revoke all on public.saldos, public.saldo_usos from anon, authenticated, public;
grant all on public.saldos, public.saldo_usos to service_role;
grant usage, select on sequence public.saldo_usos_id_seq to service_role;
grant select on public.saldos, public.saldo_usos to authenticated;

alter table public.saldos enable row level security;
alter table public.saldo_usos enable row level security;

create policy "saldos: ver los de mis empresas" on public.saldos
  for select to authenticated using (privado.es_miembro(empresa_id));

create policy "saldo_usos: ver los de mis empresas" on public.saldo_usos
  for select to authenticated using (
    exists (select 1 from public.saldos s where s.id = saldo_id and privado.es_miembro(s.empresa_id))
  );

-- Aparta saldo para un pedido, todo o nada. Bloquea los saldos que toca, para
-- que dos pedidos al mismo tiempo no usen el mismo gafete. Solo la llama el
-- servidor con la llave secreta.
create function public.usar_saldo(p_pedido uuid, p_plan jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa uuid;
  v_paso record;
  v_disponible integer;
begin
  select empresa_id into v_empresa from public.pedidos where id = p_pedido;
  if v_empresa is null then
    raise exception 'pedido_no_existe';
  end if;
  for v_paso in
    select (e ->> 'saldo')::uuid as saldo, (e ->> 'cantidad')::integer as cantidad
    from jsonb_array_elements(p_plan) e
  loop
    perform 1 from public.saldos s
      where s.id = v_paso.saldo and s.empresa_id = v_empresa and s.anulado_en is null and s.vence_en > now()
      for update;
    if not found then
      raise exception 'saldo_no_disponible';
    end if;
    select s.cantidad - coalesce((select sum(u.cantidad) from public.saldo_usos u where u.saldo_id = s.id), 0)
      into v_disponible
      from public.saldos s where s.id = v_paso.saldo;
    if v_paso.cantidad is null or v_paso.cantidad < 1 or v_disponible < v_paso.cantidad then
      raise exception 'saldo_insuficiente';
    end if;
    insert into public.saldo_usos (saldo_id, pedido_id, cantidad) values (v_paso.saldo, p_pedido, v_paso.cantidad);
  end loop;
end;
$$;

revoke execute on function public.usar_saldo(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.usar_saldo(uuid, jsonb) to service_role;
