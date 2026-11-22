/**
 * Precios, envío y cálculo de cotizaciones. Única fuente: las tablas, el
 * cotizador, el PDF, el correo, schema.org y llms.txt leen de aquí.
 * Todos los importes están en pesos mexicanos y ANTES de IVA.
 */

import { type Material, type MaterialId, materialPara } from "./materiales";

/** Precio por pieza del gafete impreso a una cara en PVC estándar, según la cantidad. */
export type Tramo = { desde: number; hasta: number | null; precio: number };

export const tramos: Tramo[] = [
  { desde: 1, hasta: 9, precio: 85 },
  { desde: 10, hasta: 29, precio: 60 },
  { desde: 30, hasta: 99, precio: 45 },
  { desde: 100, hasta: 299, precio: 36 },
  { desde: 300, hasta: null, precio: 30 },
];

/** Extra por pieza cuando el gafete va impreso por frente y vuelta: también baja con la cantidad. */
export const tramosDosCaras: Tramo[] = [
  { desde: 1, hasta: 29, precio: 12 },
  { desde: 30, hasta: 99, precio: 10 },
  { desde: 100, hasta: null, precio: 8 },
];

export function extraDosCaras(cantidad: number): number {
  const tramo =
    tramosDosCaras.find((t) => cantidad >= t.desde && (t.hasta === null || cantidad <= t.hasta)) ??
    tramosDosCaras[tramosDosCaras.length - 1];
  return tramo.precio;
}

export const extraDosCarasMinimo = Math.min(...tramosDosCaras.map((t) => t.precio));
export const extraDosCarasMaximo = Math.max(...tramosDosCaras.map((t) => t.precio));

/** Precio por pieza del gafete digital: el mismo si va solo o sumado a uno impreso. */
export const precioDigital = 10;

export const tasaIva = 0.16;
export const notaIva = "más IVA";

export const envio = {
  /** Tarifa única a cualquier parte de México para pedidos con gafetes impresos. */
  tarifa: 149,
  /** Subtotal (antes de IVA) a partir del cual el envío es gratis. Con 0, siempre es gratis. */
  gratisDesde: 1500,
};

export type Modalidad = "impreso" | "digital" | "ambos";

export const modalidades: { id: Modalidad; nombre: string; resumen: string }[] = [
  { id: "impreso", nombre: "Impreso", resumen: "Gafete de PVC que llega a tu empresa." },
  { id: "digital", nombre: "Digital", resumen: "Gafete en el celular, con código QR verificable." },
  { id: "ambos", nombre: "Impreso + digital", resumen: "El gafete de PVC y su versión digital." },
];

export function nombreModalidad(m: Modalidad): string {
  return modalidades.find((x) => x.id === m)?.nombre ?? "Impreso";
}

export const precioMinimo = Math.min(...tramos.map((t) => t.precio));
export const precioMaximo = Math.max(...tramos.map((t) => t.precio));

/**
 * Paquetes prepagados: se compran gafetes impresos por adelantado y se van
 * pidiendo de a poquitos. Cada paquete incluye cierto número de envíos.
 */
export type Paquete = { piezas: number; porPieza: number; envios: number };

export const paquetes: Paquete[] = [
  { piezas: 10, porPieza: 79, envios: 2 },
  { piezas: 25, porPieza: 62, envios: 3 },
  { piezas: 50, porPieza: 52, envios: 4 },
  { piezas: 100, porPieza: 42, envios: 6 },
];

export const paqueteVigenciaMeses = 12;

export const precioPaquete = (p: Paquete) => p.piezas * p.porPieza;

export function tramoPara(cantidad: number): Tramo {
  return (
    tramos.find((t) => cantidad >= t.desde && (t.hasta === null || cantidad <= t.hasta)) ??
    tramos[tramos.length - 1]
  );
}

export type Opciones = { modalidad?: Modalidad; dosCaras?: boolean; material?: MaterialId };

