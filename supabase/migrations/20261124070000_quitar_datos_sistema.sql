-- La empresa ya puede quitar de su lista los datos que vienen de entrada
-- (Puesto, Número de empleado, Fotografía, Departamento, Tipo de contrato y
-- Código QR). Solo «Nombre» se queda siempre. Lo capturado en las columnas de
-- `empleados` no se borra: vuelve a verse si la empresa recupera el dato.
drop policy if exists "miembros: borrar campos propios" on public.campos;
drop policy if exists "miembros: borrar campos" on public.campos;
create policy "miembros: borrar campos" on public.campos
  for delete to authenticated using (privado.es_miembro(empresa_id) and clave <> 'nombre');
