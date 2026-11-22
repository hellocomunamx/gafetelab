/**
 * Reglas de los pedidos que comparten el navegador y el servidor: estados,
 * límites y con qué se puede pagar. Los precios siguen en `src/lib/precios.ts`.
 */

export type EstadoPedido =
  | "por_pagar"
  | "pago_en_proceso"
  | "autorizado"
  | "pagado"
  | "en_produccion"
  | "enviado"
  | "entregado"
  | "cancelado"
  | "reembolsado";

export const estadosPedido: Record<EstadoPedido, { nombre: string; texto: string }> = {
  por_pagar: { nombre: "Por pagar", texto: "Tu pedido está guardado. Empezamos a producirlo en cuanto se confirme el pago." },
  pago_en_proceso: {
    nombre: "Esperando tu pago",
    texto: "Ya tienes tu ficha o tus datos de transferencia. En cuanto llegue el dinero, te avisamos y empezamos.",
  },
  autorizado: {
    nombre: "Pago autorizado",
    texto: "Tu tarjeta ya autorizó el pago. Todavía puedes cancelar sin costo; después se hace el cargo y empezamos.",
  },
  pagado: { nombre: "Pagado", texto: "Recibimos tu pago. Estamos revisando tu pedido para mandarlo a producción." },
  en_produccion: { nombre: "En producción", texto: "Estamos imprimiendo tus gafetes y credenciales." },
  enviado: { nombre: "Enviado", texto: "Tu pedido va en camino." },
  entregado: { nombre: "Entregado", texto: "Tu pedido llegó a su destino." },
  cancelado: { nombre: "Cancelado", texto: "Este pedido se canceló y no se cobró." },
  reembolsado: { nombre: "Reembolsado", texto: "Te devolvimos el pago de este pedido." },
};

export const esEstadoPedido = (v: string): v is EstadoPedido => v in estadosPedido;

/** Pasos que ve la empresa en el avance de su pedido. */
export const pasosPedido: EstadoPedido[] = ["por_pagar", "pagado", "en_produccion", "enviado", "entregado"];

/** Gafetes por pedido. */
export const pedidoMaximoPiezas = 5000;
/** Pedidos sin pagar que una empresa puede tener abiertos a la vez. */
export const pedidosAbiertosMaximo = 5;

/**
 * Con qué se puede pagar. Los pedidos grandes solo se pagan por transferencia
 * (SPEI), que no admite contracargos; OXXO solo sirve hasta cierto importe por ficha.
 */
export const pago = {
  /** Desde cuántas piezas el pedido se paga solo por transferencia. */
  soloTransferenciaDesdePiezas: 300,
  /** Desde qué total (con IVA) el pedido se paga solo por transferencia. */
  soloTransferenciaDesdeTotal: 10000,
  /** Días que dura la ficha de OXXO. */
  diasFichaOxxo: 3,
  /**
   * Minutos de gracia con tarjeta: el cargo queda solo autorizado y la empresa
   * puede cancelar sin costo. Pasados los minutos, se cobra.
   */
  minutosDeGracia: 30,
};

/** ¿Siguen corriendo los minutos de gracia de un pedido autorizado? */
export const sigueEnGracia = (hasta: string | null) => Boolean(hasta) && new Date(hasta as string).getTime() > Date.now();

export const soloTransferencia = (piezas: number, total: number) =>
  piezas >= pago.soloTransferenciaDesdePiezas || total >= pago.soloTransferenciaDesdeTotal;

export type MetodoPago = "tarjeta" | "oxxo" | "spei";
export const metodosPago: Record<MetodoPago, string> = {
  tarjeta: "Tarjeta",
  oxxo: "Efectivo en OXXO",
  spei: "Transferencia (SPEI)",
};

/** El método de pago dentro de una frase: "pagado con tarjeta". */
export const metodosPagoEnFrase: Record<MetodoPago, string> = {
  tarjeta: "tarjeta",
  oxxo: "efectivo en OXXO",
  spei: "transferencia (SPEI)",
};
export const esMetodoPago = (v: string | null): v is MetodoPago => Boolean(v) && (v as string) in metodosPago;

/** ¿Hace falta que la administradora revise el pedido antes de producirlo? */
export const requiereRevision = (p: { primer_pedido: boolean; alertas: string[] }) =>
  p.primer_pedido || p.alertas.length > 0;

/** Copia de la persona que se guarda en cada gafete del pedido (`gafetes.datos`). */
export type CaraCopiada = { ruta: string; ancho: number; alto: number };
export type GafeteCopiado = {
  nombre: string;
  numero: string | null;
  /** Con un diseño: sus datos por campo, lo que lleva su QR y la ruta de su foto. */
  valores?: Record<string, string>;
  qr?: string;
  foto?: string | null;
  /** Con gafetes listos: las imágenes que subió la empresa. */
  frente?: CaraCopiada | null;
  vuelta?: CaraCopiada | null;
};

/** Copias de la dirección y de los datos de facturación que se guardan en el pedido. */
export type DireccionCopiada = {
  destinatario: string;
  telefono: string;
  calle: string;
  colonia: string;
  ciudad: string;
  estado: string;
  cp: string;
  referencias: string | null;
};
export type FacturacionCopiada = {
  rfc: string;
  razon_social: string;
  regimen_fiscal: string;
  cp_fiscal: string;
  uso_cfdi: string;
  correo: string;
};

/** Evidencia de la aprobación, para una disputa. */
export type AprobacionPedido = {
  vista_previa: boolean;
  terminos_version: string | null;
  aviso_version: string | null;
  correo: string | null;
  ip: string | null;
  navegador: string | null;
  en: string;
};

export const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Hermosillo",
  });
