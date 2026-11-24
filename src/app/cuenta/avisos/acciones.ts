"use server";

import { revalidatePath } from "next/cache";
import { esModoAviso, RUTA_AVISOS, TIPOS_AVISO, type TipoAviso } from "@/lib/avisos/tipos";
import { requerirUsuario } from "@/lib/cuenta/sesion";
import type { Resultado } from "@/lib/cuenta/tipos";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Guarda, para una empresa, cómo quiere recibir cada tipo de aviso quien está en sesión. */
export async function guardarAvisos(_: Resultado, d: FormData): Promise<Resultado> {
  const empresaId = String(d.get("empresa") ?? "");
  if (!UUID.test(empresaId)) return { error: "No pudimos guardar. Intenta de nuevo." };
  const { supabase, usuario } = await requerirUsuario();
  const filas = (Object.keys(TIPOS_AVISO) as TipoAviso[]).flatMap((tipo) => {
    const modo = d.get(`modo_${tipo}`);
    return esModoAviso(modo) ? [{ usuario_id: usuario.id, empresa_id: empresaId, tipo, modo, actualizado_en: new Date().toISOString() }] : [];
  });
  if (!filas.length) return { error: "Elige una opción." };
  const { error } = await supabase.from("preferencias_aviso").upsert(filas, { onConflict: "usuario_id,empresa_id,tipo" });
  // La regla de acceso solo deja guardar en empresas que administras.
  if (error) return { error: error.code === "42501" ? "Solo quien administra la empresa recibe estos avisos." : "No pudimos guardar. Intenta de nuevo." };
  revalidatePath(RUTA_AVISOS);
  return { ok: "Guardado." };
}
