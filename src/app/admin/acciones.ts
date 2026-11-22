"use server";

import { revalidatePath } from "next/cache";
import { requerirAdmin } from "@/lib/admin/sesion";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Aprueba o rechaza la constancia de una empresa. Solo desde el panel de administración. */
export async function revisarConstancia(d: FormData) {
  const { servicio } = await requerirAdmin();
  const id = String(d.get("id") ?? "");
  const aprobar = d.get("decision") === "aprobar";
  const motivo = String(d.get("motivo") ?? "").trim().slice(0, 300);
  // Un rechazo sin motivo no le sirve a la empresa: no se guarda.
  if (!servicio || !UUID.test(id) || (!aprobar && !motivo)) return;
  await servicio
    .from("constancias")
    .update({
      estado: aprobar ? "aprobada" : "rechazada",
      motivo: aprobar ? null : motivo,
      revisada_en: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("estado", "pendiente");
  revalidatePath("/admin");
  revalidatePath("/cuenta", "layout");
}
