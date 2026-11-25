/**
 * Guía de medidas y glosario de gafetes y credenciales (/medidas-de-gafetes).
 * Única fuente: la página, su JSON-LD, llms.txt y el asistente leen de aquí.
 *
 * Fuentes de las medidas: norma ISO/IEC 7810 (formatos ID-1, ID-2, ID-3 e
 * ID-000) y los nombres comerciales CR79, CR80 y CR100 con los que los
 * distribuidores de insumos venden las tarjetas de PVC en blanco.
 */
import type { Faq } from "./faqs";
import { grosorTexto, materiales, medidas, zonas } from "./materiales";
import { site } from "./site";

export const rutaGuiaMedidas = "/medidas-de-gafetes";

const PULGADA_MM = 25.4;
const cm = (mm: number) => `${Number((mm / 10).toFixed(2))} cm`;
const pulg = (mm: number) => Number((mm / PULGADA_MM).toFixed(3));

/** El gafete estándar CR80 / ISO/IEC 7810 ID-1, con las medidas exactas de la norma. */
export const cr80 = {
  anchoMm: 85.6,
  altoMm: 53.98,
  /** Así se redondea casi siempre, y así lo usa el resto del sitio. */
  altoRedondeadoMm: medidas.alto,
  grosorMm: 0.76,
  grosorMil: 30,
  radioEsquinaMm: 3.18,
  anchoPulg: "3.370",
  altoPulg: "2.125",
  /** Densidad del PVC rígido (g/cm³), para calcular el peso aproximado. */
  densidadPvc: 1.38,
};

const volumenCm3 = (cr80.anchoMm * cr80.altoMm * cr80.grosorMm) / 1000;
/** Peso aproximado de un gafete de PVC estándar, en gramos (≈ 4.8 g). */
export const pesoGramos = Number((volumenCm3 * cr80.densidadPvc).toFixed(1));
const pilaDe100Cm = Number(((cr80.grosorMm * 100) / 10).toFixed(1));
const gafetesPorKilo = Math.floor(1000 / pesoGramos);
const proporcion = Number((cr80.anchoMm / cr80.altoMm).toFixed(3));

export const medidaCorta = `${Number((cr80.anchoMm / 10).toFixed(2))} × ${Number((medidas.alto / 10).toFixed(2))} cm`;
export const medidaMm = `${cr80.anchoMm} × ${medidas.alto} mm`;

export type Tamano = {
  id: string;
  nombre: string;
  /** Otro nombre con el que se conoce. */
  alias?: string;
  anchoMm: number;
  altoMm: number;
  uso: string;
  /** Es el que imprime LaGafetería. */
  nuestro?: boolean;
};

/** Tamaños de tarjetas y gafetes, de menor a mayor. */
export const tamanos: Tamano[] = [
  {
    id: "id-000",
    nombre: "ID-000",
    alias: "chip SIM",
    anchoMm: 25,
    altoMm: 15,
    uso: "El chip SIM de tamaño completo. Lo ponemos solo para comparar: nadie quiere un gafete así de chiquito.",
  },
  {
    id: "cr79",
    nombre: "CR79",
    anchoMm: 83.9,
    altoMm: 52.1,
    uso: "Un poco más chica que la CR80. Se usa sobre todo en tarjetas adhesivas que se pegan encima de otra tarjeta sin que se asome la orilla.",
  },
  {
    id: "cr80",
    nombre: "CR80",
    alias: "ISO/IEC 7810 ID-1",
    anchoMm: cr80.anchoMm,
    altoMm: cr80.altoMm,
    uso: "El tamaño estándar de los gafetes y credenciales: el mismo de una tarjeta bancaria o de la credencial para votar (INE). Cabe en cualquier portagafete y en cualquier cartera.",
    nuestro: true,
  },
  {
    id: "cr100",
    nombre: "CR100",
    anchoMm: 98.5,
    altoMm: 67,
    uso: "Tarjeta de PVC más grande, con más espacio para la foto y los datos. Necesita portagafetes e impresoras especiales, así que es poco común.",
  },
  {
    id: "evento",
    nombre: "Gafete para evento",
    alias: "4 × 3 pulgadas",
    anchoMm: 101.6,
    altoMm: 76.2,
    uso: "Un tamaño común en congresos y expos: una hoja impresa que va dentro de una funda de plástico grande. Se lee de lejos, pero se dobla y no aguanta el uso diario.",
  },
  {
    id: "id-2",
    nombre: "ID-2",
    alias: "tamaño A7",
    anchoMm: 105,
    altoMm: 74,
    uso: "Formato de la misma norma ISO que usan algunos documentos de identidad de otros países. Demasiado grande para un gafete de todos los días.",
  },
  {
    id: "id-3",
    nombre: "ID-3",
    alias: "tamaño B7",
    anchoMm: 125,
    altoMm: 88,
    uso: "El tamaño de la página de datos de un pasaporte. Aquí solo para darte idea de la escala.",
  },
];

