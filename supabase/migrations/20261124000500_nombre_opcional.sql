-- El nombre de la persona deja de ser obligatorio: puede haber gafetes
-- genéricos, como «Visitante» o «Proveedor». Se guarda vacío ('').
alter table public.empleados drop constraint if exists empleados_nombre_check;
alter table public.empleados add constraint empleados_nombre_check check (char_length(nombre) <= 160);
