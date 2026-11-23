/**
 * Gafete digital como producto: el pedido puede ser impreso, digital o los
 * dos. Lo digital cuesta lo mismo en cualquier cantidad, no lleva envío y se
 * paga una sola vez. Primero se usan los gafetes digitales del saldo
 * prepagado de la empresa y solo se cobra lo que falte.
 *
 * Lo comparten el navegador (para mostrar el total) y el servidor (que lo
 * vuelve a calcular y aparta el saldo antes de cobrar).
 */

import type { MaterialId } from "@/lib/materiales";
import { cotizar, type Modalidad, precioDigital, tasaIva } from "@/lib/precios";
import { type ConceptoCobro, cotizarConSaldo, type PedidoConSaldo, type SaldoDisponible } from "./saldo";

export type PedidoCotizado = PedidoConSaldo & {
  modalidad: Modalidad;
  /** Gafetes digitales que salen del saldo. */
  digitalesDeSaldo: number;
};

const redondear = (n: number) => Math.round(n * 100) / 100;

export const llevaImpreso = (m: Modalidad) => m !== "digital";
export const llevaDigital = (m: Modalidad) => m !== "impreso";

export const esModalidad = (v: unknown): v is Modalidad => v === "impreso" || v === "digital" || v === "ambos";

/** Lo digital de un pedido: primero del saldo (los que vencen antes), luego a precio de lista. */
function parteDigital(piezas: number, saldos: SaldoDisponible[]) {
  const disponibles = saldos
    .filter((s) => s.concepto === "digitales" && s.disponible > 0)
    .sort((a, b) => a.venceEn.localeCompare(b.venceEn));
  const plan: PedidoConSaldo["plan"] = [];
  let faltan = piezas;
  for (const s of disponibles) {
    if (!faltan) break;
    const cantidad = Math.min(faltan, s.disponible);
    plan.push({ saldo: s.id, cantidad });
    faltan -= cantidad;
  }
  const deSaldo = piezas - faltan;
  const conceptos: ConceptoCobro[] = [];
  if (deSaldo)
    conceptos.push({
      nombre: "Gafetes digitales de tu saldo prepagado",
      cantidad: deSaldo,
      precio: 0,
    });
  if (faltan)
    conceptos.push({
      nombre: "Gafete digital, pago único",
      cantidad: faltan,
      precio: precioDigital,
    });
  return { plan, deSaldo, conceptos };
}

/**
 * Cuánto cuesta un pedido de cualquier modalidad usando el saldo. Lo impreso
 * sale de `cotizarConSaldo`, sin cambios; lo digital se suma aparte.
 */
export function cotizarPedido(
  piezas: number,
  opciones: { modalidad: Modalidad; dosCaras: boolean; material: MaterialId },
  saldos: SaldoDisponible[],
): PedidoCotizado {
  const { modalidad } = opciones;
  if (modalidad === "impreso")
    return {
      ...cotizarConSaldo(piezas, opciones, saldos),
      modalidad,
      digitalesDeSaldo: 0,
    };

  const digital = parteDigital(Math.max(1, Math.floor(piezas) || 1), saldos);

  if (modalidad === "digital") {
    const n = Math.max(1, Math.floor(piezas) || 1);
    const subtotal = digital.conceptos.reduce((s, x) => s + x.cantidad * x.precio, 0);
    const iva = redondear(subtotal * tasaIva);
    return {
      modalidad,
      piezas: n,
      deSaldo: 0,
      digitalesDeSaldo: digital.deSaldo,
      envioDeSaldo: false,
      plan: digital.plan,
      conceptos: digital.conceptos,
      porPieza: precioDigital,
      subtotal,
      envio: 0,
      envioGratis: false,
      faltaParaEnvioGratis: 0,
      iva,
      total: redondear(subtotal + iva),
    };
  }

  // Impreso + digital: lo impreso tal cual y lo digital sumado. El envío gratis
  // se calcula como en el cotizador público, contando también lo digital.
  const impreso = cotizarConSaldo(piezas, opciones, saldos);
  const lista = cotizar(impreso.piezas, {
    modalidad: "ambos",
    dosCaras: opciones.dosCaras,
    material: opciones.material,
  });
  const envio = impreso.envioDeSaldo ? 0 : lista.envio;
  const conceptos = [...impreso.conceptos, ...digital.conceptos];
  const subtotal = conceptos.reduce((s, x) => s + x.cantidad * x.precio, 0);
  const iva = redondear((subtotal + envio) * tasaIva);
  return {
    ...impreso,
    modalidad,
    digitalesDeSaldo: digital.deSaldo,
    plan: [...impreso.plan, ...digital.plan],
    conceptos,
    porPieza: impreso.porPieza + precioDigital,
    subtotal,
    envio,
    envioGratis: lista.envioGratis,
    faltaParaEnvioGratis: impreso.envioDeSaldo ? 0 : lista.faltaParaEnvioGratis,
    iva,
    total: redondear(subtotal + envio + iva),
  };
}
