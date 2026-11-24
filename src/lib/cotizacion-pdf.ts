/**
 * Genera el PDF de una cotización en el navegador (pdf-lib se carga solo al
 * pedir la descarga, para no pesar en la página).
 */
import { PDFDocument, type PDFFont, type PDFPage, rgb, StandardFonts } from "pdf-lib";
import {
  condiciones,
  type DatosCotizacion,
  fechaLarga,
  renglones,
  totales,
} from "./cotizacion";
import { figalo, site } from "./site";

const tinta = rgb(27 / 255, 31 / 255, 59 / 255);
const gris = rgb(92 / 255, 97 / 255, 120 / 255);
const rojo = rgb(230 / 255, 59 / 255, 46 / 255);
const papel = rgb(238 / 255, 240 / 255, 245 / 255);
const linea = rgb(220 / 255, 223 / 255, 234 / 255);

const ANCHO = 612;
const ALTO = 792;
const MARGEN = 54;

/** Parte un texto en líneas que caben en el ancho dado. */
function partir(texto: string, fuente: PDFFont, tam: number, ancho: number): string[] {
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of texto.split(" ")) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (fuente.widthOfTextAtSize(prueba, tam) > ancho && actual) {
      lineas.push(actual);
      actual = palabra;
    } else {
      actual = prueba;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

function derecha(
  pagina: PDFPage,
  texto: string,
  xDerecha: number,
  y: number,
  fuente: PDFFont,
  tam: number,
  color = tinta,
) {
  pagina.drawText(texto, {
    x: xDerecha - fuente.widthOfTextAtSize(texto, tam),
    y,
    size: tam,
    font: fuente,
    color,
  });
}

export async function generarPdfCotizacion(
  d: DatosCotizacion,
  logoPng?: ArrayBuffer,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Cotización ${d.folio} de ${site.nombre}`);
  pdf.setAuthor(site.nombre);
  pdf.setSubject("Cotización de gafetes y credenciales");
  pdf.setLanguage(site.idioma);

  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pagina = pdf.addPage([ANCHO, ALTO]);
  const derechaX = ANCHO - MARGEN;
  let y = ALTO - MARGEN;

  // Encabezado: logo a la izquierda, datos de la cotización a la derecha.
  if (logoPng) {
    const logo = await pdf.embedPng(logoPng);
    const alto = 40;
    const ancho = (logo.width / logo.height) * alto;
    pagina.drawImage(logo, { x: MARGEN, y: y - alto, width: ancho, height: alto });
  } else {
    pagina.drawText(site.nombre, { x: MARGEN, y: y - 28, size: 24, font: negrita, color: tinta });
  }
  derecha(pagina, "Cotización", derechaX, y - 16, negrita, 20);
  derecha(pagina, `Folio ${d.folio}`, derechaX, y - 32, normal, 10, gris);
  derecha(pagina, fechaLarga(d.fecha), derechaX, y - 45, normal, 10, gris);
  y -= 70;

  pagina.drawRectangle({ x: MARGEN, y, width: ANCHO - MARGEN * 2, height: 3, color: rojo });
  y -= 28;

  if (d.empresa) {
    pagina.drawText("Preparada para", { x: MARGEN, y, size: 9, font: normal, color: gris });
    y -= 15;
    pagina.drawText(d.empresa, { x: MARGEN, y, size: 13, font: negrita, color: tinta });
    y -= 28;
  }

  pagina.drawText("Gafetes y credenciales para tu equipo", {
    x: MARGEN,
    y,
    size: 13,
    font: negrita,
    color: tinta,
  });
  y -= 22;

  // Tabla de conceptos.
  const col = { concepto: MARGEN + 10, cantidad: 360, porPieza: 455, importe: derechaX - 10 };
  pagina.drawRectangle({ x: MARGEN, y: y - 8, width: ANCHO - MARGEN * 2, height: 24, color: papel });
  pagina.drawText("Concepto", { x: col.concepto, y, size: 9, font: negrita, color: tinta });
  derecha(pagina, "Cantidad", col.cantidad, y, negrita, 9);
  derecha(pagina, "Precio por pieza", col.porPieza, y, negrita, 9);
  derecha(pagina, "Importe", col.importe, y, negrita, 9);
  y -= 28;

  for (const r of renglones(d.cotizacion)) {
    pagina.drawText(r.concepto, { x: col.concepto, y, size: 10.5, font: normal, color: tinta });
    derecha(pagina, r.cantidad.toLocaleString("es-MX"), col.cantidad, y, normal, 10.5);
    derecha(pagina, r.porPieza, col.porPieza, y, normal, 10.5);
    derecha(pagina, r.importe, col.importe, y, normal, 10.5);
    y -= 10;
    pagina.drawLine({
      start: { x: MARGEN, y },
      end: { x: derechaX, y },
      thickness: 0.6,
      color: linea,
    });
    y -= 18;
  }

  // Totales, alineados a la derecha.
  y -= 4;
  for (const t of totales(d.cotizacion)) {
    const fuente = t.fuerte ? negrita : normal;
    const tam = t.fuerte ? 14 : 10.5;
    if (t.fuerte) {
      y -= 4;
      pagina.drawRectangle({ x: 330, y: y - 9, width: derechaX - 330, height: 28, color: papel });
    }
    pagina.drawText(t.etiqueta, { x: 340, y, size: tam, font: fuente, color: t.fuerte ? tinta : gris });
    derecha(pagina, t.valor, col.importe, y, fuente, tam);
    y -= t.fuerte ? 30 : 18;
  }

  // Condiciones.
  y -= 14;
  pagina.drawText("Condiciones", { x: MARGEN, y, size: 11, font: negrita, color: tinta });
  y -= 18;
  for (const c of condiciones(d)) {
    const lineas = partir(c, normal, 9.5, ANCHO - MARGEN * 2 - 14);
    pagina.drawCircle({ x: MARGEN + 3, y: y + 3, size: 1.6, color: rojo });
    for (const l of lineas) {
      pagina.drawText(l, { x: MARGEN + 14, y, size: 9.5, font: normal, color: gris });
      y -= 13;
    }
    y -= 3;
  }

  // Pie.
  pagina.drawLine({
    start: { x: MARGEN, y: MARGEN + 26 },
    end: { x: derechaX, y: MARGEN + 26 },
    thickness: 0.6,
    color: linea,
  });
  pagina.drawText(`${site.nombre} · ${site.dominio} · ${site.correo}`, {
    x: MARGEN,
    y: MARGEN + 10,
    size: 9,
    font: normal,
    color: gris,
  });
  derecha(pagina, `Powered by ${figalo.nombre}`, derechaX, MARGEN + 10, normal, 9, gris);

  return pdf.save();
}
