"use server";

import { revalidatePath } from "next/cache";
import { avisarAlMomento } from "@/lib/avisos/enviar";
import { ligaBloqueada } from "@/lib/cuenta/candado";
import { personaDeLiga } from "@/lib/cuenta/liga-publica";
import { PESO_MAXIMO_FOTO, RUTA_LIGA, rutaFotoPendiente } from "@/lib/cuenta/ligas";
import type { Resultado } from "@/lib/cuenta/tipos";
import { dentroDelLimite, ipActual, MENSAJE_LIMITE } from "@/lib/seguridad/limites";
import { anotarRevision, moderarAlMomento } from "@/lib/seguridad/revisar";
import { CAMPO_TURNSTILE, MENSAJE_TURNSTILE, verificarTurnstile } from "@/lib/seguridad/turnstile";

const ERROR_GENERAL = "No pudimos mandar tus datos. Intenta de nuevo.";

/**
 * Lo que manda una persona desde su liga: sus datos y su foto. No cambia nada
 * en su ficha: queda como propuesta hasta que su empresa la apruebe.
 */
export async function enviarMisDatos(datos: FormData): Promise<Resultado> {
  const ip = await ipActual();
  if (!(await dentroDelLimite("LIMITE_FORMULARIOS", `liga:${ip}`))) return { error: MENSAJE_LIMITE };
  if (!(await verificarTurnstile(datos.get(CAMPO_TURNSTILE), ip))) return { error: MENSAJE_TURNSTILE };
  const liga = String(datos.get("liga") ?? "");
  const encontrada = await personaDeLiga(liga);
  if (!encontrada) return { error: "Esta liga ya no está activa. Pide una nueva en tu empresa." };
  const { servicio, persona, empresa, campos, propuesta } = encontrada;
  if (await ligaBloqueada(servicio, liga, persona.id)) {
    return { error: "Tu gafete se volvió a cerrar. Recarga la página y ábrelo con tu huella o tu cara." };
  }
  // Una vez enviado, la liga se cierra: solo la empresa la reabre pidiendo una corrección.
  if (propuesta && propuesta.estado !== "rechazada") {
    return { error: "Ya enviaste tu información. Si necesitas cambiar algo, solicítalo al departamento correspondiente de tu empresa." };
  }

  const valores: Record<string, string> = {};
  for (const campo of campos) {
    const valor = String(datos.get(`dato_${campo.clave}`) ?? "").trim().slice(0, campo.clave === "nombre" ? 160 : 120);
    if (!valor && (campo.obligatorio || campo.clave === "nombre")) return { error: `Falta llenar: ${campo.etiqueta}.` };
    if (campo.tipo === "fecha" && valor && !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return { error: `Revisa la fecha de: ${campo.etiqueta}.` };
    valores[campo.clave] = valor;
  }

  let foto: string | null = null;
  const archivo = datos.get("foto");
  if (empresa.liga_foto && archivo instanceof Blob && archivo.size > 0) {
    if (archivo.size > PESO_MAXIMO_FOTO) return { error: "La foto pesa demasiado. Elige otra." };
    const bytes = new Uint8Array(await archivo.arrayBuffer());
    // Solo JPEG: el navegador ya la recortó y la convirtió antes de mandarla.
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) return { error: "No pudimos leer la foto. Elige otra." };
    // Revisión automática al momento: lo claramente inapropiado ni se guarda.
    const revision = await moderarAlMomento(bytes, "liga");
    if (revision?.veredicto === "bloquear") {
      return { error: "Esta foto no se puede usar para un gafete. Usa una foto tuya, de frente, con buena luz y fondo liso." };
    }
    const ruta = rutaFotoPendiente(empresa.id, persona.id);
    const { error } = await servicio.storage.from("fotos").upload(ruta, bytes, { contentType: "image/jpeg", upsert: true });
    if (error) return { error: ERROR_GENERAL };
    await anotarRevision("fotos", ruta, "liga", bytes, revision);
    foto = ruta;
  }
  if (empresa.liga_foto && !foto && !persona.foto_path) return { error: "Falta tu foto." };

  const { error } = await servicio.from("propuestas").upsert(
    {
      empleado_id: persona.id,
      empresa_id: empresa.id,
      datos: valores,
      foto_path: foto,
      estado: "pendiente",
      motivo: null,
      enviado_en: new Date().toISOString(),
      resuelto_en: null,
    },
    { onConflict: "empleado_id" },
  );
  if (error) return { error: ERROR_GENERAL };
  // Aviso a quien lo pidió «al momento»; si solo corrige lo que ya estaba pendiente, no se repite.
  if (propuesta?.estado !== "pendiente") await avisarAlMomento(servicio, { empresaId: empresa.id, tipo: "datos_liga", persona: valores.nombre || persona.nombre });
  revalidatePath(`${RUTA_LIGA}/${liga}`);
  revalidatePath("/cuenta", "layout");
  return { ok: "Listo." };
}
