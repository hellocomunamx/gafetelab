import type { SupabaseClient } from "@supabase/supabase-js";
import { site } from "@/lib/site";
import type { Database } from "@/lib/supabase/tipos";

/**
 * Constancia de Situación Fiscal de la empresa: se pide al abrir la cuenta y
 * debe estar aprobada antes del primer pedido.
 */

export type EstadoConstancia = "pendiente" | "aprobada" | "rechazada";
export type Constancia = Database["public"]["Tables"]["constancias"]["Row"];

export const TIPOS_CONSTANCIA = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png" } as const;
export type TipoConstancia = keyof typeof TIPOS_CONSTANCIA;
export const PESO_MAXIMO_CONSTANCIA = 5 * 1024 * 1024;

export const rutaConstancia = (empresaId: string, extension: string) =>
  `${empresaId}/${crypto.randomUUID()}.${extension}`;

const aIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Hoy en Sonora, como fecha sin hora. */
function hoy(): Date {
  const [a, m, d] = new Date().toLocaleDateString("en-CA", { timeZone: "America/Hermosillo" }).split("-").map(Number);
  return new Date(a, m - 1, d);
}

/** Entre qué fechas de emisión se acepta una constancia subida hoy (AAAA-MM-DD). */
export function ventanaDeEmision(): { desde: string; hasta: string } {
  const hasta = hoy();
  const desde = new Date(hasta);
  desde.setMonth(desde.getMonth() - site.constanciaMeses);
  return { desde: aIso(desde), hasta: aIso(hasta) };
}

/** La constancia más reciente de la empresa, o null si no ha subido ninguna. */
export async function constanciaDe(supabase: SupabaseClient<Database>, empresaId: string): Promise<Constancia | null> {
  const { data } = await supabase
    .from("constancias")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

/** ¿La empresa ya puede hacer pedidos? Solo con la constancia aprobada. */
export const puedePedir = (constancia: Pick<Constancia, "estado"> | null) => constancia?.estado === "aprobada";

/** "22 de noviembre de 2026", para una fecha (AAAA-MM-DD) o un momento con hora, visto desde Sonora. */
export const fechaLarga = (iso: string) =>
  (iso.length > 10 ? new Date(iso) : new Date(`${iso}T12:00:00-07:00`)).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Hermosillo",
  });
