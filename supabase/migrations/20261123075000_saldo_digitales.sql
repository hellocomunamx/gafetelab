-- Gafetes digitales en el saldo: lo que se compra en el carrito como digital
-- (o impreso + digital) queda a favor y se activa desde la plataforma.

alter table public.saldos drop constraint saldos_concepto_check;
alter table public.saldos add constraint saldos_concepto_check check (concepto in ('gafetes', 'envios', 'digitales'));
