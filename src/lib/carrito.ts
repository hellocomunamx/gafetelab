/**
 * Carrito de compra: lo que se agrega desde los paquetes, el paquete a la
 * medida y el cotizador. Lo que se compra en el carrito queda como saldo de
 * gafetes prepagados de la empresa, que se usa después al hacer un pedido con
 * su equipo y su diseño.
 *
 * Este archivo lo comparten el navegador (que guarda el carrito) y el servidor
 * (que vuelve a calcular todo antes de cobrar). Los precios salen de `precios.ts`.
 */

import { type MaterialId, materiales, materialPara } from "./materiales";
import {
  cotizar,
  cotizarPaquete,
  type Modalidad,
  normalizarCantidad,
  paqueteMaximoRenglones,
  paquetes,
  pesos,
  precioPaquete,
  tasaIva,
  textoEnvios,
} from "./precios";

export type ArticuloCarrito =
  /** Gafetes del cotizador (impresos, digitales o los dos), al precio por cantidad; los impresos con su envío. */
  | { id: string; tipo: "gafetes"; piezas: number; modalidad: Modalidad; dosCaras: boolean; material: MaterialId }
  /** Un paquete prepagado de lista. */
  | { id: string; tipo: "paquete"; piezas: number }
  /** Un paquete prepagado a la medida. */
  | { id: string; tipo: "medida"; renglones: { piezas: number; dosCaras: boolean; material: MaterialId }[] };

/** Lo que queda en el saldo de la empresa al pagar un artículo. */
export type SaldoNuevo =
  | { concepto: "gafetes"; cantidad: number; dosCaras: boolean; material: MaterialId }
  | { concepto: "envios"; cantidad: number }
  /** Gafetes digitales: se activan desde la plataforma. */
  | { concepto: "digitales"; cantidad: number };

export type ArticuloCotizado = {
  nombre: string;
  detalle: string[];
  /** Gafetes que trae. */
  piezas: number;
  /** Envíos que trae. */
  envios: number;
  /** Importe antes de IVA. */
  subtotal: number;
  saldos: SaldoNuevo[];
};

export const carritoMaximoArticulos = 12;
/** Gafetes por compra: el mismo tope que un pedido. */
export const carritoMaximoPiezas = 5000;

const caras = (dosCaras: boolean) => (dosCaras ? "Frente y vuelta" : "Una cara");
const nombreMaterial = (id: MaterialId) => materialPara(id).nombre;
const enteroEntre = (v: unknown, min: number, max: number) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};
const materialValido = (v: unknown): MaterialId | null =>
  materiales.some((m) => m.id === v && m.disponible) ? (v as MaterialId) : null;

/**
 * Limpia un artículo que viene del navegador o de lo guardado. Devuelve null si
 * no es válido (por ejemplo, un paquete que ya no existe).
 */
export function limpiarArticulo(a: unknown): ArticuloCarrito | null {
  if (!a || typeof a !== "object") return null;
  const x = a as Record<string, unknown>;
  const id = typeof x.id === "string" && /^[\w-]{1,40}$/.test(x.id) ? x.id : null;
  if (!id) return null;
  if (x.tipo === "gafetes") {
    const piezas = enteroEntre(x.piezas, 1, carritoMaximoPiezas);
    const material = materialValido(x.material);
    const modalidad: Modalidad = x.modalidad === "digital" || x.modalidad === "ambos" ? x.modalidad : "impreso";
    return piezas && material ? { id, tipo: "gafetes", piezas, modalidad, dosCaras: x.dosCaras === true, material } : null;
  }
  if (x.tipo === "paquete") {
    const p = paquetes.find((q) => q.piezas === x.piezas);
    return p ? { id, tipo: "paquete", piezas: p.piezas } : null;
  }
  if (x.tipo === "medida" && Array.isArray(x.renglones)) {
    const renglones = x.renglones.slice(0, paqueteMaximoRenglones).map((r) => {
      const y = (r ?? {}) as Record<string, unknown>;
      const piezas = enteroEntre(y.piezas, 1, carritoMaximoPiezas);
      const material = materialValido(y.material);
      return piezas && material ? { piezas, dosCaras: y.dosCaras === true, material } : null;
    });
    if (!renglones.length || renglones.some((r) => !r)) return null;
    const limpio = { id, tipo: "medida" as const, renglones: renglones as NonNullable<(typeof renglones)[number]>[] };
    return cotizarArticulo(limpio) ? limpio : null;
  }
  return null;
}