export const tamanoTexto = (t: Tamano) =>
  `${t.anchoMm} × ${t.altoMm} mm (${pulg(t.anchoMm)} × ${pulg(t.altoMm)} in)`;

/** Datos curiosos del gafete CR80, calculados con las medidas de arriba. */
export const datosCuriosos = [
  {
    cifra: medidaCorta,
    titulo: "Igual que tu tarjeta del banco",
    texto: "Tu tarjeta bancaria, tu INE y la mayoría de las licencias de conducir usan el mismo formato ID-1 de la norma ISO/IEC 7810.",
  },
  {
    cifra: "2⅛ in",
    titulo: "Mitad pulgadas, mitad milímetros",
    texto: `El alto mide exactamente 2⅛ pulgadas (${cr80.altoMm} mm) y el ancho, ${cr80.anchoMm} mm. Por eso la medida no es redonda y casi todos la redondeamos a ${medidaMm}.`,
  },
  {
    cifra: `${cr80.grosorMm} mm`,
    titulo: "Delgado, pero rígido",
    texto: `Son ${cr80.grosorMil} milésimas de pulgada (30 mil): el grosor de unas siete u ocho hojas de papel bond juntas.`,
  },
  {
    cifra: `${pilaDe100Cm} cm`,
    titulo: "La torre de 100 gafetes",
    texto: `Si apilas 100 gafetes de PVC estándar, la torre mide ${pilaDe100Cm} cm: más o menos lo que mide un dedo índice.`,
  },
  {
    cifra: `≈ ${pesoGramos} g`,
    titulo: "Pesa menos que una moneda de $10",
    texto: `Un gafete de PVC pesa unos ${Math.round(pesoGramos)} gramos. Con ${gafetesPorKilo} gafetes apenas juntas un kilo.`,
  },
  {
    cifra: `${proporcion} : 1`,
    titulo: "Casi la proporción áurea",
    texto: "Su proporción entre largo y ancho se parece mucho a la proporción áurea (1.618), la de muchos rectángulos que se ven bonitos sin saber por qué.",
  },
];

/** Orientación: mismo gafete, girado. */
export const orientaciones = [
  {
    id: "vertical",
    nombre: "Vertical",
    medida: `${cm(medidas.alto)} de ancho × ${cm(cr80.anchoMm)} de alto`,
    favorito: true,
    ventajas: [
      "La foto se ve más grande y el rostro se reconoce de lejos.",
      "Cuelga derecho de un cordón o de un yoyo, con la ranura en el lado corto.",
      "Es el más común en empresas con control de acceso, clínicas, tiendas y eventos.",
    ],
    idealPara: "Personal que trae el gafete colgado todo el día.",
  },
  {
    id: "horizontal",
    nombre: "Horizontal",
    medida: `${cm(cr80.anchoMm)} de ancho × ${cm(medidas.alto)} de alto`,
    favorito: false,
    ventajas: [
      "Caben nombres largos y logotipos anchos en una sola línea.",
      "Se lee bien con un broche o clip en la camisa o en la bolsa del pecho.",
      "Es como se ve una tarjeta bancaria, así que se siente familiar.",
    ],
    idealPara: "Oficinas, uniformes con bolsa y credenciales que se guardan en la cartera.",
  },
];

