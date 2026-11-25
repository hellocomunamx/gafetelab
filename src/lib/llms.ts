/**
 * Contenido de /llms.txt y /llms-full.txt (formato llmstxt.org): un resumen del
 * sitio en Markdown para asistentes de IA. Se genera con los mismos datos que
 * las páginas, así que nunca se desfasa.
 */
import { faqsGenerales } from "./faqs";
import { giros } from "./giros";
import { pasos } from "./pasos";
import { pago } from "./pedidos/reglas";
import {
  envio,
  extraDosCaras,
  extraDosCarasDetalle,
  extraDosCarasRango,
  notaIva,
  paqueteDistinto,
  paqueteMinimoPiezas,
  paqueteNoIncluye,
  paqueteSaldoIguales,
  paqueteVigenciaMeses,
  paquetes,
  pesos,
  precioCordon,
  precioDigital,
  precioMaximo,
  precioMinimo,
  rangoTexto,
  tramos,
  textoEnviosIncluidos,
} from "./precios";
import { grosorTexto, materiales, medidas, zonas } from "./materiales";
import { faqsMedidas, guiaMedidasTexto, medidaCorta, rutaGuiaMedidas } from "./guia-medidas";
import { accionesPlataforma, ajustesPlataforma, formasDeCargar, funcionesPlataforma, verificaciones } from "./plataforma";
import { rutasCiudades, rutasGiros, rutasPrincipales } from "./rutas";
import { adicionalesPendientes } from "./contacto";
import { eventosResumen } from "./eventos-publico";
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
    `- Producto: gafetes y credenciales para empleados en tres modalidades: impreso (PVC rígido tamaño CR80, 8.6 × 5.4 cm, a una cara o por frente y vuelta), digital (en el celular) o impreso + digital. Todos pueden llevar un código QR con página de verificación (vigente, expirado, no válido o aún no activo), incluida sin costo extra; la empresa decide qué datos muestra, o si el código lleva a una liga propia o contiene solo un dato.`,
    `- Precio impreso: de ${pesos(precioMinimo)} a ${pesos(precioMaximo)} MXN por pieza a una cara, ${notaIva}, según la cantidad. Frente y vuelta: ${extraDosCarasRango} MXN más por pieza, según la cantidad (${extraDosCarasDetalle}); en un pedido con diseños distintos, solo se cobra a los gafetes que llevan vuelta.`,
    `- Precio digital: ${pesos(precioDigital)} MXN por pieza, ${notaIva}, en cualquier cantidad, solo o sumado a un gafete impreso. Es un pago único por gafete, no un cobro recurrente, y sigue activo mientras la cuenta de la empresa esté activa y no lo desactive.`,
    `- Materiales: ${materiales.filter((m) => m.disponible).map((m) => `${m.nombre} de ${grosorTexto(m)}${m.extra ? `, ${pesos(m.extra)} más por pieza` : ""}`).join("; ")}.`,
    `- Paquetes prepagados: ${paquetes.map((p) => `${p.piezas} gafetes por ${pesos(p.piezas * p.porPieza)} MXN con ${textoEnviosIncluidos(p.envios)}`).join("; ")}. Vigencia de ${paqueteVigenciaMeses} meses. Son de PVC estándar impresos a una cara y no incluyen ${paqueteNoIncluye}. ${paqueteSaldoIguales} ${paqueteDistinto}`,
    `- Medida de un gafete: tamaño estándar CR80 (ISO/IEC 7810 ID-1), ${medidaCorta}, igual que una tarjeta bancaria; grosor de 0.76 mm. Guía de tamaños y glosario: ${urlAbsoluta(rutaGuiaMedidas)}`,
    `- Archivo de diseño: gafete de ${medidas.ancho} × ${medidas.alto} mm; archivo con margen de corte (sangrado) de ${zonas[0].medida} a ${medidas.resolucionDpi} dpi; textos a ${medidas.margenSeguro} mm o más del corte.`,
    `- Forma de pago: pago único por gafete. No hay suscripción, mensualidad ni costo por usar la plataforma.`,
    `- Medios de pago: tarjeta de crédito o débito, efectivo en OXXO o transferencia (SPEI), en línea desde la plataforma. Los pedidos de ${pago.soloTransferenciaDesdePiezas} gafetes o más, o de ${pesos(pago.soloTransferenciaDesdeTotal)} MXN o más, se pagan solo por transferencia.`,
    `- Cancelación: con tarjeta hay ${pago.minutosDeGracia} minutos después de pagar para cancelar desde la plataforma sin que se haga el cargo; con OXXO o SPEI se cancela sin costo mientras no se haya pagado. Después, y antes de que el pedido entre a producción, se cancela por correo con devolución completa.`,
    `- Pedido mínimo: ninguno, desde 1 pieza.`,
    `- Entrega: ${entregaTexto}. Entrega exprés: próximamente.`,
    `- Envío: a todo México desde ${site.estadoBase}, con tarifa única de ${pesos(envio.tarifa)} MXN; gratis en pedidos desde ${pesos(envio.gratisDesde)} MXN antes de IVA.`,
    `- Cotización: el precio no se pide por correo. El cotizador en línea (${urlAbsoluta("/cotizar")}) muestra al momento precio, envío, IVA, total y entrega sin pedir datos, y permite descargar la cotización en PDF o recibirla por correo.`,
    `- Plataforma: incluida con la cuenta, sin costo extra (sin mensualidad, sin costo por usuario y sin pedido mínimo). Hoy incluye: ${funciones(false)}.${funciones(true) ? ` Próximamente: ${funciones(true)}.` : ""}`,
    `- Administración del equipo: ${accionesPlataforma.map((a) => a.titulo.toLowerCase()).join(", ")}. Ajustes de la empresa: ${ajustesPlataforma.map((a) => a.titulo.toLowerCase()).join(", ")}.`,
    `- Carga de datos del equipo: ${formasDeCargar.map((f) => `${f.titulo.charAt(0).toLowerCase()}${f.titulo.slice(1)}${f.pronto ? " (próximamente)" : ""}`).join("; ")}.`,
    `- Portal de empleados «Mi gafete»: cada empresa tiene su liga (${site.dominio}/e/<empresa>). Cada persona entra desde su celular, sin crear cuenta, con un código que le llega a su correo o con su número de empleado y un NIP de 6 números (la empresa le da uno temporal y la persona crea el suyo; se bloquea tras varios intentos fallidos). Desde ahí pide cambiar su foto, corregir sus datos o reponer su gafete; la empresa aprueba o rechaza con motivo en una sola bandeja y la persona ve el estado. Incluido sin costo extra.`,
    `- Liga para subir datos y foto: la empresa manda una liga por persona (copiada, por correo o por WhatsApp con el mensaje ya escrito); la persona llena sus datos y se toma la foto sin crear cuenta. La liga se cierra al enviar y solo se reabre si la empresa pide una corrección, que explica qué cambiar y por qué.`,
    `- Cambio de foto desde el gafete digital: la persona propone una foto nueva y la empresa la compara con la anterior antes de aceptarla; si también tiene gafete impreso, la empresa puede pedir su reposición.`,
    `- Avisos por correo para quien administra: por cada tipo (cambios de foto, datos y fotos por aprobar, solicitudes del portal) se elige al momento, resumen semanal los lunes (solo si hay pendientes) o ninguno. Sin elegir, llega el resumen semanal.`,
    `- Usuarios: la empresa invita por correo a otras personas con rol de dueño, administrador o editor; la invitación vence a las 24 horas y se puede reenviar. Una misma cuenta puede administrar varias empresas. Se entra con correo y contraseña o con Google.`,
    `- Diseño: los datos del equipo se guardan una vez y en cada diseño se elige qué se imprime y en qué cara; el nombre es opcional (gafetes genéricos). Diseños por reglas: un diseño distinto según puesto, departamento, sucursal, tipo de contrato o cualquier dato propio.`,
    `- Compra en línea: carrito con paquetes prepagados de lista o a la medida, o lo calculado en el cotizador; se pide cuenta solo al pagar. Los gafetes prepagados quedan a favor de la empresa y se usan primero en los siguientes pedidos.`,
    `- Seguimiento: la plataforma muestra el estado de cada pedido (pagado, en producción, enviado, entregado) y el cliente recibe un correo en cada paso: pedido recibido, en producción, enviado (con la paquetería y el número de guía) y entregado.`,
    `- Eventos: ${eventosResumen}.`,
    `- Calculadora «¿Cuánto te cuesta imprimirlo tú mismo?» (${urlAbsoluta("/calculadora")}): compara el costo real de hacer los gafetes en la oficina (materiales, tiempo de quien los hace y los que se repiten) contra pedirlos impresos en PVC, con los precios vigentes. Gratis y sin dejar datos.`,
    `- Verificaciones (todo lo que se verifica, sin costo extra): ${verificaciones.map((c) => `${c.titulo.charAt(0).toLowerCase()}${c.titulo.slice(1)} (${c.texto.charAt(0).toLowerCase()}${c.texto.slice(1).replace(/\.$/, "")})`).join("; ")}.`,
    `- Cómo se pide: en línea, con plantillas o diseño propio, campos variables (nombre, puesto, número, foto, código QR), carga del equipo y vista previa de cada gafete antes de pagar.`,
    `- Paquete a la medida: desde ${paqueteMinimoPiezas} gafetes, combinando cantidades, una cara o frente y vuelta, y materiales; el precio base por pieza es el del paquete de lista que corresponde al total.`,
    `- Requisito antes del primer pedido: verificar la empresa, con la opción que elija: su ${constancia.nombre} (no más de ${site.constanciaMeses} meses de antigüedad), INE más una prueba del negocio (liga a redes o Google Maps, o foto del local) si no tiene RFC, o un correo con el dominio de la empresa. Además acepta una carta de responsabilidad y la revisión es manual. El nombre debe coincidir con la empresa que aparece en los gafetes.`,
    `- Devoluciones: los gafetes son personalizados y no se devuelven por cambio de opinión. Se puede cancelar sin costo antes de producción. Los defectos de impresión o de material se reportan dentro de ${legal.plazoDefectosDias} días naturales desde la entrega y se reponen sin costo.`,
    `- Adicionales: en pedidos de eventos se puede agregar un cordón con broche del color de cada categoría (${pesos(precioCordon)} MXN por pieza, ${notaIva}). Todavía no se venden ${adicionalesPendientes}.`,
    `- Factura: sí (CFDI).`,
    `- Contacto: formulario en ${urlAbsoluta("/contacto")} o ${site.correo}`,
  ].join("\n");

