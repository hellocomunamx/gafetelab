/**
 * Revisión de archivos por su contenido real (los primeros bytes), no por la
 * extensión ni por lo que diga el navegador: un .jpg que en realidad es un
 * programa o una página web no pasa.
 */
export type TipoReal = "jpeg" | "png" | "webp" | "gif" | "heic" | "pdf" | "zip" | "xml" | "otro";

const empieza = (b: Uint8Array, firma: number[], desde = 0) => firma.every((x, i) => b[desde + i] === x);
const texto = (b: Uint8Array, desde: number, largo: number) => String.fromCharCode(...b.subarray(desde, desde + largo));

export function tipoReal(b: Uint8Array): TipoReal {
  if (empieza(b, [0xff, 0xd8, 0xff])) return "jpeg";
  if (empieza(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (texto(b, 0, 4) === "RIFF" && texto(b, 8, 4) === "WEBP") return "webp";
  if (texto(b, 0, 4) === "GIF8") return "gif";
  if (texto(b, 4, 4) === "ftyp" && /^(hei[cxsm]|hev[cx]|mif1|msf1)$/.test(texto(b, 8, 4))) return "heic";
  // El encabezado %PDF- puede venir después de unos bytes de basura; se aceptan hasta 1 KB.
  if (texto(b, 0, Math.min(b.length, 1024)).includes("%PDF-")) return "pdf";
  if (empieza(b, [0x50, 0x4b, 0x03, 0x04])) return "zip";
  if (/^\s*<\?xml/.test(texto(b, 0, 64).replace(/^﻿|^ï»¿/, ""))) return "xml";
  return "otro";
}

export const MIME: Partial<Record<TipoReal, string>> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

/** Qué se acepta en cada almacén (bucket) de Supabase. */
export const TIPOS_POR_ALMACEN: Record<string, TipoReal[]> = {
  fotos: ["jpeg", "png", "webp"],
  disenos: ["jpeg", "png", "webp"],
  gafetes: ["jpeg", "png"],
  constancias: ["pdf", "jpeg", "png"],
};

export const ALMACENES_REVISADOS = Object.keys(TIPOS_POR_ALMACEN);

export const esImagen = (t: TipoReal) => t === "jpeg" || t === "png" || t === "webp";

/**
 * ¿El PDF trae algo que se ejecuta al abrirlo? Una constancia del SAT no trae
 * JavaScript, acciones de lanzar programas ni archivos incrustados.
 */
export function pdfPeligroso(b: Uint8Array): string | null {
  // latin1: cada byte es un carácter, sin errores por bytes binarios.
  const t = new TextDecoder("latin1").decode(b);
  if (/\/(JavaScript|JS)\b/.test(t)) return "El PDF trae código (JavaScript).";
  if (/\/Launch\b/.test(t)) return "El PDF intenta abrir programas.";
  if (/\/(EmbeddedFiles?|RichMedia)\b/.test(t)) return "El PDF trae archivos incrustados.";
  return null;
}

/**
 * Quita los metadatos de un JPEG (EXIF con ubicación GPS, modelo de celular,
 * XMP, IPTC y comentarios) sin volver a comprimir la imagen. Devuelve null si
 * no traía nada que quitar o si el archivo no se puede recorrer.
 */
export function quitarMetadatosJpeg(b: Uint8Array): Uint8Array | null {
  if (!empieza(b, [0xff, 0xd8])) return null;
  const partes: Uint8Array[] = [b.subarray(0, 2)];
  let i = 2;
  let quito = false;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) return null;
    const marca = b[i + 1];
    // Inicio de los datos de la imagen: de aquí al final se copia tal cual.
    if (marca === 0xda) {
      partes.push(b.subarray(i));
      break;
    }
    const largo = (b[i + 2] << 8) | b[i + 3];
    if (largo < 2 || i + 2 + largo > b.length) return null;
    // APP1 (EXIF/XMP), APP13 (IPTC) y COM (comentarios) se van; APP0, APP2 (color) y el resto se quedan.
    if (marca === 0xe1 || marca === 0xed || marca === 0xfe) quito = true;
    else partes.push(b.subarray(i, i + 2 + largo));
    i += 2 + largo;
  }
  if (!quito) return null;
  const total = partes.reduce((s, p) => s + p.length, 0);
  const salida = new Uint8Array(total);
  let pos = 0;
  for (const p of partes) {
    salida.set(p, pos);
    pos += p.length;
  }
  return salida;
}
