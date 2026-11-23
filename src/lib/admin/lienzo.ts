import { textoDe } from "@/components/diseno/GafeteSvg";
import { acomodar, INTERLINEA, type Letras } from "@/lib/diseno/texto";
import { type Cara, type Orientacion, tamano } from "@/lib/diseno/tipos";
import { medidas } from "@/lib/materiales";
import { codigoQr } from "@/lib/qr";

/**
 * Dibuja una cara del gafete en un lienzo, a tamaño de impresión y de orilla a
 * orilla (sin esquinas redondeadas ni contorno). Es el mismo dibujo que
 * `GafeteSvg`, con las mismas letras y el mismo acomodo del texto: si cambia
 * uno, hay que cambiar el otro.
 *
 * A diferencia de la vista previa, lo que falta no se rellena: sin fotografía
 * o sin dato para el código QR, ese espacio se queda con el fondo del diseño.
 */

export type DatosDeCara = {
  datos: Record<string, string>;
  etiquetas: Record<string, string>;
  /** Lo que lleva escrito el código QR. Vacío: no se dibuja. */
  qr: string;
  foto: ImageBitmap | null;
  /** Imágenes del diseño ya cargadas, por ruta. */
  imagenes: Record<string, ImageBitmap>;
};

const MM_POR_PULGADA = 25.4;

export function dibujarCara(
  cara: Cara,
  orientacion: Orientacion,
  { datos, etiquetas, qr, foto, imagenes }: DatosDeCara,
  letras: Letras,
  dpi: number,
): HTMLCanvasElement {
  const { w, h } = tamano(orientacion);
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.round((w / MM_POR_PULGADA) * dpi);
  lienzo.height = Math.round((h / MM_POR_PULGADA) * dpi);
  const ctx = lienzo.getContext("2d");
  if (!ctx) throw new Error("sin lienzo");
  // Pixeles por milímetro en cada eje: todo el diseño está en milímetros.
  const kx = lienzo.width / w;
  const ky = lienzo.height / h;
  const enMm = () => ctx.setTransform(kx, 0, 0, ky, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  enMm();

  /** Llena la caja recortando lo que sobra (como `slice` en SVG). */
  const cubrir = (img: ImageBitmap, x: number, y: number, ancho: number, alto: number, arriba = false) => {
    const escala = Math.max(ancho / img.width, alto / img.height);
    const sw = ancho / escala;
    const sh = alto / escala;
    ctx.drawImage(img, (img.width - sw) / 2, arriba ? 0 : (img.height - sh) / 2, sw, sh, x, y, ancho, alto);
  };
  /** Cabe completa dentro de la caja, centrada (como `meet` en SVG). */
  const contener = (img: ImageBitmap, x: number, y: number, ancho: number, alto: number) => {
    const escala = Math.min(ancho / img.width, alto / img.height);
    const dw = img.width * escala;
    const dh = img.height * escala;
    ctx.drawImage(img, x + (ancho - dw) / 2, y + (alto - dh) / 2, dw, dh);
  };

  const s = medidas.sangrado;
  ctx.fillStyle = cara.fondo;
  ctx.fillRect(0, 0, w, h);
  const fondo = cara.imagen ? imagenes[cara.imagen] : undefined;
  if (fondo) cubrir(fondo, -s, -s, w + s * 2, h + s * 2);

  for (const e of cara.elementos) {
    if (e.tipo === "forma") {
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.roundRect(e.x, e.y, e.w, e.h, Math.min(e.radio, e.w / 2, e.h / 2));
      ctx.fill();
    } else if (e.tipo === "imagen") {
      const img = imagenes[e.ruta];
      if (!img) continue;
      if (e.ajuste === "cubrir") cubrir(img, e.x, e.y, e.w, e.h);
      else contener(img, e.x, e.y, e.w, e.h);
    } else if (e.tipo === "qr") {
      const real = qr ? codigoQr(qr) : null;
      if (!real) continue;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(e.x, e.y, e.w, e.w);
      // Cada módulo cae en pixeles enteros: orillas nítidas, sin grises.
      const lado = Math.max(real.lado, Math.floor((e.w * kx) / real.lado) * real.lado);
      const modulo = lado / real.lado;
      const x0 = Math.round(e.x * kx + (e.w * kx - lado) / 2);
      const y0 = Math.round(e.y * ky + (e.w * ky - lado) / 2);
      ctx.setTransform(modulo, 0, 0, modulo, x0, y0);
      ctx.fillStyle = "#000000";
      ctx.fill(new Path2D(real.trazo));
      enMm();
    } else if (e.tipo === "foto") {
      if (!foto) continue;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(e.x, e.y, e.w, e.h, Math.min(e.radio, e.w / 2, e.h / 2));
      ctx.clip();
      cubrir(foto, e.x, e.y, e.w, e.h, true);
      ctx.restore();
    } else {
      const texto = textoDe(e, datos, etiquetas);
      if (!texto.trim()) continue;
      const { lineas, tam } = acomodar(texto, e, e.tam, e.fuente, e.negrita, letras.medir);
      const x = e.alinear === "centro" ? e.x + e.w / 2 : e.alinear === "derecha" ? e.x + e.w : e.x;
      // Las letras se dibujan en pixeles, sin escala, para que salgan a su tamaño real.
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.font = `${e.negrita ? 700 : 400} ${tam * ky}px ${letras.familias[e.fuente]}`;
      ctx.fillStyle = e.color;
      ctx.textBaseline = "alphabetic";
      ctx.textAlign = e.alinear === "centro" ? "center" : e.alinear === "derecha" ? "right" : "left";
      lineas.forEach((linea, i) => ctx.fillText(linea, x * kx, (e.y + tam * 0.88 + i * tam * INTERLINEA) * ky));
      enMm();
    }
  }
  return lienzo;
}

export const aPng = (lienzo: HTMLCanvasElement) =>
  new Promise<Uint8Array>((resolver, rechazar) =>
    lienzo.toBlob(async (b) => (b ? resolver(new Uint8Array(await b.arrayBuffer())) : rechazar(new Error("sin imagen"))), "image/png"),
  );
