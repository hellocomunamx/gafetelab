/**
 * Saldo de gafetes prepagados: lo que la empresa compró en el carrito y todavía
 * no usa. Al hacer un pedido, primero se usa el saldo y solo se cobra lo que
 * falte. Lo comparten el navegador (para mostrar el total) y el servidor (que
 * lo vuelve a calcular y lo aparta antes de cobrar).
 */

import { type MaterialId, materialPara } from "@/lib/materiales";
import { cotizar, tasaIva } from "@/lib/precios";

export type SaldoDisponible = {
  id: string;
  concepto: "gafetes" | "envios" | "digitales";
  material: MaterialId | null;
  dosCaras: boolean;
  /** Lo que queda por usar. */
  disponible: number;
  venceEn: string;
};

export type ConceptoCobro = { nombre: string; cantidad: number; precio: number };

export type PedidoConSaldo = {
  piezas: number;
  /** Gafetes que salen del saldo. */
  deSaldo: number;
  /** ¿El envío sale del saldo? */
  envioDeSaldo: boolean;
  /** Qué se aparta de cada saldo. */
  plan: { saldo: string; cantidad: number }[];
  conceptos: ConceptoCobro[];
  /** Precio normal por pieza de este pedido, para los gafetes que no cubre el saldo. */
  porPieza: number;
  subtotal: number;
  envio: number;
  envioGratis: boolean;
  faltaParaEnvioGratis: number;
  iva: number;
  total: number;
};

const redondear = (n: number) => Math.round(n * 100) / 100;

/**
 * Cuánto cuesta un pedido usando el saldo. Solo se usan los gafetes del saldo
 * idénticos a los del pedido (mismas caras y mismo material), primero los que
 * vencen antes. Lo distinto no se toma del saldo: se cobra completo, a precio
 * normal, y el saldo queda intacto.
 */
export function cotizarConSaldo(
  piezas: number,
  opciones: { dosCaras: boolean; material: MaterialId },
  saldos: SaldoDisponible[],
): PedidoConSaldo {
  const c = cotizar(piezas, { modalidad: "impreso", dosCaras: opciones.dosCaras, material: opciones.material });
  const gafetes = saldos
    .filter(
      (s) =>
        s.concepto === "gafetes" &&
        s.disponible > 0 &&
        s.dosCaras === opciones.dosCaras &&
        (s.material ?? "estandar") === opciones.material,
    )
    .sort((a, b) => a.venceEn.localeCompare(b.venceEn));

  const plan: PedidoConSaldo["plan"] = [];
  let faltan = c.piezas;
  for (const s of gafetes) {
    if (!faltan) break;
    const cantidad = Math.min(faltan, s.disponible);
    plan.push({ saldo: s.id, cantidad });
    faltan -= cantidad;
  }
  const deSaldo = c.piezas - faltan;

  const envioSaldo = saldos.filter((s) => s.concepto === "envios" && s.disponible > 0).sort((a, b) => a.venceEn.localeCompare(b.venceEn))[0];
  // Los envíos del paquete van con sus gafetes: solo se usan si el pedido lleva gafetes del saldo.
  const envioDeSaldo = Boolean(deSaldo && c.llevaEnvio && envioSaldo && c.envio > 0);
  if (envioDeSaldo && envioSaldo) plan.push({ saldo: envioSaldo.id, cantidad: 1 });

  const conceptos: ConceptoCobro[] = [];
  if (deSaldo) conceptos.push({ nombre: "Gafetes de tu saldo prepagado", cantidad: deSaldo, precio: 0 });
  if (faltan) conceptos.push({ nombre: `Gafetes impresos en ${materialPara(opciones.material).nombre}, ${opciones.dosCaras ? "frente y vuelta" : "una cara"}`, cantidad: faltan, precio: c.porPieza });

  const subtotal = conceptos.reduce((s, x) => s + x.cantidad * x.precio, 0);
  const envio = envioDeSaldo ? 0 : c.envio;
  const iva = redondear((subtotal + envio) * tasaIva);
  return {
    piezas: c.piezas,
    deSaldo,
    envioDeSaldo,
    plan,
    conceptos,
    porPieza: c.porPieza,
    subtotal,
    envio,
    envioGratis: c.envioGratis,
    faltaParaEnvioGratis: envioDeSaldo ? 0 : c.faltaParaEnvioGratis,
    iva,
    total: redondear(subtotal + envio + iva),
  };
}

/** Totales del saldo para mostrarlo: gafetes y envíos que quedan. */
export const resumenSaldo = (saldos: SaldoDisponible[]) => ({
  gafetes: saldos.filter((s) => s.concepto === "gafetes").reduce((t, s) => t + s.disponible, 0),
  envios: saldos.filter((s) => s.concepto === "envios").reduce((t, s) => t + s.disponible, 0),
  digitales: saldos.filter((s) => s.concepto === "digitales").reduce((t, s) => t + s.disponible, 0),
});
