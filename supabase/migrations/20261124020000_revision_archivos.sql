-- Revisión de archivos subidos: tipo real (por bytes) y moderación automática
-- de imágenes. Las que el filtro duda o marca quedan "retenidas" para que
-- quien opera LaGafetería decida en /8admins/archivos.

create table public.revision_archivos (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  ruta text not null,
  empresa_id uuid references public.empresas (id) on delete cascade,
  -- foto, liga, diseno, gafete o verificacion
  origen text,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'aprobado', 'retenido', 'rechazado')),
  tipo_real text,
  peso bigint,
  categorias text[] not null default '{}',
  motivo text,
  modelo text,
  creado_en timestamptz not null default now(),
  revisado_en timestamptz,
  resuelto_en timestamptz,
  resuelto_por uuid references auth.users (id) on delete set null,
  unique (bucket, ruta)
);

create index revision_archivos_estado on public.revision_archivos (estado, creado_en desc);
create index revision_archivos_empresa on public.revision_archivos (empresa_id);

alter table public.revision_archivos enable row level security;

-- La empresa ve el estado de sus archivos; la administradora, todos. Nadie
-- escribe desde el navegador: solo el servidor, con la llave secreta.
create policy "revision_archivos: ver" on public.revision_archivos
  for select to authenticated
  using (privado.es_miembro(empresa_id) or public.es_admin_plataforma());

revoke insert, update, delete on public.revision_archivos from anon, authenticated;

-- Archivos de los últimos 60 días que todavía no se revisan, por ejemplo si
-- alguien los subió directo al almacenamiento sin pasar por el sitio.
create function public.archivos_por_revisar(p_limite int default 50)
returns table (bucket text, ruta text, creado_en timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select o.bucket_id, o.name, o.created_at
  from storage.objects o
  left join public.revision_archivos r on r.bucket = o.bucket_id and r.ruta = o.name
  where o.bucket_id in ('fotos', 'disenos', 'gafetes', 'constancias')
    and o.created_at > now() - interval '60 days'
    and r.id is null
  order by o.created_at desc
  limit least(greatest(p_limite, 1), 200);
$$;

revoke all on function public.archivos_por_revisar(int) from public, anon, authenticated;
grant execute on function public.archivos_por_revisar(int) to service_role;
