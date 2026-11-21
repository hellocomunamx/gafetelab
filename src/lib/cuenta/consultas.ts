import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/tipos";

type Cliente = SupabaseClient<Database>;

export async function camposDe(supabase: Cliente, empresaId: string) {
  const { data } = await supabase
    .from("campos")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("orden")
    .order("creado_en");
  return data ?? [];
}

/** Departamentos y tipos de contrato ya usados, para sugerirlos al capturar. */
export async function sugerenciasDe(supabase: Cliente, empresaId: string) {
  const { data } = await supabase
    .from("empleados")
    .select("departamento, tipo_contrato")
    .eq("empresa_id", empresaId);
  const unicos = (valores: (string | null)[]) =>
    [...new Set(valores.filter((v): v is string => Boolean(v)))].sort((a, b) => a.localeCompare(b, "es"));
  return {
    departamentos: unicos((data ?? []).map((d) => d.departamento)),
    contratos: unicos((data ?? []).map((d) => d.tipo_contrato)),
  };
}
