import { dibujarCara } from "@/lib/admin/lienzo";
import type { GafeteDigital } from "@/lib/cuenta/gafete-digital";
import { letrasListas } from "@/lib/diseno/texto";

/**
 * Imagen descargable del gafete digital, armada en el navegador con el mismo
 * dibujo que el PDF de impresión. Es una copia: lleva marca de agua con la
 * fecha y una franja que dice que la vigencia solo se comprueba con el QR.
 * Así, una captura vieja no sirve para presumir un gafete vencido: quien lo
 * escanea ve el estado de hoy.
 */

const DPI = 360;
const MARGEN = 48;
const ENTRE = 36;
const RADIO = 34;

async function bajarImagen(url: string): Promise<ImageBitmap> {
  const respuesta = await fetch(url);
  if (!respuesta.ok) throw new Error("sin imagen");
  return createImageBitmap(await respuesta.blob(), { imageOrientation: "from-image" });
}

/** Las caras del gafete ya dibujadas, frente y (si lleva) reverso. */
async function caras(gafete: GafeteDigital): Promise<(HTMLCanvasElement | ImageBitmap)[]> {
  if (gafete.tipo === "listos") {
    return Promise.all([gafete.frente, gafete.vuelta].filter((u): u is string => Boolean(u)).map(bajarImagen));
  }
  const letras = await letrasListas();
  if (!letras) throw new Error("sin letras");
  const [imagenes, foto] = await Promise.all([
    Promise.all(Object.entries(gafete.imagenes).map(async ([ruta, url]) => [ruta, await bajarImagen(url)] as const)).then(
      Object.fromEntries,
    ),
    gafete.foto ? bajarImagen(gafete.foto) : Promise.resolve(null),
  ]);
  const datos = { datos: gafete.datos, etiquetas: gafete.etiquetas, qr: gafete.qr, foto, imagenes };
  const { diseno } = gafete;
  return [diseno.frente, diseno.vuelta]
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .map((cara) => dibujarCara(cara, diseno.orientacion, datos, letras, DPI));
}

const fechaLarga = (d: Date) =>
  d.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Hermosillo" });
const fechaCorta = (d: Date) =>
  d.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Hermosillo" });

/** Parte un texto en renglones que quepan en `ancho`. */
function renglones(ctx: CanvasRenderingContext2D, texto: string, ancho: number): string[] {
  const salida: string[] = [];
  let actual = "";
  for (const palabra of texto.split(/\s+/)) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (ctx.measureText(prueba).width > ancho && actual) {
      salida.push(actual);
      actual = palabra;
    } else actual = prueba;
  }
  if (actual) salida.push(actual);
  return salida;
}

/** Arma el PNG: las caras una debajo de otra, con marca de agua y la franja de aviso. */
export async function imagenDelGafete(gafete: GafeteDigital): Promise<Blob> {
  const [dibujos, letras] = await Promise.all([caras(gafete), letrasListas()]);
  if (!dibujos.length) throw new Error("sin caras");
  const familia = letras?.familias.inter ?? "system-ui, sans-serif";
  const ancho = Math.max(...dibujos.map((d) => d.width));
  const altoCaras = dibujos.reduce((suma, d) => suma + Math.round((d.height * ancho) / d.width), 0);
  const hoy = new Date();

  const lienzo = document.createElement("canvas");
  const ctx = lienzo.getContext("2d");
  if (!ctx) throw new Error("sin lienzo");
  const anchoTotal = ancho + MARGEN * 2;
  const letra = Math.round(anchoTotal / 30);
  ctx.font = `600 ${letra}px ${familia}`;
  const aviso = gafete.verificable
    ? "Copia sin validez por sí sola. La vigencia se comprueba escaneando el código QR."
    : `Copia sin validez por sí sola. La vigencia la confirma ${gafete.empresa}.`;
  const lineasAviso = renglones(ctx, aviso, ancho);
  const altoFranja = Math.round(letra * 1.5 * (lineasAviso.length + 1) + MARGEN);

  lienzo.width = anchoTotal;
  lienzo.height = MARGEN + altoCaras + ENTRE * (dibujos.length - 1) + MARGEN + altoFranja;
  ctx.fillStyle = "#EEF0F5";
  ctx.fillRect(0, 0, lienzo.width, lienzo.height);

  // Las caras, con esquinas redondeadas como la tarjeta de verdad.
  let y = MARGEN;
  for (const d of dibujos) {
    const alto = Math.round((d.height * ancho) / d.width);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(MARGEN, y, ancho, alto, RADIO);
    ctx.clip();
    ctx.drawImage(d, MARGEN, y, ancho, alto);
    ctx.restore();
    ctx.strokeStyle = "rgba(20,24,38,0.15)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(MARGEN, y, ancho, alto, RADIO);
    ctx.stroke();
    if (d instanceof ImageBitmap) d.close();
    y += alto + ENTRE;
  }

  // Marca de agua: «COPIA · fecha» en diagonal, tenue para no estorbar al QR.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, lienzo.width, MARGEN + altoCaras + ENTRE * (dibujos.length - 1));
  ctx.clip();
  ctx.translate(lienzo.width / 2, (MARGEN + altoCaras) / 2);
  ctx.rotate(-Math.PI / 7);
  ctx.font = `800 ${Math.round(letra * 1.6)}px ${familia}`;
  ctx.fillStyle = "rgba(20,24,38,0.09)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const marca = `COPIA · ${fechaCorta(hoy)}`;
  const paso = Math.round(letra * 4.2);
  const largo = Math.hypot(lienzo.width, lienzo.height);
  for (let fila = -largo; fila <= largo; fila += paso) {
    const corrimiento = (Math.round(fila / paso) % 2) * (ctx.measureText(marca).width * 0.6);
    for (let x = -largo; x <= largo; x += ctx.measureText(marca).width * 1.2) ctx.fillText(marca, x + corrimiento, fila);
  }
  ctx.restore();

  // Franja de aviso al pie.
  const yFranja = lienzo.height - altoFranja;
  ctx.fillStyle = "#141826";
  ctx.fillRect(0, yFranja, lienzo.width, altoFranja);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = `700 ${letra}px ${familia}`;
  let yTexto = yFranja + MARGEN / 2;
  ctx.fillText(`Descargado el ${fechaLarga(hoy)} · ${gafete.empresa}`, MARGEN, yTexto, ancho);
  ctx.font = `400 ${letra}px ${familia}`;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  for (const linea of lineasAviso) {
    yTexto += letra * 1.5;
    ctx.fillText(linea, MARGEN, yTexto, ancho);
  }

  return new Promise((resolver, rechazar) =>
    lienzo.toBlob((b) => (b ? resolver(b) : rechazar(new Error("sin imagen"))), "image/png"),
  );
}

/** «gafete-ana-lopez.png» */
export function nombreDeArchivo(nombre: string): string {
  const limpio = nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `gafete${limpio ? `-${limpio}` : ""}.png`;
}
