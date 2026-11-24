"use server";

import { revalidatePath } from "next/cache";
import { RUTA_ADMIN } from "@/lib/admin/ruta";
import { requerirAdmin } from "@/lib/admin/sesion";
import { revisarHuerfanos } from "@/lib/seguridad/revisar";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Decide sobre un archivo retenido por la revisión automática.
 * - Aprobar: se queda como está.
 * - Rechazar: se borra el archivo y se quita de donde se usaba (foto de la
 *   persona o foto mandada por su liga, que queda para corregir).
 */
export async function decidirArchivo(d: FormData) {
  const { servicio, usuario } = await requerirAdmin();
  const id = String(d.get("id") ?? "");
  const aprobar = d.get("decision") === "aprobar";
  if (!servicio || !UUID.test(id)) return;
  const { data: fila } = await servicio.from("revision_archivos").select("*").eq("id", id).maybeSingle();
  if (!fila) return;

  if (!aprobar) {
    await servicio.storage.from(fila.bucket).remove([fila.ruta]);
    if (fila.bucket === "fotos") {
      await servicio.from("empleados").update({ foto_path: null }).eq("foto_path", fila.ruta);
      // Si llegó por la liga, la persona la vuelve a mandar con el aviso de qué corregir.
      await servicio
        .from("propuestas")
        .update({
          estado: "rechazada",
          foto_path: null,
          motivo: "Foto: no se puede usar para un gafete. Manda una foto tuya, de frente, con buena luz y fondo liso.",
          resuelto_en: new Date().toISOString(),
        })
        .eq("foto_path", fila.ruta);
      // Si era un cambio de foto pedido desde el gafete digital, se cierra rechazado.
      await servicio
        .from("solicitudes_foto")
        .update({ estado: "rechazada", motivo: "La foto no se puede usar para un gafete." })
        .eq("foto_path", fila.ruta)
        .eq("estado", "pendiente");
    }
    if (fila.bucket === "gafetes") {
      await servicio.from("gafetes_listos").update({ frente_path: null }).eq("frente_path", fila.ruta);
      await servicio.from("gafetes_listos").update({ vuelta_path: null }).eq("vuelta_path", fila.ruta);
    }
  }
  await servicio
    .from("revision_archivos")
    .update({ estado: aprobar ? "aprobado" : "rechazado", resuelto_en: new Date().toISOString(), resuelto_por: usuario.id })
    .eq("id", id);
  revalidatePath(`${RUTA_ADMIN}/archivos`);
  revalidatePath("/cuenta", "layout");
}

/** Revisa lo que se subió directo al almacenamiento sin pasar por el sitio. */
export async function revisarPendientes() {
  await requerirAdmin();
  await revisarHuerfanos(40);
  revalidatePath(`${RUTA_ADMIN}/archivos`);
}
