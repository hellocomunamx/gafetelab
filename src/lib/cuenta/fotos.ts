import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/tipos";

/** Ligas temporales (1 hora) para mostrar archivos de un almacenamiento privado. */
export async function ligasDe(
  supabase: SupabaseClient<Database>,
  almacen: "fotos" | "disenos" | "gafetes",
  rutas: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const unicas = [...new Set(rutas.filter((r): r is string => Boolean(r)))];
  if (!unicas.length) return new Map();
  const { data } = await supabase.storage.from(almacen).createSignedUrls(unicas, 3600);
  return new Map(
    (data ?? []).flatMap((f) => (f.path && f.signedUrl ? [[f.path, f.signedUrl] as const] : [])),
  );
}

export const ligasDeFotos = (supabase: SupabaseClient<Database>, rutas: (string | null)[]) =>
  ligasDe(supabase, "fotos", rutas);