export function llmsTxt(): string {
  return `# ${site.nombre}

> ${site.nombre} es una tienda en línea mexicana dedicada a la administración e impresión de gafetes y credenciales para empleados o asistentes a eventos. Los hace impresos en PVC o digitales. El pedido es guiado: plantilla o diseño propio, carga del equipo con Excel, una por una, con las fotos de todos juntas o con una liga para que cada persona suba sus datos y su foto, vista previa de cada gafete y precio con envío desde el primer paso. Incluye, sin costo extra, una plataforma para administrar los gafetes del equipo y un portal de empleados, «Mi gafete», donde cada persona pide cambiar su foto, corregir sus datos o reponer su gafete y la empresa solo aprueba. Envía a todo México.

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
        `### Gafetes y credenciales para ${g.nombre}\n\n${g.respuesta}\n\nCampos recomendados: ${g.campos.join(", ")}.\n\nConsejo: ${g.consejo}\n\nLo que más le sirve de la plataforma: ${g.plataforma.map((f) => `${f.titulo}: ${f.texto}`).join(" ")}\n\nMás información: ${urlAbsoluta(`/gafetes-para/${g.slug}`)}`,
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

## Medidas de gafetes y glosario

${guiaMedidasTexto(urlAbsoluta(rutaGuiaMedidas))}

${preguntas(faqsMedidas)}

## Por giro

${porGiro}
`;
}