/** Grosores comunes de las tarjetas de PVC. */
export const grosores = [
  { mil: 10, mm: 0.25, nombre: "10 mil", uso: "Flexible, como una etiqueta gruesa. Se usa en tarjetas adhesivas.", nuestro: materiales.some((m) => m.disponible && m.grosorMil === 10) },
  { mil: 20, mm: 0.51, nombre: "20 mil", uso: "Se dobla con facilidad. Común en tarjetas de lealtad o de regalo económicas.", nuestro: false },
  { mil: 30, mm: 0.76, nombre: "30 mil", uso: "El estándar de la norma: rígido, como una tarjeta bancaria. Es el de los gafetes y credenciales.", nuestro: true },
];

/** Una hoja de papel bond común mide cerca de 0.1 mm. */
export const grosorHojaMm = 0.1;

export type Termino = {
  id: string;
  termino: string;
  /** Otros nombres con los que se busca. */
  alias?: string[];
  definicion: string;
};

const estandar = materiales[0];
const compuesto = materiales.find((m) => m.id === "rudo") ?? estandar;
const proximidad = materiales.find((m) => m.id === "proximidad");

/** Glosario en orden alfabético. */
export const glosario: Termino[] = [
  {
    id: "banda-magnetica",
    termino: "Banda magnética",
    definicion: "La franja oscura al reverso de algunas tarjetas que guarda un número para leerse en un lector. En gafetes y credenciales casi ya no se usa: la reemplazaron el código QR y las tarjetas de proximidad.",
  },
  {
    id: "clip",
    termino: "Clip o broche",
    alias: ["clip caimán"],
    definicion: "La pinza metálica o de plástico que sujeta el gafete a la ropa. Se engancha en la ranura del gafete o en la del portagafete.",
  },
  {
    id: "codigo-qr",
    termino: "Código QR",
    definicion: "El cuadrito de puntos que se lee con la cámara del celular. En un gafete puede llevar a una página que confirma si la persona sigue vigente en la empresa.",
  },
  {
    id: "cordon",
    termino: "Cordón",
    alias: ["lanyard", "listón"],
    definicion: "La cinta que se cuelga del cuello y sostiene el gafete con un broche. Puede ir impresa con el logo o con un color por área o categoría.",
  },
  {
    id: "cr79",
    termino: "CR79",
    definicion: "Tarjeta de 83.9 × 52.1 mm, un poco más chica que la CR80. Se usa en tarjetas adhesivas que se pegan sobre otra tarjeta sin que se asome la orilla.",
  },
  {
    id: "cr80",
    termino: "CR80",
    alias: ["tamaño tarjeta de crédito"],
    definicion: `El tamaño estándar de los gafetes y credenciales: ${cr80.anchoMm} × ${cr80.altoMm} mm (${cr80.anchoPulg} × ${cr80.altoPulg} pulgadas), con esquinas redondeadas de ${cr80.radioEsquinaMm} mm. Es el nombre comercial del formato ID-1 de la norma ISO/IEC 7810.`,
  },
  {
    id: "credencial",
    termino: "Credencial",
    definicion: "La tarjeta que identifica a una persona ante una empresa, escuela o evento. En México se usa casi como sinónimo de gafete; por eso decimos siempre «gafetes y credenciales».",
  },
  {
    id: "dpi",
    termino: "DPI",
    alias: ["puntos por pulgada"],
    definicion: `La resolución de la impresión. Los gafetes se diseñan a ${medidas.resolucionDpi} dpi: a esa resolución un gafete CR80 mide ${zonas[1].pixeles}.`,
  },
  {
    id: "frente-y-vuelta",
    termino: "Frente y vuelta",
    alias: ["dos caras"],
    definicion: "Gafete impreso por los dos lados. Al reverso suelen ir el código QR, el teléfono de emergencia, el tipo de sangre o las reglas de uso.",
  },
  {
    id: "gafete",
    termino: "Gafete",
    definicion: "La tarjeta con el nombre, la foto y el puesto de una persona, que se porta a la vista. En México a veces también se le dice gafete al portagafete donde va.",
  },
  {
    id: "gafete-digital",
    termino: "Gafete digital",
    definicion: "La versión del gafete que vive en el celular, con la foto, los datos y el código QR de verificación. Sirve solo o como respaldo del impreso.",
  },
  {
    id: "id-1",
    termino: "ID-1",
    alias: ["ISO/IEC 7810"],
    definicion: "Uno de los formatos de la norma internacional ISO/IEC 7810 para tarjetas de identificación. Es el de las tarjetas bancarias y los gafetes CR80. La misma norma define ID-000 (chip SIM), ID-2 e ID-3 (pasaporte).",
  },
  {
    id: "impresora-de-credenciales",
    termino: "Impresora de credenciales",
    definicion: "Impresora que imprime directo sobre la tarjeta de PVC con calor (sublimación de tinta). Hay de una cara y de doble cara.",
  },
  {
    id: "linea-de-corte",
    termino: "Línea de corte",
    definicion: `El contorno final del gafete: ${medidaMm} con esquinas redondeadas. Todo lo que queda afuera se recorta.`,
  },
  {
    id: "margen-de-corte",
    termino: "Margen de corte",
    definicion: `Lo que el fondo del diseño sobresale de la línea de corte, ${medidas.sangrado} mm por lado, para que no queden filos blancos. En imprenta se le llama sangrado.`,
  },
  {
    id: "mil",
    termino: "Mil",
    alias: ["milésima de pulgada"],
    definicion: "Unidad con la que se mide el grosor de las tarjetas: una milésima de pulgada, o 0.0254 mm. Una tarjeta de 30 mil mide 0.76 mm.",
  },
  {
    id: "portagafete",
    termino: "Portagafete",
    alias: ["funda", "porta credencial"],
    definicion: "La funda de plástico, rígida o flexible, donde se mete el gafete para protegerlo. Casi todos están hechos para el tamaño CR80.",
  },
  {
    id: "proximidad",
    termino: "Tarjeta de proximidad",
    alias: ["RFID"],
    definicion: `Tarjeta con un chip y una antena adentro que abre puertas o registra la asistencia al acercarla a un lector. La imprimible mide lo mismo que un gafete CR80${proximidad ? `, con un grosor de ${grosorTexto(proximidad)}` : ""}.`,
  },
  {
    id: "pvc",
    termino: "PVC",
    alias: ["policloruro de vinilo"],
    definicion: `El plástico rígido con el que se hacen la mayoría de los gafetes y credenciales. El ${estandar.nombre} mide ${grosorTexto(estandar)}; el ${compuesto.nombre} mezcla PVC con poliéster para aguantar más calor y dobleces.`,
  },
  {
    id: "ranura",
    termino: "Ranura",
    alias: ["slot", "perforación"],
    definicion: `La perforación alargada para pasar el broche del cordón, el clip o el yoyo. La nuestra mide ${medidas.ranura.ancho} × ${medidas.ranura.alto} mm y va centrada en la orilla de arriba.`,
  },
  {
    id: "ymcko",
    termino: "Cinta YMCKO",
    definicion: "El rollo de color de una impresora de credenciales: amarillo (Y), magenta (M), cian (C), negro (K) y una capa transparente (O, de overlay) que protege la impresión del roce.",
  },
  {
    id: "yoyo",
    termino: "Yoyo",
    alias: ["carrete retráctil"],
    definicion: "Un carrete con un cordón que se estira y se recoge solo. Se engancha al cinturón o a la bolsa y deja acercar el gafete al lector sin quitárselo.",
  },
  {
    id: "zona-segura",
    termino: "Zona segura",
    definicion: `El área a ${medidas.margenSeguro} mm o más de la línea de corte donde van los nombres, la foto, el logo y el código QR, para que nada quede cortado.`,
  },
].sort((a, b) => a.termino.localeCompare(b.termino, "es"));

