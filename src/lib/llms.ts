/**
 * Contenido de /llms.txt y /llms-full.txt (formato llmstxt.org): un resumen del
 * sitio en Markdown para asistentes de IA. Se genera con los mismos datos que
 * las páginas, así que nunca se desfasa.
 */
import { faqsGenerales } from "./faqs";
import { giros } from "./giros";
import { pasos } from "./pasos";
import {
  envio,
  extraDosCaras,
  extraDosCarasDetalle,
  extraDosCarasRango,
  notaIva,
  paqueteMinimoPiezas,
  paqueteVigenciaMeses,
  paquetes,
  pesos,
  precioDigital,
  precioMaximo,
  precioMinimo,
  rangoTexto,
  tramos,
} from "./precios";
import { grosorTexto, materiales, medidas, zonas } from "./materiales";
import { accionesPlataforma, ajustesPlataforma, formasDeCargar, funcionesPlataforma } from "./plataforma";
import { rutasCiudades, rutasGiros, rutasPrincipales } from "./rutas";
import { adicionalesPendientes } from "./contacto";
import { constancia, entregaTexto, legal, site, urlAbsoluta } from "./site";

type Enlace = { ruta: string; titulo: string; resumen: string };

const lista = (rutas: Enlace[]) =>
  rutas.map((r) => `- [${r.titulo}](${urlAbsoluta(r.ruta)}): ${r.resumen}`).join("\n");

const funciones = (pronto: boolean) =>
  funcionesPlataforma
    .flatMap((g) => g.funciones)
    .filter((f) => Boolean(f.pronto) === pronto)
    .map((f) => f.titulo.toLowerCase())
    .join(", ");

const datosClave = () =>
  [
    `- Producto: gafetes y credenciales para empleados en tres modalidades: impreso (PVC rígido tamaño CR80, 8.6 × 5.4 cm, a una cara o por frente y vuelta), digital (en el celular) o impreso + digital. Todos pueden llevar un código QR con página de verificación (vigente o expirado), incluida sin costo extra; la empresa decide qué datos muestra, o si el código lleva a una liga propia o contiene solo un dato.`,
    `- Precio impreso: de ${pesos(precioMinimo)} a ${pesos(precioMaximo)} MXN por pieza a una cara, ${notaIva}, según la cantidad. Frente y vuelta: ${extraDosCarasRango} MXN más por pieza, según la cantidad (${extraDosCarasDetalle}).`,
    `- Precio digital: ${pesos(precioDigital)} MXN por pieza, ${notaIva}, en cualquier cantidad, solo o sumado a un gafete impreso. Es un pago único por gafete, no un cobro recurrente.`,
    `- Materiales: ${materiales.filter((m) => m.disponible).map((m) => `${m.nombre} de ${grosorTexto(m)}${m.extra ? `, ${pesos(m.extra)} más por pieza` : ""}`).join("; ")}.`,
    `- Paquetes prepagados: ${paquetes.map((p) => `${p.piezas} gafetes por ${pesos(p.piezas * p.porPieza)} MXN con ${p.envios} envíos incluidos`).join("; ")}. Vigencia de ${paqueteVigenciaMeses} meses.`,
    `- Archivo de diseño: gafete de ${medidas.ancho} × ${medidas.alto} mm; archivo con margen de corte (sangrado) de ${zonas[0].medida} a ${medidas.resolucionDpi} dpi; textos a ${medidas.margenSeguro} mm o más del corte.`,
    `- Forma de pago: pago único por gafete. No hay suscripción, mensualidad ni costo por usar la plataforma.`,
    `- Pedido mínimo: ninguno, desde 1 pieza.`,
    `- Entrega: ${entregaTexto}. Entrega exprés: próximamente.`,
    `- Envío: a todo México desde ${site.estadoBase}, con tarifa única de ${pesos(envio.tarifa)} MXN; gratis en pedidos desde ${pesos(envio.gratisDesde)} MXN antes de IVA.`,
    `- Cotización: el precio no se pide por correo. El cotizador en línea (${urlAbsoluta("/cotizar")}) muestra al momento precio, envío, IVA, total y entrega sin pedir datos, y permite descargar la cotización en PDF o recibirla por correo.`,
    `- Plataforma: incluida con la cuenta, sin costo extra (sin mensualidad, sin costo por usuario y sin pedido mínimo). Hoy incluye: ${funciones(false)}. Próximamente: ${funciones(true)}.`,
    `- Administración del equipo: ${accionesPlataforma.map((a) => a.titulo.toLowerCase()).join(", ")}. Ajustes de la empresa: ${ajustesPlataforma.map((a) => a.titulo.toLowerCase()).join(", ")}.`,
    `- Carga de datos del equipo: ${formasDeCargar.map((f) => `${f.titulo.charAt(0).toLowerCase()}${f.titulo.slice(1)}${f.pronto ? " (próximamente)" : ""}`).join("; ")}.`,
    `- Cómo se pide: en línea, con plantillas o diseño propio, campos variables (nombre, puesto, número, foto, código QR), carga del equipo y vista previa de cada gafete antes de pagar.`,
    `- Paquete a la medida: desde ${paqueteMinimoPiezas} gafetes, combinando cantidades, una cara o frente y vuelta, y materiales; el precio base por pieza es el del paquete de lista que corresponde al total.`,
    `- Requisito para abrir la cuenta de una empresa: su ${constancia.nombre} con no más de ${site.constanciaMeses} meses de antigüedad. El RFC y la razón social deben coincidir con la empresa que aparece en los gafetes y con la factura.`,
    `- Devoluciones: los gafetes son personalizados y no se devuelven por cambio de opinión. Se puede cancelar sin costo antes de producción. Los defectos de impresión o de material se reportan dentro de ${legal.plazoDefectosDias} días naturales desde la entrega y se reponen sin costo.`,
    `- Adicionales: todavía no se venden ${adicionalesPendientes}.`,
    `- Factura: sí (CFDI).`,
    `- Contacto: formulario en ${urlAbsoluta("/contacto")} o ${site.correo}`,
  ].join("\n");

