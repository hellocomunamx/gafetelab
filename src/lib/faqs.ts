import { materiales } from "./materiales";
import { adicionalesPendientes } from "./contacto";
import { pago } from "./pedidos/reglas";
import { constancia, entregaTexto, legal, site } from "./site";
import {
  cotizar,
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
  tramosDetalle,
} from "./precios";

export type Faq = { pregunta: string; respuesta: string };

const ejemplo = cotizar((tramos.find((t) => t.desde === 30) ?? tramos[2]).desde + 20);
const materialesConExtra = materiales
  .filter((m) => m.disponible && m.extra > 0)
  .map((m) => `el ${m.nombre} suma ${pesos(m.extra)} por pieza`)
  .join(" y ");

/**
 * Preguntas frecuentes generales. Cada respuesta abre con la respuesta directa
 * (para buscadores de respuesta y asistentes de IA) y después da el detalle.
 */
export const faqsGenerales: Faq[] = [
  {
    pregunta: `¿Qué es ${site.nombre}?`,
    respuesta: `${site.nombre} es una tienda en línea mexicana dedicada a la administración e impresión de gafetes y credenciales para empleados o asistentes a eventos, impresos en PVC o digitales. En lugar de mandar archivos por correo, armas tu pedido paso a paso: eliges una plantilla o subes tu diseño, subes a tu equipo con Excel, uno por uno o con las fotos de todos juntas, revisas cada gafete en pantalla y ves el precio con envío antes de pagar. También puedes pedir que cada persona llene sus datos y suba su propia foto desde una liga, para que tú la apruebes. Con tu cuenta tienes una plataforma para administrar los gafetes de tu equipo, sin costo extra.`,
  },
  {
    pregunta: "¿Cuánto cuesta un gafete o credencial para empleado?",
    respuesta: `Entre ${pesos(precioMinimo)} y ${pesos(precioMaximo)} pesos por pieza a una cara (${notaIva}), según cuántos pidas: ${tramosDetalle}. Por frente y vuelta se suman ${extraDosCarasDetalle}. El PVC estándar ya está incluido; ${materialesConExtra}. El gafete digital cuesta ${pesos(precioDigital)} por pieza, que se pagan una sola vez y no de forma recurrente, en cualquier cantidad, solo o sumado al impreso. El envío cuesta ${pesos(envio.tarifa)} a todo México y es gratis en pedidos desde ${pesos(envio.gratisDesde)} antes de IVA. Por ejemplo, ${ejemplo.piezas} gafetes a una cara cuestan ${pesos(ejemplo.subtotal)} ${notaIva}, ${ejemplo.envioGratis ? "con envío gratis" : `más ${pesos(ejemplo.envio)} de envío`}. No hay suscripción ni pedido mínimo, y la plataforma para diseñar, cargar datos y administrar a tu equipo no tiene costo. Si vas a pedir de a poquitos, te conviene un paquete prepagado.`,
  },
  {
    pregunta: "¿Hay que pagar una suscripción o mensualidad?",
    respuesta:
      "No. Pagas una sola vez por cada gafete, sea impreso, digital o los dos. El gafete digital tampoco es un cobro recurrente: se paga una vez y sigue activo mientras tu cuenta esté activa y tú no lo desactives. No hay mensualidades, anualidades ni costo por usuario, y tu plataforma para administrar altas, bajas y reposiciones viene incluida.",
  },
  {
    pregunta: "¿Qué es un gafete digital?",
    respuesta: `Es la versión del gafete que cada persona lleva en su celular, para mostrarla sin traer la tarjeta. Lleva el mismo código QR de verificación que el impreso. Cuesta ${pesos(precioDigital)} por pieza, lo pidas solo o junto con el gafete impreso, y se paga una sola vez: no es un cobro mensual ni anual.`,
  },
  {
    pregunta: "¿Qué pasa cuando alguien escanea el código QR de un gafete?",
    respuesta:
      "Se abre una página de verificación que dice al momento si el gafete está vigente, expirado (si le pusiste fecha de vigencia), no válido o aún no activo, con la fecha y hora de la consulta. Tú eliges en tu plataforma, en «Qué muestra tu QR», qué datos aparecen: nombre, puesto, número de empleado, departamento, fotografía o el nombre de tu empresa. Si desactivas el gafete o das de baja a la persona, deja de aparecer como vigente en ese instante y su página ya no muestra sus datos. Si lo prefieres, el código puede llevar a una liga tuya o contener solo un dato, como el número de empleado. Va incluido en todos los gafetes, impresos y digitales, sin costo extra.",
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
    respuesta: `${entregaTexto.charAt(0).toUpperCase() + entregaTexto.slice(1)}, contados desde que confirmas el pago y apruebas la vista previa de tus gafetes. Los gafetes digitales no llevan envío: se activan en tu plataforma.`,
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
    pregunta: "¿Cómo sé dónde viene mi pedido?",
    respuesta:
      "En tu plataforma ves el estado de cada pedido: pagado, en producción, enviado y entregado. Cuando sale, te mandamos un correo con la paquetería y el número de guía para que lo sigas.",
  },
  {
    pregunta: "¿Puedo comprar en línea sin hablar con nadie?",
    respuesta: `Sí. Agregas al carrito un paquete prepagado de lista o uno a la medida, o los gafetes que calculaste en el cotizador, y pagas en línea. Solo te pedimos entrar o crear tu cuenta al momento de pagar. Los gafetes de un paquete quedan a tu favor durante ${paqueteVigenciaMeses} meses y se usan solos en tus siguientes pedidos.`,
  },
  {
    pregunta: "¿Puedo cotizar sin dejar mis datos?",
    respuesta:
      "Sí. El cotizador muestra el precio por pieza, el envío, el IVA, el total y el tiempo de entrega sin pedirte nada. Si quieres, descargas la cotización en PDF o la recibes en tu correo para compartirla en tu empresa.",
  },
  {
    pregunta: "¿Qué necesito para abrir la cuenta de mi empresa?",
    respuesta: `Tu correo y verificar tu empresa antes del primer pedido. Tú eliges cómo: con la ${constancia.nombre} (de no más de ${site.constanciaMeses} meses), con tu INE y una prueba de tu negocio (la liga a tus redes o a Google Maps, o una foto de tu local), o con un correo con el dominio de tu empresa. En todos los casos aceptas una carta de responsabilidad y lo revisamos a mano. Así nadie puede mandar a hacer gafetes con el nombre o el logo de tu empresa. Se hace una sola vez y, al aprobarse, tu plataforma muestra la insignia «Empresa verificada».`,
  },
  {
    pregunta: "¿Puedo pedir gafetes si no tengo RFC?",
    respuesta:
      "Sí. Muchos negocios trabajan sin RFC y también son bienvenidos. Verificas tu negocio con tu INE y una prueba de que el negocio es tuyo: la liga a su Facebook, Instagram o Google Maps, o una foto del local, la fachada, el menú o el uniforme donde se vea el mismo nombre que llevarán los gafetes. Lo revisamos a mano, normalmente en menos de un día hábil. Eso sí, sin RFC no podemos emitir una factura a tu nombre.",
  },
  {
    pregunta: `¿Qué verifican en ${site.nombre}?`,
    respuesta:
      "Todo lo que hace que un gafete sea confiable, sin costo extra. Tu empresa, una sola vez antes del primer pedido, con tu constancia fiscal, tu INE y una prueba de tu negocio, o un correo de tu empresa. Tu primer pedido, que revisamos a mano antes de producirlo. Cada foto e identificación que se sube, con una revisión automática. Cada gafete, con su código QR: quien lo escanea ve si está vigente. Cada entrada al portal «Mi gafete», con un código al correo o con número de empleado y NIP. Y tu cuenta y tu pago, con verificación contra robots, límite de intentos y la verificación de tu banco (3D Secure).",
  },
  {
    pregunta: "¿Qué puedo hacer en mi cuenta?",
    respuesta: `Al crear tu cuenta tienes tu plataforma de ${site.nombre}, sin costo extra. Ahí das de alta y de baja a tu equipo, armas tus diseños, eliges qué muestra el código QR, revisas la vista previa de cada gafete, compras paquetes prepagados, pagas, sigues tus envíos y pides tus facturas. También pides reposiciones de gafetes perdidos o dañados, desactivas y reactivas gafetes, invitas a otras personas con su propio rol y apruebas lo que tu equipo pide desde su portal «Mi gafete».`,
  },
  {
    pregunta: "¿Qué es «Mi gafete», el portal para empleados?",
    respuesta: `Es una liga propia de tu empresa (por ejemplo, ${site.dominio}/e/tu-empresa) donde cada persona de tu equipo entra desde su celular, sin crear cuenta: con un código que le llega a su correo, o con su número de empleado y un NIP de 6 números. Desde ahí pide cambiar su foto, corregir un dato como su nombre o su puesto, o reponer su gafete perdido o dañado. Todo te llega a una sola bandeja para aprobar o rechazar con un motivo, y la persona ve en qué va su solicitud. Viene incluido, sin costo extra.`,
  },
  {
    pregunta: "¿Un empleado puede cambiar la foto de su gafete?",
    respuesta:
      "Sí, pero siempre con tu aprobación. Desde su gafete digital o desde su portal «Mi gafete», la persona se toma o sube una foto nueva, y tú la comparas con la anterior antes de aceptarla o rechazarla con un motivo. Si la aceptas, su gafete digital se actualiza, y si también tiene gafete impreso, puedes pedir su reposición.",
  },
  {
    pregunta: "¿Me avisan cuando alguien de mi equipo pide algo?",
    respuesta:
      "Sí, y tú eliges cómo. En tu plataforma decides, para cada tipo de aviso (cambios de foto, datos y fotos por aprobar, y solicitudes del portal), si te llega un correo al momento, un resumen semanal los lunes solo cuando hay pendientes, o nada. Si no eliges, te llega el resumen semanal.",
  },
  {
    pregunta: "¿Puedo darle acceso a otras personas de mi empresa?",
    respuesta:
      "Sí. Invitas por correo a quien te ayuda con los gafetes y eliges su rol: dueño, administrador o editor. La invitación vence a las 24 horas y la puedes reenviar. Con una sola cuenta, una persona puede administrar varias empresas y cambiar entre ellas, y puedes entrar con tu correo o con tu cuenta de Google.",
  },
  {
    pregunta: "¿Cómo mando los datos de mis empleados?",
    respuesta:
      "Como te acomode: con la plantilla de Excel, capturándolos uno por uno o subiendo las fotos de todos juntas, que se asignan solas por número de empleado o por nombre. Cada columna de tu Excel (nombre, puesto, número de empleado) se conecta con un campo del gafete, y el sistema genera un gafete por cada renglón. También puedes mandar una liga para que cada persona llene sus datos y se tome su propia foto, sin crear cuenta. La liga se cierra al enviar; si algo no sirve, pides una corrección con el motivo y se la mandas por correo o WhatsApp. Tú apruebas antes de imprimir.",
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
    pregunta: "¿Cómo puedo pagar mi pedido?",
    respuesta: `Con tarjeta de crédito o débito, en efectivo en OXXO o por transferencia (SPEI). Pagas en línea desde tu plataforma, en la página segura de Stripe; nosotros no vemos ni guardamos los datos de tu tarjeta. Con OXXO te damos una ficha que dura ${pago.diasFichaOxxo} días y con SPEI, una CLABE y una referencia; en ambos casos tu pedido entra a producción cuando el pago se acredita. Los pedidos de ${pago.soloTransferenciaDesdePiezas} gafetes o más, o de ${pesos(pago.soloTransferenciaDesdeTotal)} o más, se pagan solo por transferencia.`,
  },
  {
    pregunta: "¿Puedo cancelar mi pedido después de pagarlo?",
    respuesta: `Sí. Si pagaste con tarjeta, tienes ${pago.minutosDeGracia} minutos para cancelarlo tú mismo desde tu plataforma: en ese rato el cargo solo queda autorizado, así que al cancelar se libera y no se te cobra nada. Pasados los ${pago.minutosDeGracia} minutos se hace el cargo. Con OXXO o SPEI puedes cancelar sin costo mientras no hayas pagado la ficha o hecho la transferencia. Después de eso, y mientras tu pedido no haya entrado a producción, escríbenos y lo cancelamos con la devolución completa de tu pago. Una vez en producción ya no se puede cancelar, porque cada gafete se hace con los datos de tu personal.`,
  },
  {
    pregunta: "¿Dan factura?",
    respuesta: `Sí. Al hacer tu pedido capturas tus datos fiscales y recibes tu factura (CFDI) por correo. La factura va a nombre de la misma empresa que aparece en los gafetes; si la verificaste con tu ${constancia.nombre}, tus datos fiscales ya salen de ahí. Puedes pedirla al hacer tu pedido o después, ${site.plazoFactura}. Solo te pedimos darles una última revisada a tus datos fiscales antes de confirmar: una vez emitida, la factura ya no se puede cambiar, y queremos que te llegue bien a la primera.`,
  },
  {
    pregunta: "¿Cuál es su política de devoluciones?",
    respuesta: `Cada gafete se hace a la medida, con el diseño de tu empresa y los datos de una persona, así que no hay devoluciones por cambio de opinión ni por errores que venían en los datos que aprobaste en la vista previa. Lo que sí: puedes cancelar o corregir tu pedido sin costo mientras no haya entrado a producción, y te devolvemos tu pago completo. Y si un gafete llega con un defecto de impresión o de material, o distinto a lo que aprobaste, escríbenos dentro de los ${legal.plazoDefectosDias} días naturales siguientes a la entrega con una foto de la pieza: te lo reponemos sin costo, con envío incluido, o te devolvemos lo que pagaste por él. Los paquetes prepagados no son reembolsables, pero sí se pueden transferir a otra empresa.`,
  },
  {
    pregunta: "¿Venden portagafetes, cordones o micas?",
    respuesta: `Todavía no. Por ahora hacemos la tarjeta, impresa o digital, y aún no vendemos ${adicionalesPendientes}. Nuestros gafetes son del tamaño estándar CR80, así que caben en cualquier portagafete que ya tengas. Queremos que lo que sigue lo decidas tú: cuéntanos en el formulario de contacto qué te gustaría que existiera en ${site.nombre} o qué te haría más fácil credencializar a tu equipo.`,
  },
  {
    pregunta: "¿Cuál es la diferencia entre gafete, credencial y portagafete?",
    respuesta: `En México, gafete y credencial suelen referirse a lo mismo: la tarjeta que identifica a una persona con su nombre, puesto y foto. El portagafete es la funda o el broche donde se coloca esa tarjeta, y el cordón es la cinta que se cuelga al cuello. ${site.nombre} hace la tarjeta: tus gafetes y credenciales.`,
  },
  {
    pregunta: "¿Qué gafetes o credenciales no hacen?",
    respuesta:
      "No hacemos identificaciones oficiales ni documentos de gobierno, y tampoco gafetes o credenciales de una empresa distinta a la que hace el pedido. Solo producimos identificaciones internas de tu propia organización, y por eso verificamos tu empresa antes del primer pedido (con tu constancia fiscal, tu INE y una prueba de tu negocio, o un correo de tu empresa): el nombre debe coincidir con el de los gafetes.",
  },
  {
    pregunta: "¿Cómo protegen mi cuenta y la de mi equipo?",
    respuesta:
      "Con varias capas. Verificamos cada empresa a mano y revisamos su primer pedido antes de producirlo. Limitamos los intentos para entrar, usamos una verificación contra robots en los formularios y revisamos de forma automática cada foto e identificación que se sube. En el portal «Mi gafete», el NIP no puede ser fácil de adivinar y se bloquea tras varios intentos fallidos, y las invitaciones a tu plataforma vencen a las 24 horas. El pago se hace en la página segura de Stripe, con la verificación de tu banco (3D Secure).",
  },
  {
    pregunta: "¿Qué pasa con los datos y las fotos de mis empleados?",
    respuesta:
      "Se usan únicamente para producir y administrar tus gafetes. No se venden ni se usan para publicidad, y puedes pedir que se eliminen. El detalle está en nuestro aviso de privacidad.",
  },
];
