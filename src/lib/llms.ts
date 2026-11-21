/**
 * Contenido de /llms.txt y /llms-full.txt (formato llmstxt.org): un resumen del
 * sitio en Markdown para asistentes de IA. Se genera con los mismos datos que
 * las páginas, así que nunca se desfasa.
 */
import { faqsGenerales } from "./faqs";
import { giros } from "./giros";
import { pasos } from "./pasos";
import {
  digitalMaximo,
  digitalMinimo,
  envio,
  extraDigital,
  extraDosCaras,
  notaIva,
  pesos,
  precioMaximo,
  precioMinimo,
  rangoTexto,
  tramos,
} from "./precios";
import { accionesPlataforma } from "./plataforma";
import { rutasCiudades, rutasGiros, rutasPrincipales } from "./rutas";
import { entregaTexto, site, urlAbsoluta } from "./site";

type Enlace = { ruta: string; titulo: string; resumen: string };

const lista = (rutas: Enlace[]) =>
  rutas.map((r) => `- [${r.titulo}](${urlAbsoluta(r.ruta)}): ${r.resumen}`).join("\n");

const datosClave = () =>
  [
    `- Producto: gafetes y credenciales para empleados en tres modalidades: impreso (PVC rígido tamaño CR80, 8.6 × 5.4 cm, a una cara o por frente y vuelta), digital (en el celular, con código QR verificable) o impreso + digital.`,
    `- Precio impreso: de ${pesos(precioMinimo)} a ${pesos(precioMaximo)} MXN por pieza a una cara, ${notaIva}, según la cantidad. Frente y vuelta: ${pesos(extraDosCaras)} más por pieza.`,
    `- Precio digital: de ${pesos(digitalMinimo)} a ${pesos(digitalMaximo)} MXN por pieza, ${notaIva}. Agregar la versión digital a un gafete impreso: ${pesos(extraDigital)} más por pieza.`,
    `- Forma de pago: pago único por gafete. No hay suscripción, mensualidad ni costo por usar la plataforma.`,
    `- Pedido mínimo: ninguno, desde 1 pieza.`,
    `- Entrega: ${entregaTexto}. Entrega exprés: próximamente.`,
    `- Envío: a todo México desde ${site.estadoBase}, con tarifa única de ${pesos(envio.tarifa)} MXN; gratis en pedidos desde ${pesos(envio.gratisDesde)} MXN antes de IVA.`,
    `- Cotización: el cotizador en línea muestra precio, envío, IVA, total y entrega sin pedir datos, y permite descargar la cotización en PDF o recibirla por correo.`,
    `- Plataforma: con la cuenta, cada empresa administra ${accionesPlataforma.map((a) => a.titulo.toLowerCase()).join(", ")}.`,
    `- Cómo se pide: en línea, con plantillas o diseño propio, campos variables (nombre, puesto, número, foto, código QR), carga por Excel y vista previa de cada gafete antes de pagar.`,
    `- Factura: sí (CFDI).`,
    `- Contacto: ${site.correo}`,
  ].join("\n");

export function llmsTxt(): string {
  return `# ${site.nombre}

> ${site.nombre} es una tienda en línea mexicana dedicada exclusivamente a gafetes y credenciales para empleados. Los hace impresos en PVC o digitales. El pedido es guiado: plantilla o diseño propio, carga de datos con Excel, vista previa de cada gafete y precio con envío desde el primer paso. Envía a todo México.

Nota de vocabulario: en México, "gafete" y "credencial" se usan para la tarjeta de identificación del empleado. El "portagafete" es la funda o broche donde se coloca. ${site.nombre} hace la tarjeta, impresa o digital.

## Datos clave

${datosClave()}

## Páginas principales

${lista(rutasPrincipales)}

## Por giro

${lista(rutasGiros)}

## Por ciudad

${lista(rutasCiudades)}

## Opcional

- [Versión completa en texto](${urlAbsoluta("/llms-full.txt")}): precios, pasos y todas las preguntas frecuentes en un solo archivo.
`;
}

export function llmsFullTxt(): string {
  const tabla = [
    "| Cantidad de piezas | Impreso, una cara | Impreso, frente y vuelta | Solo digital |",
    "| --- | --- | --- | --- |",
    ...tramos.map(
      (t) =>
        `| ${rangoTexto(t)} | ${pesos(t.precio)} MXN | ${pesos(t.precio + extraDosCaras)} MXN | ${pesos(t.digital)} MXN |`,
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

Impreso + digital: ${pesos(extraDigital)} MXN más por pieza sobre el precio impreso. La plataforma para diseñar, cargar datos, revisar la vista previa y administrar al equipo no tiene costo. Envío: ${pesos(envio.tarifa)} MXN a todo México, gratis en pedidos desde ${pesos(envio.gratisDesde)} MXN antes de IVA.

## Cómo se pide

${pasos.map((p, i) => `${i + 1}. **${p.titulo}.** ${p.texto}`).join("\n")}

## Preguntas frecuentes

${preguntas(faqsGenerales)}

## Por giro

${porGiro}
`;
}