export function llmsTxt(): string {
  return `# ${site.nombre}

> ${site.nombre} es una tienda en línea mexicana dedicada a la administración e impresión de gafetes y credenciales para empleados o asistentes a eventos. Los hace impresos en PVC o digitales. El pedido es guiado: plantilla o diseño propio, carga del equipo con Excel, una por una, con las fotos de todos juntas o con una liga para que cada persona suba sus datos y su foto, vista previa de cada gafete y precio con envío desde el primer paso. Incluye, sin costo extra, una plataforma para administrar los gafetes del equipo. Envía a todo México.

Nota de vocabulario: en México, "gafete" y "credencial" se usan para la tarjeta de identificación del empleado. El "portagafete" es la funda o broche donde se coloca. ${site.nombre} hace la tarjeta, impresa o digital.

## Datos clave

${datosClave()}

## Páginas principales

${lista(rutasPrincipales)}

## Por giro

${lista(rutasGiros)}

## Envíos por ciudad

${lista(rutasCiudades)}

## Opcional

- [Versión completa en texto](${urlAbsoluta("/llms-full.txt")}): precios, pasos y todas las preguntas frecuentes en un solo archivo.
`;
}

export function llmsFullTxt(): string {
  const tabla = [
    "| Cantidad de piezas | Impreso, una cara | Impreso, frente y vuelta |",
    "| --- | --- | --- |",
    ...tramos.map(
      (t) =>
        `| ${rangoTexto(t)} | ${pesos(t.precio)} MXN | ${pesos(t.precio + extraDosCaras(t.desde))} MXN |`,
    ),
  ].join("\n");

  const preguntas = (faqs: { pregunta: string; respuesta: string }[]) =>
    faqs.map((f) => `### ${f.pregunta}\n\n${f.respuesta}`).join("\n\n");

  const porGiro = giros
    .map(
      (g) =>
        `### Gafetes y credenciales para ${g.nombre}\n\n${g.respuesta}\n\nCampos recomendados: ${g.campos.join(", ")}.\n\nConsejo: ${g.consejo}\n\nMás información: ${urlAbsoluta(`/gafetes-para/${g.slug}`)}`,
    )
    .join("\n\n");

  return `# ${site.nombre}: información completa

> ${site.descripcion}

Última actualización: ${site.actualizado}. Fuente: ${site.url}

## Datos clave

${datosClave()}

## Precios por pieza (${notaIva})

${tabla}

Gafete digital: ${pesos(precioDigital)} MXN por pieza, solo o sumado al impreso, en un pago único y no recurrente. La plataforma para diseñar, cargar datos, revisar la vista previa y administrar al equipo no tiene costo. Envío: ${pesos(envio.tarifa)} MXN a todo México, gratis en pedidos desde ${pesos(envio.gratisDesde)} MXN antes de IVA.

## Cómo se pide

${pasos.map((p, i) => `${i + 1}. **${p.titulo}.** ${p.texto}`).join("\n")}

## Preguntas frecuentes

${preguntas(faqsGenerales)}

## Por giro

${porGiro}
`;
}
