import qrcode from "qrcode-generator";

// Acentos y eñes: sin esto la librería codifica en Latin-1 y los lectores muestran basura.
qrcode.stringToBytes = (texto: string) => Array.from(new TextEncoder().encode(texto));

/** Módulos de margen blanco alrededor del código, para que los lectores lo encuentren. */
export const MARGEN_QR = 2;

const cache = new Map<string, { lado: number; trazo: string } | null>();

/**
 * Convierte un texto en un código QR: `lado` es cuántos módulos mide por lado
 * (ya con margen) y `trazo` es un path SVG en esas unidades. Devuelve null si
 * el texto está vacío o no cabe en un código QR.
 */
export function codigoQr(texto: string): { lado: number; trazo: string } | null {
  const limpio = texto.trim();
  if (!limpio) return null;
  const guardado = cache.get(limpio);
  if (guardado !== undefined) return guardado;
  let resultado: { lado: number; trazo: string } | null = null;
  try {
    const qr = qrcode(0, "M");
    qr.addData(limpio, "Byte");
    qr.make();
    const n = qr.getModuleCount();
    const partes: string[] = [];
    for (let f = 0; f < n; f++) {
      // Une los módulos seguidos de cada renglón en un solo rectángulo.
      for (let c = 0; c < n; c++) {
        if (!qr.isDark(f, c)) continue;
        let fin = c;
        while (fin + 1 < n && qr.isDark(f, fin + 1)) fin++;
        partes.push(`M${c + MARGEN_QR} ${f + MARGEN_QR}h${fin - c + 1}v1h-${fin - c + 1}z`);
        c = fin;
      }
    }
    resultado = { lado: n + MARGEN_QR * 2, trazo: partes.join("") };
  } catch {
    resultado = null;
  }
  if (cache.size > 500) cache.clear();
  cache.set(limpio, resultado);
  return resultado;
}
