import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/tipos";

/** Ligas temporales (1 hora) para mostrar fotos del almacenamiento privado. */
export async function ligasDeFotos(
  supabase: SupabaseClient<Database>,
  rutas: (string | null)[],
): Promise<Map<string, string>> {
  const unicas = [...new Set(rutas.filter((r): r is string => Boolean(r)))];
  if (!unicas.length) return new Map();
  const { data } = await supabase.storage.from("fotos").createSignedUrls(unicas, 3600);
  return new Map(
    (data ?? []).flatMap((f) => (f.path && f.signedUrl ? [[f.path, f.signedUrl] as const] : [])),
  );
}