export type Cotizacion = {
  piezas: number;
  modalidad: Modalidad;
  dosCaras: boolean;
  /** Material del gafete impreso; no aplica en la modalidad digital. */
  material: Material | null;
  /** Renglones que explican el precio por pieza. */
  conceptos: { nombre: string; porPieza: number }[];
  porPieza: number;
  subtotal: number;
  /** Solo los pedidos con gafetes impresos llevan envío. */
  llevaEnvio: boolean;
  envio: number;
  envioGratis: boolean;
  /** Cuánto falta en el subtotal para que el envío sea gratis (0 si ya lo es o no aplica). */
  faltaParaEnvioGratis: number;
  iva: number;
  total: number;
};

/** Limita la cantidad a un entero entre 1 y 100,000. */
export function normalizarCantidad(cantidad: number): number {
  return Math.min(100000, Math.max(1, Math.floor(Number(cantidad)) || 1));
}

export function cotizar(cantidad: number, opciones: Opciones = {}): Cotizacion {
  const piezas = normalizarCantidad(cantidad);
  const modalidad = opciones.modalidad ?? "impreso";
  const impreso = modalidad !== "digital";
  const dosCaras = impreso && Boolean(opciones.dosCaras);
  const material = impreso ? materialPara(opciones.material) : null;
  const tramo = tramoPara(piezas);

  const conceptos: Cotizacion["conceptos"] = [];
  if (impreso) {
    conceptos.push({ nombre: "Gafete impreso en PVC, una cara", porPieza: tramo.precio });
    if (material && material.extra > 0) {
      conceptos.push({ nombre: `Material: ${material.nombre}`, porPieza: material.extra });
    }
    if (dosCaras) conceptos.push({ nombre: "Impresión por frente y vuelta", porPieza: extraDosCaras(piezas) });
    if (modalidad === "ambos") conceptos.push({ nombre: "Gafete digital", porPieza: precioDigital });
  } else {
    conceptos.push({ nombre: "Gafete digital", porPieza: precioDigital });
  }

  const porPieza = conceptos.reduce((suma, c) => suma + c.porPieza, 0);
  const subtotal = porPieza * piezas;
  const envioGratis = impreso && subtotal >= envio.gratisDesde;
  const costoEnvio = impreso && !envioGratis ? envio.tarifa : 0;
  const iva = Math.round((subtotal + costoEnvio) * tasaIva * 100) / 100;

  return {
    piezas,
    modalidad,
    dosCaras,
    material,
    conceptos,
    porPieza,
    subtotal,
    llevaEnvio: impreso,
    envio: costoEnvio,
    envioGratis,
    faltaParaEnvioGratis: impreso && !envioGratis ? envio.gratisDesde - subtotal : 0,
    iva,
    total: Math.round((subtotal + costoEnvio + iva) * 100) / 100,
  };
}

export function rangoTexto(t: Tramo): string {
  return t.hasta === null ? `${t.desde} o más` : `${t.desde} a ${t.hasta}`;
}

/** "$1,500" o "$1,740.50": sin centavos cuando el importe es entero. */
export function pesos(n: number): string {
  const entero = Number.isInteger(n);
  return `$${n.toLocaleString("es-MX", {
    minimumFractionDigits: entero ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

/** "$12 de 1 a 29 piezas, $10 de 30 a 99 y $8 de 100 o más". */
export const extraDosCarasDetalle = tramosDosCaras
  .map((t) => `${pesos(t.precio)} de ${rangoTexto(t)}${t === tramosDosCaras[0] ? " piezas" : ""}`)
  .join(", ")
  .replace(/, ([^,]*)$/, " y $1");

/** "de $8 a $12". */
export const extraDosCarasRango = `de ${pesos(extraDosCarasMinimo)} a ${pesos(extraDosCarasMaximo)}`;

export const envioGratisTexto =
  envio.gratisDesde > 0 ? `Envío gratis desde ${pesos(envio.gratisDesde)}` : "Envío gratis";
