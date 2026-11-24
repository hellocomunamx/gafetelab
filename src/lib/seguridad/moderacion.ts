import Anthropic from "@anthropic-ai/sdk";

/**
 * Moderación automática de imágenes con Claude (visión). Decide si una imagen
 * está bien, si conviene que una persona la revise o si es claramente
 * inapropiada. No borra nada: quien opera LaGafetería tiene la última palabra
 * en /8admins/archivos.
 *
 * Costo aproximado con Claude Haiku 5.5: unos USD 0.0003 por imagen (≈ 1,500
 * tokens de entrada y unos cientos de salida), o sea unos USD 0.30 por cada
 * 1,000 imágenes. El tope mensual (MODERACION_TOPE_MENSUAL) lo limita.
 */
export const moderacion = {
  /** Modelo de visión; se puede cambiar con MODERACION_MODELO sin tocar código. */
  modelo: process.env.MODERACION_MODELO || "claude-haiku-5-5",
  /** Imágenes revisadas por mes antes de dejar de llamar al modelo (≈ USD 9 con 30,000). */
  topeMensual: Number(process.env.MODERACION_TOPE_MENSUAL) || 30_000,
  /** Más pesadas que esto no se mandan al modelo: quedan para revisión a mano. */
  pesoMaximo: 4_500_000,
} as const;

export type Origen = "foto" | "liga" | "diseno" | "gafete" | "verificacion";
export type Veredicto = "ok" | "revisar" | "bloquear";

export const CATEGORIAS = {
  explicito: "Desnudez o contenido sexual",
  violencia: "Violencia, sangre o armas",
  odio: "Símbolos o mensajes de odio",
  drogas: "Drogas",
  ofensivo: "Gestos o textos ofensivos",
  fuera_de_lugar: "No es lo que se pide",
  oficial: "Parece identificación o insignia oficial",
  ilegible: "No se distingue",
} as const;
export type Categoria = keyof typeof CATEGORIAS;

export type ResultadoModeracion = {
  veredicto: Veredicto;
  categorias: Categoria[];
  motivo: string;
  modelo: string | null;
};

const QUE_ES: Record<Origen, string> = {
  foto: "la foto de una persona para su gafete o credencial de empleado. Lo esperado es una foto tipo retrato de una persona real, de frente o casi de frente.",
  liga: "la foto que una persona mandó para su gafete o credencial de empleado. Lo esperado es una foto tipo retrato de una persona real, de frente o casi de frente.",
  diseno: "una imagen para el diseño de un gafete de empleado: un logotipo, un fondo, una ilustración o una foto de la empresa.",
  gafete: "el diseño completo, ya terminado, de un gafete o credencial de empleado de una empresa privada.",
  verificacion:
    "un documento para verificar una empresa: una credencial INE (frente o reverso) o una foto del negocio (fachada, local, oficina, producto o tarjeta de presentación).",
};

const INSTRUCCIONES = `Eres el filtro de contenido de LaGafetería, una tienda en México de gafetes y credenciales de empleados.
Revisas imágenes que suben los clientes y respondes solo con el JSON pedido.

Veredictos:
- "bloquear": claramente inapropiada para un gafete o un trámite: desnudez o contenido sexual, violencia gráfica o sangre, armas apuntando o glorificadas, drogas, símbolos o mensajes de odio, gestos o textos obscenos.
- "revisar": dudosa, o no es lo que se espera (por ejemplo, un meme, un animal, un paisaje o una caricatura donde se espera la foto de una persona; una imagen sin relación con un negocio donde se espera un documento), o imita una identificación o insignia oficial (escudo nacional, policía, ejército, SAT, IMSS, INE, gobierno) cuando no es un documento de verificación.
- "ok": todo lo demás. Sé tolerante: fotos con fondo no liso, lentes, gorra, poca luz, logotipos con colores fuertes, uniformes, cubrebocas o una INE real en un documento de verificación están bien.

En "motivo" escribe una frase corta en español, sin datos personales que aparezcan en la imagen (no copies nombres, CURP ni direcciones).`;

const ESQUEMA = {
  type: "object",
  properties: {
    veredicto: { type: "string", enum: ["ok", "revisar", "bloquear"] },
    categorias: { type: "array", items: { type: "string", enum: Object.keys(CATEGORIAS) } },
    motivo: { type: "string" },
  },
  required: ["veredicto", "categorias", "motivo"],
  additionalProperties: false,
} as const;

const MIME_IMAGEN = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" } as const;

export const moderacionActiva = () => Boolean(process.env.ANTHROPIC_API_KEY);

/** Revisa una imagen. Si el modelo falla, la deja para revisión a mano. */
export async function moderarImagen(
  bytes: Uint8Array,
  tipo: keyof typeof MIME_IMAGEN,
  origen: Origen,
): Promise<ResultadoModeracion> {
  if (bytes.length > moderacion.pesoMaximo) {
    return { veredicto: "revisar", categorias: [], motivo: "Muy pesada para la revisión automática.", modelo: null };
  }
  const cliente = new Anthropic({ maxRetries: 2, timeout: 30_000 });
  try {
    const respuesta = await cliente.messages.create({
      model: moderacion.modelo,
      max_tokens: 2_000,
      output_config: { effort: "low", format: { type: "json_schema", schema: ESQUEMA } },
      system: INSTRUCCIONES,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: MIME_IMAGEN[tipo], data: aBase64(bytes) } },
            { type: "text", text: `Esta imagen es ${QUE_ES[origen]}` },
          ],
        },
      ],
    });
    if (respuesta.stop_reason === "refusal") {
      return { veredicto: "revisar", categorias: [], motivo: "La revisión automática no quiso evaluarla.", modelo: moderacion.modelo };
    }
    const texto = respuesta.content.find((b) => b.type === "text");
    const datos = JSON.parse(texto?.type === "text" ? texto.text : "{}") as Partial<ResultadoModeracion>;
    const veredicto: Veredicto = datos.veredicto === "ok" || datos.veredicto === "bloquear" ? datos.veredicto : "revisar";
    const categorias = (Array.isArray(datos.categorias) ? datos.categorias : []).filter((c): c is Categoria => c in CATEGORIAS);
    return { veredicto, categorias, motivo: String(datos.motivo ?? "").slice(0, 280), modelo: moderacion.modelo };
  } catch (e) {
    console.error("Moderación:", e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : e);
    return { veredicto: "revisar", categorias: [], motivo: "La revisión automática falló; revísala a mano.", modelo: null };
  }
}

function aBase64(bytes: Uint8Array): string {
  let binario = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binario);
}
