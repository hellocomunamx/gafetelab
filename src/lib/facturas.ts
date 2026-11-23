/**
 * Facturas hechas a mano en el portal del SAT.
 * Aquí está lo que comparten la cuenta de la empresa y el panel: el plazo para
 * pedir factura, los datos listos para copiar al SAT y la lectura del XML.
 */
import { materialPara } from "@/lib/materiales";
import type { FacturacionCopiada } from "@/lib/pedidos/reglas";
import { regimenesFiscales, usosCfdi } from "@/lib/cuenta/catalogos";

export type EstadoFactura = "por_emitir" | "emitida" | "cancelada";
export const estadosFactura: Record<EstadoFactura, string> = {
  por_emitir: "Por emitir",
  emitida: "Emitida",
  cancelada: "Cancelada",
};
export const esEstadoFactura = (v: string | null | undefined): v is EstadoFactura => Boolean(v) && (v as string) in estadosFactura;

/** Pedidos cuyo dinero ya entró y no se devolvió: son los que se facturan. */
export const ESTADOS_FACTURABLES = ["pagado", "en_produccion", "enviado", "entregado"];

/** Archivos que se aceptan al emitir. */
export const facturaArchivoMaximo = 2 * 1024 * 1024;

/** Anotaciones de la bitácora del pedido sobre su factura. */
export const eventosFactura: Record<string, string> = {
  factura_pedida: "La empresa pidió factura",
  factura_cambiada: "La empresa cambió los datos de su factura",
  factura_emitida: "Marcaste la factura como emitida",
  factura_enviada: "Se le mandó la factura a la empresa por correo",
  factura_reabierta: "Regresaste la factura a «por emitir»",
  factura_cancelada: "Marcaste la factura como cancelada en el SAT",
};

/** Sonora no cambia de horario: siempre UTC-7. */
const SONORA_MS = 7 * 60 * 60 * 1000;

/**
 * Hasta cuándo puede pedir factura (o cambiar sus datos) la empresa: el último
 * instante del mes, en hora de Sonora, en que pagó el pedido (o lo hizo, si no
 * lo ha pagado). Después, la venta va en la factura global de ese mes.
 */
export function plazoFactura(pedido: { pagado_en: string | null; creado_en: string }): Date {
  const local = new Date(new Date(pedido.pagado_en ?? pedido.creado_en).getTime() - SONORA_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 1) + SONORA_MS - 1);
}
export const dentroDelPlazo = (pedido: { pagado_en: string | null; creado_en: string }) => plazoFactura(pedido).getTime() > Date.now();

export const nombreRegimen = (clave: string) => regimenesFiscales.find((r) => r.clave === clave)?.nombre ?? "";
export const nombreUso = (clave: string) => usosCfdi.find((u) => u.clave === clave)?.nombre ?? "";

/** Forma de pago del SAT según cómo se cobró en Stripe. */
export function formaPagoSat(metodo: string | null): { clave: string; nombre: string; nota?: string } {
  if (metodo === "oxxo") return { clave: "01", nombre: "Efectivo" };
  if (metodo === "spei") return { clave: "03", nombre: "Transferencia electrónica de fondos" };
  if (metodo === "tarjeta") {
    return { clave: "04", nombre: "Tarjeta de crédito", nota: "Si en Stripe dice que fue de débito, usa 28 (Tarjeta de débito)." };
  }
  return { clave: "99", nombre: "Por definir", nota: "Revisa en Stripe cómo se pagó." };
}

export type PedidoFacturable = {
  folio: string;
  piezas: number;
  material: string | null;
  dos_caras: boolean;
  por_pieza: number | string;
  subtotal: number | string;
  envio: number | string;
  iva: number | string;
  total: number | string;
  metodo: string | null;
};

export type ConceptoSat = { descripcion: string; cantidad: number; unidad: string; valorUnitario: number; importe: number };

/** Los renglones de la factura, con importes antes de IVA, como se capturan en el SAT. */
export function conceptosSat(p: PedidoFacturable): ConceptoSat[] {
  const material = materialPara(p.material);
  const conceptos: ConceptoSat[] = [
    {
      descripcion: `Gafete de identificación impreso, ${material.nombre}, ${p.dos_caras ? "frente y vuelta" : "una cara"}. Pedido ${p.folio}`,
      cantidad: p.piezas,
      unidad: "H87 Pieza",
      valorUnitario: Number(p.por_pieza),
      importe: Number(p.subtotal),
    },
  ];
  if (Number(p.envio) > 0) {
    conceptos.push({
      descripcion: `Envío del pedido ${p.folio}`,
      cantidad: 1,
      unidad: "E48 Unidad de servicio",
      valorUnitario: Number(p.envio),
      importe: Number(p.envio),
    });
  }
  return conceptos;
}

export const cifra = (n: number) => n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Lo que se lee del XML timbrado, para no capturarlo a mano y detectar errores. */
export type LecturaXml = { folioFiscal: string | null; rfcReceptor: string | null; total: number | null };

export function leerXmlCfdi(xml: string): LecturaXml {
  const atributo = (etiqueta: string, nombre: string) => {
    const nodo = xml.match(new RegExp(`<(?:[\\w-]+:)?${etiqueta}\\b[^>]*>`, "i"))?.[0];
    return nodo?.match(new RegExp(`\\s${nombre}\\s*=\\s*"([^"]*)"`))?.[1] ?? null;
  };
  const folio = atributo("TimbreFiscalDigital", "UUID");
  const total = atributo("Comprobante", "Total");
  return {
    folioFiscal: folio && /^[0-9a-f-]{36}$/i.test(folio) ? folio.toUpperCase() : null,
    rfcReceptor: atributo("Receptor", "Rfc")?.toUpperCase() ?? null,
    total: total !== null && Number.isFinite(Number(total)) ? Number(total) : null,
  };
}

/** Diferencias entre el XML subido y lo que pidió la empresa. Vacío si todo cuadra. */
export function diferenciasXml(lectura: LecturaXml, datos: FacturacionCopiada, total: number): string[] {
  const avisos: string[] = [];
  if (!lectura.folioFiscal) avisos.push("No encontré el folio fiscal (UUID) en el XML. ¿Es el XML timbrado?");
  if (lectura.rfcReceptor && lectura.rfcReceptor !== datos.rfc.toUpperCase()) {
    avisos.push(`El XML está a nombre del RFC ${lectura.rfcReceptor}, pero la empresa pidió ${datos.rfc}.`);
  }
  if (lectura.total !== null && Math.abs(lectura.total - total) > 0.01) {
    avisos.push(`El total del XML es $${cifra(lectura.total)} y el del pedido es $${cifra(total)}.`);
  }
  return avisos;
}
