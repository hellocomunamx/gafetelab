/**
 * Saldo de gafetes prepagados: lo que la empresa compró en el carrito y todavía
 * no usa. Al hacer un pedido, primero se usa el saldo y solo se cobra lo que
 * falte. Lo comparten el navegador (para mostrar el total) y el servidor (que
 * lo vuelve a calcular y lo aparta antes de cobrar).
 */

import { type MaterialId, materialPara } from "@/lib/materiales";
import { cotizar, envio, tasaIva } from "@/lib/precios";

export type SaldoDisponible = {
  id: string;
  concepto: "gafetes" | "envios" | "digitales";
  material: MaterialId | null;
  dosCaras: boolean;
  /** Lo que queda por usar. */
  disponible: number;
  venceEn: string;
};

export type ConceptoCobro = {
  nombre: string;
  cantidad: number;
  precio: number;
  /** En los gafetes impresos: si llevan vuelta. */
  dosCaras?: boolean;
};

export type PedidoConSaldo = {
  piezas: number;
  /** Gafetes impresos que llevan vuelta: solo a ellos se les cobra. */
  conVuelta: number;
  /** Importe de los gafetes a precio de lista, sin saldo: con él se decide el envío gratis. */
  lista: number;
  /** Gafetes que salen del saldo. */
  deSaldo: number;
  /** ¿El envío sale del saldo? */
  envioDeSaldo: boolean;
  /** Qué se aparta de cada saldo. */
  plan: { saldo: string; cantidad: number }[];
  conceptos: ConceptoCobro[];
  /** Precio normal por pieza; si unos llevan vuelta y otros no, el promedio. */
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
 * Cuánto cuesta un pedido usando el saldo. La vuelta solo se cobra a los
 * gafetes que la llevan (`conVuelta`); el precio por pieza sale del total de
 * piezas del pedido. Solo se usan los gafetes del saldo idénticos a los del
 * pedido (mismas caras y mismo material), primero los que vencen antes: el
 * saldo de una cara no cubre un gafete con vuelta. Lo distinto se cobra
 * completo, a precio normal, y el saldo queda intacto.
 */
export function cotizarConSaldo(
  piezas: number,
  opciones: { conVuelta: number; material: MaterialId },
  saldos: SaldoDisponible[],
): PedidoConSaldo {
  const unaCara = cotizar(piezas, { modalidad: "impreso", dosCaras: false, material: opciones.material });
  const total = unaCara.piezas;
  const conVuelta = Math.min(total, Math.max(0, Math.floor(opciones.conVuelta) || 0));
  const dosCaras = conVuelta ? cotizar(total, { modalidad: "impreso", dosCaras: true, material: opciones.material }) : null;
  const grupos = [
    { dosCaras: false, piezas: total - conVuelta, porPieza: unaCara.porPieza },
    { dosCaras: true, piezas: conVuelta, porPieza: dosCaras?.porPieza ?? 0 },
  ].filter((g) => g.piezas > 0);
  const mixto = grupos.length > 1;
  const caras = (dos: boolean) => (dos ? "frente y vuelta" : "una cara");

  const plan: PedidoConSaldo["plan"] = [];
  const conceptos: ConceptoCobro[] = [];
  let deSaldo = 0;
  for (const g of grupos) {
    const iguales = saldos
      .filter(
        (s) =>
          s.concepto === "gafetes" &&
          s.disponible > 0 &&
          s.dosCaras === g.dosCaras &&
          (s.material ?? "estandar") === opciones.material,
      )
      .sort((a, b) => a.venceEn.localeCompare(b.venceEn));
    let faltan = g.piezas;
    for (const s of iguales) {
      if (!faltan) break;
      const cantidad = Math.min(faltan, s.disponible);
      plan.push({ saldo: s.id, cantidad });
      faltan -= cantidad;
    }
    const usados = g.piezas - faltan;
    deSaldo += usados;
    if (usados)
      conceptos.push({
        nombre: `Gafetes de tu saldo prepagado${mixto ? `, ${caras(g.dosCaras)}` : ""}`,
        cantidad: usados,
        precio: 0,
        dosCaras: g.dosCaras,
      });
    if (faltan)
      conceptos.push({
        nombre: `Gafetes impresos en ${materialPara(opciones.material).nombre}, ${caras(g.dosCaras)}`,
        cantidad: faltan,
        precio: g.porPieza,
        dosCaras: g.dosCaras,
      });
  }

  // El envío gratis se calcula con el precio de lista de todo el pedido, como en el cotizador.
  const lista = redondear(grupos.reduce((s, g) => s + g.piezas * g.porPieza, 0));
  const envioGratis = lista >= envio.gratisDesde;
  const costoEnvio = envioGratis ? 0 : envio.tarifa;
  const envioSaldo = saldos.filter((s) => s.concepto === "envios" && s.disponible > 0).sort((a, b) => a.venceEn.localeCompare(b.venceEn))[0];
  // Los envíos del paquete van con sus gafetes: solo se usan si el pedido lleva gafetes del saldo.
  const envioDeSaldo = Boolean(deSaldo && envioSaldo && costoEnvio > 0);
  if (envioDeSaldo && envioSaldo) plan.push({ saldo: envioSaldo.id, cantidad: 1 });

  const subtotal = redondear(conceptos.reduce((s, x) => s + x.cantidad * x.precio, 0));
  const envioCobrado = envioDeSaldo ? 0 : costoEnvio;
  const iva = redondear((subtotal + envioCobrado) * tasaIva);
  return {
    piezas: total,
    conVuelta,
    lista,
    deSaldo,
    envioDeSaldo,
    plan,
    conceptos,
    porPieza: mixto ? redondear(lista / total) : grupos[0].porPieza,
    subtotal,
    envio: envioCobrado,
    envioGratis,
    faltaParaEnvioGratis: envioDeSaldo || envioGratis ? 0 : redondear(envio.gratisDesde - lista),
    iva,
    total: redondear(subtotal + envioCobrado + iva),
  };
}

/** Totales del saldo para mostrarlo: gafetes y envíos que quedan. */
export const resumenSaldo = (saldos: SaldoDisponible[]) => ({
  gafetes: saldos.filter((s) => s.concepto === "gafetes").reduce((t, s) => t + s.disponible, 0),
  envios: saldos.filter((s) => s.concepto === "envios").reduce((t, s) => t + s.disponible, 0),
  digitales: saldos.filter((s) => s.concepto === "digitales").reduce((t, s) => t + s.disponible, 0),
});

/** Cómo van impresos los gafetes de un pedido, para mostrarlo: una cara, frente y vuelta o los dos. */
export function carasDelPedido(dosCaras: boolean, conceptos: ConceptoCobro[] | null): string {
  const mixto = conceptos?.some((x) => x.dosCaras === true) && conceptos.some((x) => x.dosCaras === false);
  return mixto ? "Unos a una cara y otros por frente y vuelta" : dosCaras ? "Frente y vuelta" : "Una cara";
}