/** Precio y contenido de un artículo. Null si no se puede vender así. */
export function cotizarArticulo(a: ArticuloCarrito): ArticuloCotizado | null {
  if (a.tipo === "gafetes") {
    const piezas = normalizarCantidad(a.piezas);
    const modalidad = a.modalidad ?? "impreso";
    const c = cotizar(piezas, { modalidad, dosCaras: a.dosCaras, material: a.material });
    const impreso = modalidad !== "digital";
    const digital = modalidad !== "impreso";
    const cuantos = piezas.toLocaleString("es-MX");
    const uno = piezas === 1;
    const nombre =
      modalidad === "digital"
        ? `${cuantos} ${uno ? "gafete digital" : "gafetes digitales"}`
        : modalidad === "ambos"
          ? `${cuantos} ${uno ? "gafete impreso + digital" : "gafetes impresos + digitales"}`
          : `${cuantos} ${uno ? "gafete impreso" : "gafetes impresos"}`;
    return {
      nombre,
      detalle: [
        impreso
          ? `${caras(a.dosCaras)}, ${nombreMaterial(a.material)}${digital ? ", con su versión digital" : ""}: ${pesos(c.porPieza)} por pieza`
          : `En el celular, con código QR verificable: ${pesos(c.porPieza)} por pieza, pago único`,
        impreso ? (c.envioGratis ? "Incluye 1 envío gratis" : `Incluye 1 envío (${pesos(c.envio)})`) : "Sin envío: se activan en tu plataforma",
      ],
      piezas,
      envios: impreso ? 1 : 0,
      subtotal: c.subtotal + c.envio,
      saldos: [
        ...(impreso ? [{ concepto: "gafetes" as const, cantidad: piezas, dosCaras: a.dosCaras, material: a.material }] : []),
        ...(digital ? [{ concepto: "digitales" as const, cantidad: piezas }] : []),
        ...(impreso ? [{ concepto: "envios" as const, cantidad: 1 }] : []),
      ],
    };
  }
  if (a.tipo === "paquete") {
    const p = paquetes.find((q) => q.piezas === a.piezas);
    if (!p) return null;
    return {
      nombre: `Paquete de ${p.piezas} gafetes prepagados`,
      detalle: [`Una cara, PVC estándar: ${pesos(p.porPieza)} por pieza`, `Incluye ${textoEnvios(p.envios)}`, "Sin gafete digital"],
      piezas: p.piezas,
      envios: p.envios,
      subtotal: precioPaquete(p),
      saldos: [
        { concepto: "gafetes", cantidad: p.piezas, dosCaras: false, material: "estandar" },
        { concepto: "envios", cantidad: p.envios },
      ],
    };
  }
  const c = cotizarPaquete(a.renglones);
  if (c.incompleto || c.piezas > carritoMaximoPiezas) return null;
  return {
    // Un solo tipo de gafete (como el que sale del cotizador) es un paquete de lista con otras opciones.
    nombre: `${c.renglones.length === 1 ? "Paquete" : "Paquete a la medida"} de ${c.piezas.toLocaleString("es-MX")} gafetes prepagados`,
    detalle: [
      ...c.renglones.map(
        (r) => `${r.piezas.toLocaleString("es-MX")} · ${caras(r.dosCaras)}, ${r.material.nombre}: ${pesos(r.porPieza)} por pieza`,
      ),
      `Incluye ${textoEnvios(c.envios)}`,
    ],
    piezas: c.piezas,
    envios: c.envios,
    subtotal: c.subtotal,
    saldos: [
      ...c.renglones.map((r) => ({ concepto: "gafetes" as const, cantidad: r.piezas, dosCaras: r.dosCaras, material: r.material.id })),
      { concepto: "envios", cantidad: c.envios },
    ],
  };
}

export type CarritoCotizado = {
  articulos: (ArticuloCotizado & { id: string })[];
  piezas: number;
  envios: number;
  subtotal: number;
  iva: number;
  total: number;
  /** Algo impide pagar: demasiadas piezas o artículos. */
  problema: string | null;
};

export function cotizarCarrito(articulos: ArticuloCarrito[]): CarritoCotizado {
  const cotizados = articulos.flatMap((a) => {
    const c = cotizarArticulo(a);
    return c ? [{ ...c, id: a.id }] : [];
  });
  const piezas = cotizados.reduce((s, a) => s + a.piezas, 0);
  const subtotal = cotizados.reduce((s, a) => s + a.subtotal, 0);
  const iva = Math.round(subtotal * tasaIva * 100) / 100;
  let problema: string | null = null;
  if (cotizados.length > carritoMaximoArticulos) problema = `Tu carrito puede llevar hasta ${carritoMaximoArticulos} artículos.`;
  else if (piezas > carritoMaximoPiezas) {
    problema = `Una compra lleva hasta ${carritoMaximoPiezas.toLocaleString("es-MX")} gafetes. Divide tu carrito en dos compras.`;
  }
  return {
    articulos: cotizados,
    piezas,
    envios: cotizados.reduce((s, a) => s + a.envios, 0),
    subtotal,
    iva,
    total: Math.round((subtotal + iva) * 100) / 100,
    problema,
  };
}

/** Un id corto para cada artículo del carrito. */
export const idArticulo = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
