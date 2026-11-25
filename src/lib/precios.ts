/**
 * Precios, envío y cálculo de cotizaciones. Única fuente: las tablas, el
 * cotizador, el PDF, el correo, schema.org y llms.txt leen de aquí.
 * Todos los importes están en pesos mexicanos y ANTES de IVA.
 */

import { type Material, type MaterialId, materialBase, materialPara } from "./materiales";

/** Precio por pieza del gafete impreso a una cara en PVC estándar, según la cantidad. */
export type Tramo = { desde: number; hasta: number | null; precio: number };

export const tramos: Tramo[] = [
  { desde: 1, hasta: 9, precio: 85 },
  { desde: 10, hasta: 29, precio: 60 },
  { desde: 30, hasta: 99, precio: 39 },
  { desde: 100, hasta: 499, precio: 22 },
  { desde: 500, hasta: null, precio: 18 },
];

/** Extra por pieza cuando el gafete va impreso por frente y vuelta: también baja con la cantidad. */
export const tramosDosCaras: Tramo[] = [
  { desde: 1, hasta: 29, precio: 12 },
  { desde: 30, hasta: 99, precio: 10 },
  { desde: 100, hasta: null, precio: 5 },
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

/**
 * Cordón liso con broche, del color de la categoría, como agregado de un
 * pedido de evento. Precio por pieza (propuesta, por confirmar con Gloria).
 */
export const precioCordon = 12;

export const tasaIva = 0.16;
export const notaIva = "más IVA";

export const envio = {
  /** Tarifa única a cualquier parte de México para pedidos con gafetes impresos. */
  tarifa: 199,
  /** Subtotal (antes de IVA) a partir del cual el envío es gratis. Con 0, siempre es gratis. */
  gratisDesde: 1500,
};

export type Modalidad = "impreso" | "digital" | "ambos";

export const modalidades: { id: Modalidad; nombre: string; resumen: string }[] = [
  { id: "impreso", nombre: "Impreso", resumen: "Gafete de PVC que llega a tu empresa." },
  { id: "digital", nombre: "Digital", resumen: "Gafete en el celular, con código QR verificable. Pago único." },
  { id: "ambos", nombre: "Impreso + digital", resumen: "El gafete de PVC y su versión digital." },
];

export function nombreModalidad(m: Modalidad): string {
  return modalidades.find((x) => x.id === m)?.nombre ?? "Impreso";
}

export const precioMinimo = Math.min(...tramos.map((t) => t.precio));
export const precioMaximo = Math.max(...tramos.map((t) => t.precio));

/**
 * Paquetes prepagados: se compran gafetes impresos por adelantado y se van
 * pidiendo de a poquitos. Cada paquete incluye cierto número de envíos y sale
 * un poco más barato por pieza que pedir esa misma cantidad suelta.
 */
export type Paquete = { piezas: number; porPieza: number; envios: number };

export const paquetes: Paquete[] = [
  { piezas: 10, porPieza: 55, envios: 1 },
  { piezas: 25, porPieza: 52, envios: 3 },
  { piezas: 50, porPieza: 36, envios: 4 },
  { piezas: 100, porPieza: 20, envios: 4 },
];

export const paqueteVigenciaMeses = 12;

/** «1 envío» o «3 envíos». */
export const textoEnvios = (n: number) => `${n} ${n === 1 ? "envío" : "envíos"}`;

/**
 * Qué incluye un paquete de lista y qué no. Lo leen todas las vistas donde
 * aparecen los paquetes, los términos, Gafi y llms.txt: cambiarlo aquí lo
 * cambia en todos lados.
 */
export const paqueteIncluye = [
  "Gafetes impresos en PVC estándar de 0.76 mm, el grosor de una tarjeta bancaria.",
  "Impresión a una sola cara.",
  "Los envíos que marca cada paquete, a cualquier parte de México: uno por pedido.",
  `${paqueteVigenciaMeses} meses para usarlos, a partir de la compra.`,
];

/** Para usarse después de «No incluye». */
export const paqueteNoIncluye = "gafete digital, frente y vuelta, PVC compuesto o adhesivo, cordones ni portagafetes";

/** La regla para todo lo que no sea igual a lo que se compró en el paquete. */
export const paqueteDistinto =
  "Si necesitas algo distinto (frente y vuelta, PVC compuesto o adhesivo, gafete digital, cordón u otro accesorio), eso no se toma del paquete: se cobra aparte, a precio normal.";

/** Cómo se usa lo prepagado: aplica a paquetes de lista y a la medida. */
export const paqueteSaldoIguales =
  "Cada gafete prepagado cubre solo un gafete igual al que compraste: mismas caras y mismo material.";

/** Lo que pasa al terminarse los envíos incluidos. */
export const paqueteEnviosExtra = `Cuando se terminan los envíos del paquete, cada pedido paga su envío como cualquier otro: ${"$"}${envio.tarifa} ${notaIva}, o gratis desde ${"$"}${envio.gratisDesde.toLocaleString("es-MX")}.`;

/** A centavos: los paquetes tienen precio por pieza con decimales. */
const centavos = (n: number) => Math.round(n * 100) / 100;

export const precioPaquete = (p: Paquete) => centavos(p.piezas * p.porPieza);

/**
 * Paquete a la medida: la empresa combina varios tipos de gafete (cada renglón
 * con su cantidad, sus caras y su material) y los deja prepagados juntos.
 * El precio base por pieza y los envíos incluidos salen del paquete de lista
 * más grande que cabe en el total de piezas; la vuelta y el material se suman
 * por pieza, igual que en un pedido normal.
 */
export const paqueteMinimoPiezas = paquetes[0].piezas;
export const paqueteMaximoPiezas = 5000;
export const paqueteMaximoRenglones = 6;

export type RenglonPaquete = { piezas: number; dosCaras: boolean; material: MaterialId };

export type CotizacionPaquete = {
  piezas: number;
  /** Falta llegar al mínimo de piezas. */
  incompleto: boolean;
  basePorPieza: number;
  envios: number;
  renglones: { piezas: number; dosCaras: boolean; material: Material; porPieza: number; importe: number }[];
  subtotal: number;
  iva: number;
  total: number;
  /** Si con unas piezas más baja el precio por pieza: cuántas faltan y a cuánto baja. */
  siguiente: { faltan: number; porPieza: number } | null;
};

export function cotizarPaquete(renglones: RenglonPaquete[]): CotizacionPaquete {
  const limpios = renglones
    .slice(0, paqueteMaximoRenglones)
    .map((r) => ({ ...r, piezas: Math.min(paqueteMaximoPiezas, Math.max(0, Math.floor(Number(r.piezas)) || 0)) }))
    .filter((r) => r.piezas > 0);
  const piezas = limpios.reduce((suma, r) => suma + r.piezas, 0);
  const base = [...paquetes].reverse().find((p) => piezas >= p.piezas) ?? paquetes[0];
  const mayor = paquetes.find((p) => p.piezas > piezas && p.porPieza < base.porPieza);
  const detalle = limpios.map((r) => {
    const material = materialPara(r.material);
    const porPieza = base.porPieza + material.extra + (r.dosCaras ? extraDosCaras(piezas) : 0);
    return { piezas: r.piezas, dosCaras: r.dosCaras, material, porPieza, importe: centavos(porPieza * r.piezas) };
  });
  const subtotal = centavos(detalle.reduce((suma, r) => suma + r.importe, 0));
  const iva = Math.round(subtotal * tasaIva * 100) / 100;
  return {
    piezas,
    incompleto: piezas < paqueteMinimoPiezas,
    basePorPieza: base.porPieza,
    envios: base.envios,
    renglones: detalle,
    subtotal,
    iva,
    total: Math.round((subtotal + iva) * 100) / 100,
    siguiente: mayor && piezas >= paqueteMinimoPiezas ? { faltan: mayor.piezas - piezas, porPieza: mayor.porPieza } : null,
  };
}

export function tramoPara(cantidad: number): Tramo {
  return (
    tramos.find((t) => cantidad >= t.desde && (t.hasta === null || cantidad <= t.hasta)) ??
    tramos[tramos.length - 1]
  );
}

export type Opciones = {
  modalidad?: Modalidad;
  dosCaras?: boolean;
  material?: MaterialId;
  /** Piezas de un paquete prepagado de lista: se cotiza el paquete en lugar de piezas sueltas. */
  paquete?: number;
};

/** El paquete de lista con esas piezas, o null si no existe. */
export const paquetePara = (piezas: unknown): Paquete | null =>
  paquetes.find((p) => p.piezas === Number(piezas)) ?? null;

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
  /** Paquete prepagado cotizado: sus envíos ya van incluidos en el precio. */
  paquete: Paquete | null;
};

