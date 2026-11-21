import { entregaTexto, site } from "./site";
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
  tramos,
} from "./precios";

export type Faq = { pregunta: string; respuesta: string };

const tramoVolumen = tramos.find((t) => t.desde === 30) ?? tramos[2];

/**
 * Preguntas frecuentes generales. Cada respuesta abre con la respuesta directa
 * (para buscadores de respuesta y asistentes de IA) y después da el detalle.
 */
export const faqsGenerales: Faq[] = [
  {
    pregunta: `¿Qué es ${site.nombre}?`,
    respuesta: `${site.nombre} es una tienda en línea mexicana dedicada solo a gafetes y credenciales para empleados, impresos en PVC o digitales. En lugar de mandar archivos por correo, armas tu pedido paso a paso: eliges una plantilla o subes tu diseño, cargas los datos de tu equipo con Excel, revisas cada gafete en pantalla y ves el precio con envío antes de pagar.`,
  },
  {
    pregunta: "¿Cuánto cuesta un gafete o credencial para empleado?",
    respuesta: `Un gafete impreso cuesta entre ${pesos(precioMinimo)} y ${pesos(precioMaximo)} pesos por pieza a una cara (${notaIva}), según la cantidad. Por ejemplo, de ${tramoVolumen.desde} a ${tramoVolumen.hasta} piezas cuestan ${pesos(tramoVolumen.precio)} cada una. La impresión por frente y vuelta suma ${pesos(extraDosCaras)} por pieza. Un gafete solo digital cuesta entre ${pesos(digitalMinimo)} y ${pesos(digitalMaximo)}. La plataforma para diseñar, cargar datos y administrar a tu equipo no tiene costo.`,
  },
  {
    pregunta: "¿Hay que pagar una suscripción o mensualidad?",
    respuesta:
      "No. Pagas una sola vez por cada gafete, sea impreso, digital o los dos. No hay mensualidades, anualidades ni costo por usuario, y tu plataforma para administrar altas, bajas y reposiciones viene incluida.",
  },
  {
    pregunta: "¿Qué es un gafete digital?",
    respuesta: `Es la versión del gafete que cada persona lleva en su celular, con un código QR que cualquiera puede escanear para comprobar que esa persona sigue vigente en tu empresa. Tú decides qué información muestra: nombre, puesto, fotografía, número de empleado, área o vigencia. Puedes pedirlo solo o junto con el gafete impreso por ${pesos(extraDigital)} más por pieza.`,
  },
  {
    pregunta: "¿Hay pedido mínimo?",
    respuesta:
      "No. Puedes pedir desde un solo gafete, por ejemplo para un empleado nuevo o una reposición. Entre más piezas pidas, menor es el precio por pieza.",
  },
  {
    pregunta: "¿Cuánto tarda en llegar mi pedido?",
    respuesta: `${entregaTexto.charAt(0).toUpperCase() + entregaTexto.slice(1)}, contadas desde que confirmas el pago y apruebas la vista previa de tus gafetes. Los gafetes digitales no llevan envío: se activan en tu plataforma.`,
  },
  {
    pregunta: "¿Tienen entrega exprés?",
    respuesta: `Todavía no. La entrega exprés estará disponible próximamente; por ahora todos los pedidos impresos se entregan en ${entregaTexto}.`,
  },
  {
    pregunta: "¿Envían gafetes y credenciales a todo México?",
    respuesta: `Sí, enviamos por paquetería a toda la República Mexicana desde ${site.estadoBase}. El envío tiene una tarifa única de ${pesos(envio.tarifa)} a cualquier destino.`,
  },
  {
    pregunta: "¿Cuánto cuesta el envío y cuándo es gratis?",
    respuesta: `El envío cuesta ${pesos(envio.tarifa)} a cualquier parte de México y es gratis en pedidos desde ${pesos(envio.gratisDesde)} antes de IVA. El cotizador te muestra el envío, el IVA y el total antes de que des ningún dato.`,
  },
  {
    pregunta: "¿Puedo cotizar sin dejar mis datos?",
    respuesta:
      "Sí. El cotizador muestra el precio por pieza, el envío, el IVA, el total y el tiempo de entrega sin pedirte nada. Si quieres, descargas la cotización en PDF o la recibes en tu correo para compartirla en tu empresa.",
  },
  {
    pregunta: "¿Qué puedo hacer en mi cuenta?",
    respuesta: `Al crear tu cuenta tienes tu plataforma de ${site.nombre}, donde administras a tu equipo: altas de empleados nuevos, bajas, reposiciones de gafetes perdidos o dañados, y desactivaciones y reactivaciones de gafetes digitales.`,
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
      "Nombre, puesto, número de empleado, fotografía y código QR, además de tu logo y los textos fijos que quieras (sucursal, área, vigencia o teléfono de emergencia). Tú eliges cuáles se incluyen.",
  },
  {
    pregunta: "¿Puedo ver cómo quedan antes de pagar?",
    respuesta:
      "Sí. Ves la vista previa de cada gafete, uno por uno, con los datos reales de cada persona. Así detectas un nombre mal escrito o una foto cortada antes de imprimir.",
  },
  {
    pregunta: "¿De qué material y tamaño son los gafetes impresos?",
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
    respuesta: `En México, gafete y credencial suelen referirse a lo mismo: la tarjeta que identifica a una persona con su nombre, puesto y foto. El portagafete es la funda o el broche donde se coloca esa tarjeta, y el cordón es la cinta que se cuelga al cuello. ${site.nombre} hace la tarjeta: tus gafetes y credenciales.`,
  },
  {
    pregunta: "¿Qué gafetes o credenciales no hacen?",
    respuesta:
      "No hacemos identificaciones oficiales ni documentos de gobierno, y tampoco gafetes o credenciales de una empresa distinta a la que hace el pedido. Solo producimos identificaciones internas de tu propia organización.",
  },
  {
    pregunta: "¿Qué pasa con los datos y las fotos de mis empleados?",
    respuesta:
      "Se usan únicamente para producir y administrar tus gafetes. No se venden ni se usan para publicidad, y puedes pedir que se eliminen. El detalle está en nuestro aviso de privacidad.",
  },
];