export const faqsMedidas: Faq[] = [
  {
    pregunta: "¿Cuál es la medida de un gafete?",
    respuesta: `El gafete estándar mide ${medidaCorta} (${medidaMm}), el mismo tamaño de una tarjeta bancaria o de la credencial del INE. Se le conoce como CR80 y su grosor más común es de ${cr80.grosorMm} mm.`,
  },
  {
    pregunta: "¿Cuál es el tamaño estándar de un gafete?",
    respuesta: `El CR80, que es el formato ID-1 de la norma internacional ISO/IEC 7810: ${cr80.anchoMm} × ${cr80.altoMm} mm, o ${cr80.anchoPulg} × ${cr80.altoPulg} pulgadas, con esquinas redondeadas de ${cr80.radioEsquinaMm} mm. Casi todos los portagafetes, cordones e impresoras de credenciales están hechos para ese tamaño.`,
  },
  {
    pregunta: "¿Qué tamaños de gafetes existen?",
    respuesta: `Los más comunes son el CR80 (${medidaMm}, el estándar), el CR79 (83.9 × 52.1 mm, para tarjetas adhesivas), el CR100 (98.5 × 67 mm, más grande y poco común) y los gafetes de papel para eventos de 4 × 3 pulgadas (10.2 × 7.6 cm) dentro de una funda. Para empleados conviene el CR80.`,
  },
  {
    pregunta: "¿Cuánto mide un gafete vertical?",
    respuesta: `Lo mismo que uno horizontal, solo que girado: ${cm(medidas.alto)} de ancho por ${cm(cr80.anchoMm)} de alto. En vertical la foto se ve más grande y el gafete cuelga derecho de un cordón.`,
  },
  {
    pregunta: "¿Qué grosor tiene un gafete de PVC?",
    respuesta: `El estándar es de ${cr80.grosorMm} mm, que en la industria se dice «30 mil» (30 milésimas de pulgada). También hay tarjetas de 20 mil (0.51 mm), que se doblan más, y de 10 mil (0.25 mm), que son adhesivas.`,
  },
  {
    pregunta: "¿De qué tamaño en píxeles debe ser el diseño de un gafete?",
    respuesta: `A ${medidas.resolucionDpi} dpi, el gafete CR80 mide ${zonas[1].pixeles}. El archivo para imprimir lleva además ${medidas.sangrado} mm de margen de corte por lado: ${zonas[0].medida} (${zonas[0].pixeles}).`,
  },
  {
    pregunta: "¿Qué es un gafete CR80?",
    respuesta: `Es el nombre comercial del tamaño estándar de las tarjetas de identificación: ${medidaMm}. Así se piden las tarjetas de PVC en blanco a los proveedores y así se configuran las impresoras de credenciales.`,
  },
  {
    pregunta: "¿Cuál es la diferencia entre gafete y portagafete?",
    respuesta: "El gafete es la tarjeta con el nombre y la foto. El portagafete es la funda de plástico donde se mete para protegerlo. En México a veces se les dice gafete a los dos, por eso conviene aclarar cuál buscas.",
  },
];

