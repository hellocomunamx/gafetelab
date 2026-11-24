-- ¿La fecha de emisión de la constancia salió del PDF del SAT o la escribió la
-- persona? Si salió del PDF, no se puede cambiar en el formulario. Si se
-- escribió a mano (fotos y escaneos), el panel avisa que hay que compararla
-- con el archivo antes de aprobar.
alter table public.constancias add column if not exists fecha_leida boolean not null default false;
