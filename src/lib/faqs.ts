import { entregaTexto, site } from "./site";
import { extraDosCaras, notaIva, pesos, precioMaximo, precioMinimo, tramos } from "./precios";

export type Faq = { pregunta: string; respuesta: string };

const tramoVolumen = tramos.find((t) => t.desde === 30) ?? tramos[2];

/**
 * Preguntas frecuentes generales. Cada respuesta abre con la respuesta directa
 * (para buscadores de respuesta y asistentes de IA) y después da el detalle.
 */
export const faqsGenerales: Faq[] = [
  {
    pregunta: "¿Qué es LaGafetería?",
    respuesta: `LaGafetería es una tienda en línea mexicana dedicada solo a gafetes y credenciales para empleados. En lugar de mandar archivos por correo, armas tu pedido paso a paso: eliges una plantilla o subes tu diseño, cargas los datos de tu equipo con Excel, revisas cada gafete en pantalla y ves el precio con envío antes de pagar.`,
  },
  {
    pregunta: "¿Cuánto cuesta un gafete o credencial para empleado?",
    respuesta: `Entre ${pesos(precioMinimo)} y ${pesos(precioMaximo)} pesos por pieza a una cara (${notaIva}), según la cantidad. Por ejemplo, de ${tramoVolumen.desde} a ${tramoVolumen.hasta} piezas cuestan ${pesos(tramoVolumen.precio)} cada una. La impresión por frente y vuelta suma ${pesos(extraDosCaras)} por pieza. El software para diseñar y cargar los datos no tiene costo.`,
  },
  {
    pregunta: "¿Hay pedido mínimo?",
    respuesta:
      "No. Puedes pedir desde un solo gafete, por ejemplo para un empleado nuevo o una reposición. Entre más piezas pidas, menor es el precio por pieza.",
  },
  {
    pregunta: "¿Cuánto tarda en llegar mi pedido?",
    respuesta: `De ${entregaTexto} a partir de que confirmas el pago y apruebas la vista previa de tus gafetes.`,
  },
  {
    pregunta: "¿Envían gafetes y credenciales a todo México?",
    respuesta: `Sí, enviamos por paquetería a toda la República Mexicana desde ${site.ciudadBase}, ${site.estadoBase}. El costo del envío aparece en tu cotización desde el primer paso, no al final.`,
  },
  {
    pregunta: "¿Cómo mando los datos de mis empleados?",
    respuesta:
      "Con un archivo de Excel o capturándolos uno por uno. Cada columna de tu Excel (nombre, puesto, número de empleado) se conecta con un campo del gafete, y el sistema genera un gafete por cada renglón.",
  },
  {
    pregunta: "¿Puedo usar el diseño que ya tiene mi empresa?",
    respuesta:
      "Sí. Hay tres formas de empezar: subir tu propio diseño, elegir una plantilla y ponerle tu logo y colores, o crear el gafete desde cero. En las tres marcas qué partes cambian de un empleado a otro.",
  },
  {
    pregunta: "¿Qué datos puede llevar cada gafete?",
    respuesta:
      "Nombre, puesto, número de empleado, fotografía y código QR, además de tu logo y los textos fijos que quieras (sucursal, área, vigencia o teléfono de emergencia).",
  },
  {
    pregunta: "¿Puedo ver cómo quedan antes de pagar?",
    respuesta:
      "Sí. Ves la vista previa de cada gafete, uno por uno, con los datos reales de cada persona. Así detectas un nombre mal escrito o una foto cortada antes de imprimir.",
  },
  {
    pregunta: "¿De qué material y tamaño son los gafetes?",
    respuesta:
      "Son tarjetas de PVC rígido en tamaño estándar CR80, de 8.6 × 5.4 cm: el mismo tamaño de una tarjeta bancaria. Caben en cualquier portagafete estándar.",
  },
  {
    pregunta: "¿Imprimen por un lado o por los dos?",
    respuesta: `Las dos opciones. A una cara es lo más común y económico; frente y vuelta suma ${pesos(extraDosCaras)} por pieza y sirve para poner datos de emergencia, reglamento o un código QR al reverso.`,
  },
  {
    pregunta: "¿Dan factura?",
    respuesta:
      "Sí. Al hacer tu pedido capturas tus datos fiscales y recibes tu factura (CFDI) por correo.",
  },
  {
    pregunta: "¿Cuál es la diferencia entre gafete, credencial y portagafete?",
    respuesta:
      "En México, gafete y credencial suelen referirse a lo mismo: la tarjeta que identifica a una persona con su nombre, puesto y foto. El portagafete es la funda o el broche donde se coloca esa tarjeta, y el cordón es la cinta que se cuelga al cuello. LaGafetería imprime la tarjeta: tus gafetes y credenciales.",
  },
  {
    pregunta: "¿Qué gafetes o credenciales no imprimen?",
    respuesta:
      "No imprimimos identificaciones oficiales ni documentos de gobierno, y tampoco gafetes o credenciales de una empresa distinta a la que hace el pedido. Solo producimos identificaciones internas de tu propia organización.",
  },
  {
    pregunta: "¿Qué pasa con los datos y las fotos de mis empleados?",
    respuesta:
      "Se usan únicamente para producir tu pedido. No se venden ni se comparten con terceros para fines de publicidad.",
  },
];