/** Limita la cantidad a un entero entre 1 y 100,000. */
export function normalizarCantidad(cantidad: number): number {
  return Math.min(100000, Math.max(1, Math.floor(Number(cantidad)) || 1));
}

export function cotizar(cantidad: number, opciones: Opciones = {}): Cotizacion {
  const modalidad = opciones.modalidad ?? "impreso";
  // Los paquetes prepagados son de gafetes impresos, sin la versión digital.
  const paquete = modalidad === "impreso" ? paquetePara(opciones.paquete) : null;
  const piezas = paquete ? paquete.piezas : normalizarCantidad(cantidad);
  const impreso = modalidad !== "digital";
  // Los paquetes de lista son siempre de PVC estándar a una cara.
  const dosCaras = impreso && !paquete && Boolean(opciones.dosCaras);
  const material = impreso ? (paquete ? materialBase : materialPara(opciones.material)) : null;
  const tramo = tramoPara(piezas);

  const conceptos: Cotizacion["conceptos"] = [];
  if (paquete) {
    conceptos.push({ nombre: `Paquete prepagado de ${paquete.piezas} gafetes, PVC estándar a una cara`, porPieza: paquete.porPieza });
  } else if (impreso) {
    conceptos.push({ nombre: "Gafete impreso en PVC, una cara", porPieza: tramo.precio });
    if (material && material.extra > 0) {
      conceptos.push({ nombre: `Material: ${material.nombre}`, porPieza: material.extra });
    }
    if (dosCaras) conceptos.push({ nombre: "Impresión por frente y vuelta", porPieza: extraDosCaras(piezas) });
    if (modalidad === "ambos") conceptos.push({ nombre: "Gafete digital", porPieza: precioDigital });
  } else {
    conceptos.push({ nombre: "Gafete digital", porPieza: precioDigital });
  }

  const porPieza = centavos(conceptos.reduce((suma, c) => suma + c.porPieza, 0));
  const subtotal = centavos(porPieza * piezas);
  // En un paquete los envíos ya van incluidos en el precio por pieza.
  const envioGratis = impreso && !paquete && subtotal >= envio.gratisDesde;
  const costoEnvio = impreso && !paquete && !envioGratis ? envio.tarifa : 0;
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
    faltaParaEnvioGratis: impreso && !paquete && !envioGratis ? envio.gratisDesde - subtotal : 0,
    iva,
    total: Math.round((subtotal + costoEnvio + iva) * 100) / 100,
    paquete,
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

/** Una escala de precios en una frase: "$12 de 1 a 29 piezas, $10 de 30 a 99 y $8 de 100 o más". */
export const escalaTexto = (escala: Tramo[]) =>
  escala
    .map((t, i) => `${pesos(t.precio)} de ${rangoTexto(t)}${i === 0 ? " piezas" : ""}`)
    .join(", ")
    .replace(/, ([^,]*)$/, " y $1");

export const tramosDetalle = escalaTexto(tramos);
export const extraDosCarasDetalle = escalaTexto(tramosDosCaras);

/** "de $8 a $12". */
export const extraDosCarasRango = `de ${pesos(extraDosCarasMinimo)} a ${pesos(extraDosCarasMaximo)}`;

export const envioGratisTexto =
  envio.gratisDesde > 0 ? `Envío gratis desde ${pesos(envio.gratisDesde)}` : "Envío gratis";