/** Texto para llms-full.txt y el asistente. */
export function guiaMedidasTexto(urlPagina: string): string {
  return `Guía completa con diagrama a escala: ${urlPagina}

- Medida estándar de un gafete: ${medidaCorta} (${cr80.anchoMm} × ${cr80.altoMm} mm; ${cr80.anchoPulg} × ${cr80.altoPulg} pulgadas), formato CR80, que es el ID-1 de la norma ISO/IEC 7810. Esquinas redondeadas de ${cr80.radioEsquinaMm} mm. Grosor estándar: ${cr80.grosorMm} mm (30 mil). Pesa cerca de ${pesoGramos} g.
- Orientación: vertical (${orientaciones[0].medida}) u horizontal (${orientaciones[1].medida}); es el mismo gafete girado. Recomendamos vertical para quien lo trae colgado de un cordón o yoyo.
- Otros tamaños: ${tamanos.filter((t) => !t.nuestro).map((t) => `${t.nombre}${t.alias ? ` (${t.alias})` : ""}, ${t.anchoMm} × ${t.altoMm} mm`).join("; ")}. ${site.nombre} imprime solo en CR80.
- Grosores: ${grosores.map((g) => `${g.nombre} = ${g.mm} mm`).join(", ")}.

### Glosario

${glosario.map((t) => `- **${t.termino}**${t.alias?.length ? ` (${t.alias.join(", ")})` : ""}: ${t.definicion}`).join("\n")}`;
}
