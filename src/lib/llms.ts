/**
 * Contenido de /llms.txt y /llms-full.txt (formato llmstxt.org): un resumen del
 * sitio en Markdown para asistentes de IA. Se genera con los mismos datos que
 * las páginas, así que nunca se desfasa.
 */
import { faqsGenerales } from "./faqs";
import { giros } from "./giros";
import { pasos } from "./pasos";
import { extraDosCaras, notaIva, pesos, rangoTexto, tramos } from "./precios";
import { rutasCiudades, rutasGiros, rutasPrincipales } from "./rutas";
import { entregaTexto, site, urlAbsoluta } from "./site";

type Enlace = { ruta: string; titulo: string; resumen: string };

const lista = (rutas: Enlace[]) =>
  rutas.map((r) => `- [${r.titulo}](${urlAbsoluta(r.ruta)}): ${r.resumen}`).join("\n");

const datosClave = () =>
  [
    `- Producto: gafetes y credenciales de PVC rígido para empleados, tamaño CR80 (8.6 × 5.4 cm), impresos a color a una cara o por frente y vuelta.`,
    `- Precio: de ${pesos(Math.min(...tramos.map((t) => t.precio)))} a ${pesos(Math.max(...tramos.map((t) => t.precio)))} MXN por pieza a una cara, ${notaIva}, según la cantidad. Frente y vuelta: ${pesos(extraDosCaras)} más por pieza.`,
    `- Pedido mínimo: ninguno, desde 1 pieza.`,
    `- Entrega: ${entregaTexto}.`,
    `- Cobertura: envío por paquetería a todo México desde ${site.ciudadBase}, ${site.estadoBase}.`,
    `- Cómo se pide: en línea, con plantillas o diseño propio, campos variables (nombre, puesto, número, foto, código QR), carga por Excel y vista previa de cada gafete antes de pagar.`,
    `- Factura: sí (CFDI).`,
    `- Contacto: ${site.correo}`,
  ].join("\n");

export function llmsTxt(): string {
  return `# ${site.nombre}

> ${site.nombre} es una tienda en línea mexicana dedicada exclusivamente a gafetes y credenciales para empleados. El pedido es guiado: plantilla o diseño propio, carga de datos con Excel, vista previa de cada gafete y precio con envío desde el primer paso. Envía a todo México.

Nota de vocabulario: en México, "gafete" y "credencial" se usan para la tarjeta de identificación del empleado. El "portagafete" es la funda o broche donde se coloca. ${site.nombre} imprime la tarjeta.

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
    "| Cantidad de piezas | Una cara | Frente y vuelta |",
    "| --- | --- | --- |",
    ...tramos.map(
      (t) =>
        `| ${rangoTexto(t)} | ${pesos(t.precio)} MXN | ${pesos(t.precio + extraDosCaras)} MXN |`,
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

El software para diseñar, cargar datos y revisar la vista previa no tiene costo. El envío se cotiza según el código postal.

## Cómo se pide

${pasos.map((p, i) => `${i + 1}. **${p.titulo}.** ${p.texto}`).join("\n")}

## Preguntas frecuentes

${preguntas(faqsGenerales)}

## Por giro

${porGiro}
`;
}
