-- Quitar la verificación a una empresa ya verificada. La quita quien opera
-- LaGafetería desde el panel (con la llave secreta): la verificación pasa a
-- 'retirada', con el motivo, quién y cuándo. La empresa ya no puede hacer
-- pedidos hasta verificarse de nuevo.
alter table public.constancias drop constraint if exists constancias_estado_check;
alter table public.constancias add constraint constancias_estado_check
  check (estado in ('pendiente', 'aprobada', 'rechazada', 'retirada'));
alter table public.constancias
  add column if not exists retirada_en timestamptz,
  add column if not exists retirada_por uuid references auth.users (id) on delete set null;
