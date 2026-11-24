/**
 * Lo que se cuenta de los eventos en las páginas públicas, en llms.txt, en las
 * preguntas frecuentes y en Gafi. Los números salen de `eventos.ts` y de
 * `precios.ts`, así que si cambia una regla o un precio, cambia en todos lados.
 */
import { categoriasBase, diasParaBorrarDatos, tiposEvento } from "./eventos";
import { notaIva, pesos, precioCordon } from "./precios";

/** "asistente, ponente, staff, prensa, expositor y organizador". */
export const categoriasEjemplo = (() => {
  const nombres = categoriasBase.map((c) => c.nombre.toLowerCase());
  return `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
})();

/** Los tipos de evento con página propia de ayuda: todos menos «Otro». */
export const tiposEventoPublico = tiposEvento.filter((t) => t.id !== "otro");

/** "congreso o convención; conferencia, foro o seminario; …". */
export const tiposEventoTexto = tiposEventoPublico.map((t) => t.nombre.toLowerCase()).join("; ");

/** Lo que suma un evento a la plataforma, en el orden en que se usa. */
export const funcionesEvento: { titulo: string; texto: string }[] = [
  {
    titulo: "Un proyecto por evento",
    texto:
      "Cada congreso, expo o capacitación vive aparte dentro de tu organización, con sus asistentes, sus diseños y sus pedidos. Quien administra tu organización también administra sus eventos.",
  },
  {
    titulo: "Categorías con color",
    texto: `Empiezas con ${categoriasEjemplo}, y puedes quitar, renombrar o agregar las tuyas. Cada categoría tiene su color y su propio diseño de gafete.`,
  },
  {
    titulo: "Fecha límite para pedir a tiempo",
    texto:
      "Al capturar las fechas del evento te sugerimos el último día para pedir y recibir antes de que empiece, y te lo recordamos en tu resumen.",
  },
  {
    titulo: "Cordón del color de cada categoría",
    texto: `Agrega a tu pedido un cordón con broche por gafete impreso, del color de la categoría de cada persona: ${pesos(precioCordon)} por pieza, ${notaIva}.`,
  },
  {
    titulo: "Código QR de acceso",
    texto:
      "Al escanear el gafete se ve si la persona tiene acceso, su categoría y las fechas del evento. El código deja de valer al terminar el último día.",
  },
  {
    titulo: "Datos que se borran solos",
    texto: `Los nombres, las fotografías y los datos de tus asistentes se eliminan ${diasParaBorrarDatos} días después del último día del evento. Tus pedidos y tus facturas se conservan.`,
  },
];

/** Un párrafo con todo lo anterior, para llms.txt y Gafi. */
export const eventosResumen = `dentro de la cuenta de una organización se crean eventos como proyectos aparte (${tiposEventoTexto}; o cualquier otro con lista de personas). Cada evento tiene fechas, sede y categorías de gafete con color y diseño propio (de inicio: ${categoriasEjemplo}); la lista de registro se sube con Excel y se revisa la vista previa de cada gafete. La plataforma sugiere la fecha límite para pedir y recibir antes del evento. Al pedido se le puede agregar un cordón con broche del color de cada categoría por ${pesos(precioCordon)} MXN por pieza, ${notaIva}. El código QR funciona como acceso (válido, sin acceso o evento terminado) y deja de valer al terminar el último día. Los datos personales de los asistentes se borran ${diasParaBorrarDatos} días después del evento; pedidos y facturas se conservan. El precio por gafete es el mismo que para empresas`;
