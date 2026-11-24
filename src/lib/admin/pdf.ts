import { degrees, PDFDocument, type PDFImage } from "pdf-lib";
import { revisarGafete } from "@/lib/cuenta/listos";
import { medidas } from "@/lib/materiales";

/**
 * PDF de impresión: una página por cara, del tamaño exacto de la tarjeta CR80
 * y de orilla a orilla, para mandarlo tal cual a la impresora de credenciales.
 */

const PUNTOS_POR_MM = 72 / 25.4;

export type Pagina =
  /** Cara dibujada desde un diseño: PNG a tamaño de corte. */
  | { tipo: "dibujo"; png: Uint8Array; vertical: boolean; girar: boolean }
  /** Gafete terminado que subió la empresa: se usa su archivo original. */
  | { tipo: "listo"; bytes: Uint8Array; formato: "jpg" | "png"; ancho: number; alto: number; girar: boolean }
  /** Página en blanco, para no perder el par frente y vuelta. */
  | { tipo: "blanca"; vertical: boolean };

const tamanoPagina = (vertical: boolean): [number, number] =>
  vertical
    ? [medidas.alto * PUNTOS_POR_MM, medidas.ancho * PUNTOS_POR_MM]
    : [medidas.ancho * PUNTOS_POR_MM, medidas.alto * PUNTOS_POR_MM];

export async function armarPdf(paginas: Pagina[], titulo: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(titulo);
  pdf.setProducer("LaGafetería");
  pdf.setCreator("LaGafetería");

  for (const p of paginas) {
    if (p.tipo === "blanca") {
      pdf.addPage(tamanoPagina(p.vertical));
      continue;
    }
    let imagen: PDFImage;
    let vertical: boolean;
    /** Cuánto sale la imagen de la página por cada lado, en proporción al corte. */
    let ancho: number;
    let alto: number;
    if (p.tipo === "dibujo") {
      imagen = await pdf.embedPng(p.png);
      vertical = p.vertical;
      [ancho, alto] = tamanoPagina(vertical);
    } else {
      imagen = p.formato === "png" ? await pdf.embedPng(p.bytes) : await pdf.embedJpg(p.bytes);
      vertical = p.alto > p.ancho;
      const [w, h] = tamanoPagina(vertical);
      const medida = revisarGafete(p.ancho, p.alto).medida;
      if (medida === "con_margen") {
        // Trae margen de corte: sobresale por los cuatro lados y la página lo recorta.
        const margen = medidas.sangrado * PUNTOS_POR_MM;
        ancho = w + margen * 2;
        alto = h + margen * 2;
      } else if (medida === "al_corte") {
        ancho = w;
        alto = h;
      } else {
        // Proporción no exacta: llena la tarjeta y se recorta lo que sobra, centrado.
        const escala = Math.max(w / p.ancho, h / p.alto);
        ancho = p.ancho * escala;
        alto = p.alto * escala;
      }
    }
    const [w, h] = tamanoPagina(vertical);
    const pagina = pdf.addPage([w, h]);
    const x = (w - ancho) / 2;
    const y = (h - alto) / 2;
    if (p.girar) {
      // Media vuelta alrededor del centro de la página.
      pagina.drawImage(imagen, { x: x + ancho, y: y + alto, width: ancho, height: alto, rotate: degrees(180) });
    } else {
      pagina.drawImage(imagen, { x, y, width: ancho, height: alto });
    }
  }
  return pdf.save();
}
