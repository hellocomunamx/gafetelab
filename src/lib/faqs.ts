import { materiales } from "./materiales";
import { entregaTexto, site } from "./site";
import {
  envio,
  extraDosCarasDetalle,
  extraDosCarasRango,
  notaIva,
  paqueteVigenciaMeses,
  paquetes,
  pesos,
  precioDigital,
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
    respuesta: `${site.nombre} es una tienda en línea mexicana dedicada solo a gafetes y credenciales para empleados, impresos en PVC o digitales. En lugar de mandar archivos por correo, armas tu pedido paso a paso: eliges una plantilla o subes tu diseño, subes a tu equipo con Excel, uno por uno o con las fotos de todos juntas, revisas cada gafete en pantalla y ves el precio con envío antes de pagar. Con tu cuenta tienes una plataforma para administrar los gafetes de tu equipo, sin costo extra.`,
  },
  {
    pregunta: "¿Cuánto cuesta un gafete o credencial para empleado?",
    respuesta: `Un gafete impreso cuesta entre ${pesos(precioMinimo)} y ${pesos(precioMaximo)} pesos por pieza a una cara (${notaIva}), según la cantidad. Por ejemplo, de ${tramoVolumen.desde} a ${tramoVolumen.hasta} piezas cuestan ${pesos(tramoVolumen.precio)} cada una. La impresión por frente y vuelta suma ${extraDosCarasRango} por pieza, también según la cantidad. Un gafete digital cuesta ${pesos(precioDigital)} por pieza, solo o sumado al impreso. La plataforma para diseñar, cargar datos y administrar a tu equipo no tiene costo.`,
  },
  {
    pregunta: "¿Hay que pagar una suscripción o mensualidad?",
    respuesta:
      "No. Pagas una sola vez por cada gafete, sea impreso, digital o los dos. No hay mensualidades, anualidades ni costo por usuario, y tu plataforma para administrar altas, bajas y reposiciones viene incluida.",
  },
  {
    pregunta: "¿Qué es un gafete digital?",
    respuesta: `Es la versión del gafete que cada persona lleva en su celular, para mostrarla sin traer la tarjeta. Lleva el mismo código QR de verificación que el impreso. Cuesta ${pesos(precioDigital)} por pieza, lo pidas solo o junto con el gafete impreso.`,
  },
  {
    pregunta: "¿Qué pasa cuando alguien escanea el código QR de un gafete?",
    respuesta:
      "Tú lo decides en tu plataforma, en «Qué muestra tu QR». Por omisión abre una página de verificación que dice si el gafete está vigente o expirado, con los datos que elijas mostrar: nombre, puesto, número de empleado, departamento, fotografía y el nombre de tu empresa. Si das de baja a la persona, su página deja de mostrar sus datos. También puedes hacer que el código lleve a una liga tuya o que contenga solo un dato, como el número de empleado. Va incluido en todos los gafetes, impresos y digitales, sin costo extra.",
  },
  {
    pregunta: "¿Hay pedido mínimo?",
    respuesta:
      "No. Puedes pedir desde un solo gafete, por ejemplo para un empleado nuevo o una reposición. Entre más piezas pidas, menor es el precio por pieza.",
  },
  {
    pregunta: "¿Conviene pedir solo uno, dos o tres gafetes?",
    respuesta: `Sí se puede, y para que el envío no pese más que el gafete existen los paquetes prepagados. Compras, por ejemplo, ${paquetes[0].piezas} gafetes por ${pesos(paquetes[0].piezas * paquetes[0].porPieza)} con ${paquetes[0].envios} envíos incluidos, usas los que necesitas hoy y el resto queda a tu favor durante ${paqueteVigenciaMeses} meses. También puedes dejar un pedido abierto en tu plataforma e ir sumando altas y reposiciones hasta completar un envío.`,
  },
  {
    pregunta: "¿Los paquetes prepagados se pueden reembolsar o transferir?",
    respuesta: `Los paquetes no son reembolsables, ni completos ni por la parte que no se haya usado. Sí se pueden transferir: si ya no vas a usar tus gafetes, puedes pasarlos sin costo a la cuenta de otra empresa. Tienen una vigencia de ${paqueteVigenciaMeses} meses.`,
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
      "Como te acomode: con la plantilla de Excel, capturándolos uno por uno o subiendo las fotos de todos juntas, que se asignan solas por número de empleado o por nombre. Cada columna de tu Excel (nombre, puesto, número de empleado) se conecta con un campo del gafete, y el sistema genera un gafete por cada renglón. Muy pronto también podrás mandar una liga para que cada persona suba sus datos y su foto.",
  },
  {
    pregunta: "¿Puedo usar el diseño que ya tiene mi empresa?",
    respuesta:
      "Sí. Hay tres formas de empezar: subir tu propio diseño, elegir una plantilla y ponerle tu logo y colores, o crear el gafete desde cero. En las tres marcas qué partes cambian de un empleado a otro. Y si ya tienes el gafete terminado de cada persona, con su nombre y su foto, los subes de forma masiva en tu cuenta y se imprimen tal cual.",
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
    respuesta: `Son tarjetas de PVC rígido en tamaño estándar CR80, de 8.6 × 5.4 cm: el mismo tamaño de una tarjeta bancaria, y caben en cualquier portagafete. Puedes elegir entre ${materiales
      .filter((m) => m.disponible)
      .map((m) => `${m.nombre} de ${m.grosorMm} mm`)
      .join(", ")}.`,
  },
  {
    pregunta: "¿Puedo tener un diseño distinto por puesto o departamento?",
    respuesta:
      "Sí. En tu plataforma asignas un diseño según el puesto, el departamento, la sucursal o el tipo de contrato, y cada persona recibe el gafete que le corresponde. También eliges qué campos lleva y si van al frente o a la vuelta, y descargas la plantilla de Excel con esas columnas.",
  },
  {
    pregunta: "¿Imprimen por un lado o por los dos?",
    respuesta: `Las dos opciones. A una cara es lo más común y económico; frente y vuelta suma ${extraDosCarasRango} por pieza según la cantidad (${extraDosCarasDetalle}) y sirve para poner datos de emergencia, reglamento o un código QR al reverso.`,
  },
  {
    pregunta: "¿Dan factura?",
    respuesta: `Sí. Al hacer tu pedido capturas tus datos fiscales y recibes tu factura (CFDI) por correo. Puedes pedirla dentro de los ${site.plazoFacturaDias} días posteriores a tu pedido. Revisa bien tus datos antes de confirmar, porque una factura emitida no se puede editar.`,
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
