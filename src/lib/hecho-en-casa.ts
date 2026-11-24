/**
 * Supuestos de la calculadora «¿Cuánto te cuesta imprimirlo tú mismo?».
 * Son estimaciones del estudio de mercado (24 nov 2026) para un gafete de
 * papel o cartón hecho en la oficina: impreso, recortado, enmicado y perforado.
 * El precio de LaGafetería NO vive aquí: sale de `cotizar()` en `precios.ts`,
 * para que la calculadora se actualice sola cuando cambien los precios.
 */

import { cotizar } from "./precios";

export type Rango = { min: number; max: number; omision: number; paso: number };

/** Materiales por gafete: hoja o cartulina, tinta, mica para enmicar, cordón o clip. */
export const materialesCasa: Rango = { min: 9, max: 16, omision: 12, paso: 1 };

/** Minutos de trabajo por gafete: acomodar el diseño, imprimir, recortar, enmicar y perforar. */
export const minutosCasa: Rango = { min: 6, max: 15, omision: 10, paso: 1 };

/** Lo que cuesta una hora de quien los hace, con prestaciones. */
export const costoHoraCasa = { omision: 100, min: 0, max: 2000 };

/** Gafetes al mes con que abre la calculadora. */
export const gafetesMesOmision = 100;
export const gafetesMesMaximo = 5000;

export type ComparacionCasa = {
  gafetes: number;
  casa: { porPieza: number; mes: number; horasMes: number };
  /** Un pedido al mes en PVC a una cara, con el envío prorrateado. Antes de IVA. */
  nosotros: { porPieza: number; mes: number; envio: number };
  /** Positivo: lo que te ahorras al mes con LaGafetería. Negativo: hacerlo tú sale más barato. */
  ahorroMes: number;
};

const centavos = (n: number) => Math.round(n * 100) / 100;

export function costoCasaPorPieza(materiales: number, minutos: number, costoHora: number): number {
  return centavos(materiales + (minutos / 60) * costoHora);
}

export function compararCasa(
  gafetes: number,
  materiales: number,
  minutos: number,
  costoHora: number,
): ComparacionCasa {
  const casaPieza = costoCasaPorPieza(materiales, minutos, costoHora);
  const cot = cotizar(gafetes);
  const n = cot.piezas;
  const nosotrosMes = cot.subtotal + cot.envio;
  const casaMes = centavos(casaPieza * n);
  return {
    gafetes: n,
    casa: { porPieza: casaPieza, mes: casaMes, horasMes: (n * minutos) / 60 },
    nosotros: { porPieza: centavos(nosotrosMes / n), mes: nosotrosMes, envio: cot.envio },
    ahorroMes: centavos(casaMes - nosotrosMes),
  };
}

/**
 * A partir de cuántos gafetes al mes LaGafetería sale más barato (o igual) que
 * hacerlos en casa, con esos supuestos, y así sigue con cualquier cantidad mayor.
 * null si con ninguna cantidad del rango conviene.
 */
export function gafetesParaQueConvenga(materiales: number, minutos: number, costoHora: number): number | null {
  for (let n = gafetesMesMaximo; n >= 1; n--) {
    if (compararCasa(n, materiales, minutos, costoHora).ahorroMes < 0) {
      return n === gafetesMesMaximo ? null : n + 1;
    }
  }
  return 1;
}
