import { PESO_MAXIMO_CONSTANCIA, TIPOS_CONSTANCIA, type TipoConstancia } from "@/lib/cuenta/constancia";

/** Lo que dicen los campos de archivo de la verificación. */
export const FORMATOS_VERIFICACION = "PNG, JPG, JPEG, HEIC o PDF, de hasta 5 MB";
export const ACEPTA_VERIFICACION =
  "image/png,image/jpeg,image/heic,image/heif,application/pdf,.png,.jpg,.jpeg,.heic,.heif,.pdf";

const esHeic = (a: File) => /image\/hei[cf]/i.test(a.type) || /\.hei[cf]$/i.test(a.name);

/**
 * Deja el archivo listo para subir: si es HEIC (fotos de iPhone) lo convierte
 * a JPG en el navegador, para que se pueda ver en cualquier computadora.
 * Devuelve el archivo o un error en palabras para la persona.
 */
export async function prepararArchivo(a: File, nombre: string): Promise<{ archivo: File } | { error: string }> {
  let archivo = a;
  if (esHeic(a)) {
    if (a.size > 5 * PESO_MAXIMO_CONSTANCIA) return { error: `${mayuscula(nombre)} pesa demasiado. Sube un archivo más ligero.` };
    try {
      const { default: heic2any } = await import("heic2any");
      const resultado = await heic2any({ blob: a, toType: "image/jpeg", quality: 0.85 });
      const blob = Array.isArray(resultado) ? resultado[0] : resultado;
      archivo = new File([blob], a.name.replace(/\.hei[cf]$/i, "") + ".jpg", { type: "image/jpeg" });
    } catch {
      return { error: `No pudimos abrir ${nombre}. Tómale una captura de pantalla y súbela en PNG o JPG.` };
    }
  }
  // Una foto muy pesada (pasa con las de celular) se achica en lugar de rechazarse.
  if (archivo.size > PESO_MAXIMO_CONSTANCIA && archivo.type.startsWith("image/")) archivo = (await achicar(archivo)) ?? archivo;
  if (!(archivo.type in TIPOS_CONSTANCIA)) return { error: `Sube ${nombre} en ${FORMATOS_VERIFICACION.replace(", de hasta 5 MB", "")}.` };
  if (archivo.size > PESO_MAXIMO_CONSTANCIA) return { error: `${mayuscula(nombre)} pesa más de 5 MB. Sube un archivo más ligero.` };
  return { archivo };
}

/** La imagen a lo mucho de 2400 px por lado, en JPG. Null si el navegador no puede. */
async function achicar(a: File): Promise<File | null> {
  try {
    const imagen = await createImageBitmap(a);
    const escala = Math.min(1, 2400 / Math.max(imagen.width, imagen.height));
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.round(imagen.width * escala);
    lienzo.height = Math.round(imagen.height * escala);
    lienzo.getContext("2d")?.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
    const blob = await new Promise<Blob | null>((listo) => lienzo.toBlob(listo, "image/jpeg", 0.85));
    return blob ? new File([blob], a.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }) : null;
  } catch {
    return null;
  }
}

export const extensionDe = (a: File) => TIPOS_CONSTANCIA[a.type as TipoConstancia];

const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
