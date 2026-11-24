import type { SupabaseClient } from "@supabase/supabase-js";
import { avisarAlMomento } from "@/lib/avisos/enviar";
import type { Resultado } from "@/lib/cuenta/tipos";
import { anotarRevision, moderarAlMomento } from "@/lib/seguridad/revisar";
import type { Database } from "@/lib/supabase/tipos";
import { rutaCambioFoto, tieneImpreso } from "./cambio-foto";
import { PESO_MAXIMO_FOTO } from "./ligas";

/**
 * Lo que comparten la liga por persona y el portal de empleados al pedir un
 * cambio de foto. Quien llama ya comprobó quién es la persona.
 */

type Servicio = SupabaseClient<Database>;
const ERROR_GENERAL = "No pudimos mandar tu foto. Intenta de nuevo.";

export async function registrarCambioFoto(
  servicio: Servicio,
  persona: { id: string; nombre: string },
  empresa: { id: string },
  datos: FormData,
): Promise<Resultado> {
  const conImpreso = await tieneImpreso(servicio, persona.id);
  if (conImpreso && datos.get("acepto_reposicion") !== "on") {
    return { error: "Confirma que sabes que vas a necesitar un gafete impreso nuevo." };
  }

  const archivo = datos.get("foto");
  if (!(archivo instanceof Blob) || !archivo.size) return { error: "Elige tu foto nueva." };
  if (archivo.size > PESO_MAXIMO_FOTO) return { error: "La foto pesa demasiado. Elige otra." };
  const bytes = new Uint8Array(await archivo.arrayBuffer());
  // Solo JPEG: el navegador ya la recortó y la convirtió antes de mandarla.
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) return { error: "No pudimos leer la foto. Elige otra." };
  // Revisión automática al momento: lo claramente inapropiado ni se guarda.
  const revision = await moderarAlMomento(bytes, "liga");
  if (revision?.veredicto === "bloquear") {
    return { error: "Esta foto no se puede usar para un gafete. Usa una foto tuya, de frente, con buena luz y fondo liso." };
  }
  const ruta = rutaCambioFoto(empresa.id, persona.id);
  const { error: errorFoto } = await servicio.storage.from("fotos").upload(ruta, bytes, { contentType: "image/jpeg", upsert: true });
  if (errorFoto) return { error: ERROR_GENERAL };
  await anotarRevision("fotos", ruta, "liga", bytes, revision);

  // Si ya había una solicitud abierta, se reemplaza la foto y vuelve a la fila.
  const { data: abierta } = await servicio
    .from("solicitudes_foto")
    .select("id")
    .eq("empleado_id", persona.id)
    .eq("estado", "pendiente")
    .maybeSingle();
  const { error } = abierta
    ? await servicio
        .from("solicitudes_foto")
        .update({ foto_path: ruta, con_impreso: conImpreso, creado_en: new Date().toISOString() })
        .eq("id", abierta.id)
    : await servicio
        .from("solicitudes_foto")
        .insert({ empleado_id: persona.id, empresa_id: empresa.id, foto_path: ruta, con_impreso: conImpreso });
  if (error) return { error: ERROR_GENERAL };

  if (!abierta) await avisarAlMomento(servicio, { empresaId: empresa.id, tipo: "cambio_foto", persona: persona.nombre, conImpreso });
  return { ok: "Listo." };
}

/** La persona se arrepiente: retira su solicitud mientras sigue sin revisarse. */
export async function retirarCambioFoto(servicio: Servicio, personaId: string): Promise<Resultado> {
  const { data: abierta } = await servicio
    .from("solicitudes_foto")
    .select("id, foto_path")
    .eq("empleado_id", personaId)
    .eq("estado", "pendiente")
    .maybeSingle();
  if (!abierta) return { ok: "Ya no había nada que cancelar." };
  if (abierta.foto_path) await servicio.storage.from("fotos").remove([abierta.foto_path]);
  await servicio
    .from("solicitudes_foto")
    .update({ estado: "cancelada", foto_path: null, resuelto_en: new Date().toISOString() })
    .eq("id", abierta.id);
  return { ok: "Cancelada." };
}
