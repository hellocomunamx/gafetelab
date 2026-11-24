/**
 * Supuestos de la calculadora «¿Cuánto te cuesta imprimirlo tú mismo?».
 * Son estimaciones del estudio de mercado (24 nov 2026) para un gafete de
 * papel o cartón hecho en la oficina: impreso, recortado, enmicado y perforado.
 * El precio de LaGafetería NO vive aquí: sale de `cotizar()` en `precios.ts`,
 * para que la calculadora se actualice sola cuando cambien los precios.
 */

import { cotizar, type Paquete, paqueteVigenciaMeses, paquetes } from "./precios";

export type Rango = { min: number; max: number; omision: number; paso: number };

/** Materiales por gafete: hoja o cartulina, tinta, mica para enmicar, cordón o clip. */
export const materialesCasa: Rango = { min: 9, max: 20, omision: 12, paso: 1 };

/** Minutos de trabajo por gafete: acomodar el diseño, imprimir, recortar, enmicar y perforar. */
export const minutosCasa: Rango = { min: 6, max: 15, omision: 10, paso: 1 };

/**
 * Porcentaje de gafetes que se vuelven a hacer (E): mica con burbuja, nombre mal
 * escrito, foto movida o gafete de papel que se dobla o despega. Repite
 * materiales y tiempo.
 */
export const mermaCasa: Rango = { min: 0, max: 30, omision: 10, paso: 5 };

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

/** Supuestos de quien hace los gafetes en casa. `merma` en porcentaje. */
export type SupuestosCasa = { materiales: number; minutos: number; costoHora: number; merma: number };

export function costoCasaPorPieza({ materiales, minutos, costoHora, merma }: SupuestosCasa): number {
  return centavos((materiales + (minutos / 60) * costoHora) * (1 + merma / 100));
}

export function compararCasa(gafetes: number, supuestos: SupuestosCasa): ComparacionCasa {
  const casaPieza = costoCasaPorPieza(supuestos);
  const cot = cotizar(gafetes);
  const n = cot.piezas;
  const nosotrosMes = cot.subtotal + cot.envio;
  const casaMes = centavos(casaPieza * n);
  return {
    gafetes: n,
    casa: { porPieza: casaPieza, mes: casaMes, horasMes: (n * supuestos.minutos * (1 + supuestos.merma / 100)) / 60 },
    nosotros: { porPieza: centavos(nosotrosMes / n), mes: nosotrosMes, envio: cot.envio },
    ahorroMes: centavos(casaMes - nosotrosMes),
  };
}

/**
 * A partir de cuántos gafetes al mes LaGafetería sale más barato (o igual) que
 * hacerlos en casa, con esos supuestos, y así sigue con cualquier cantidad mayor.
 * null si con ninguna cantidad del rango conviene.
 */
export function gafetesParaQueConvenga(supuestos: SupuestosCasa): number | null {
  for (let n = gafetesMesMaximo; n >= 1; n--) {
    if (compararCasa(n, supuestos).ahorroMes < 0) {
      return n === gafetesMesMaximo ? null : n + 1;
    }
  }
  return 1;
}

/**
 * Para quien pide pocos al mes: el paquete prepagado más grande que se alcanza
 * a usar dentro de su vigencia, con su precio por pieza (envíos incluidos) y
 * para cuántos meses rinde. null si ninguno cabe.
 */
export function paqueteSugerido(gafetesMes: number): { paquete: Paquete; meses: number } | null {
  const n = Math.max(1, Math.floor(gafetesMes));
  const paquete = [...paquetes].reverse().find((p) => p.piezas <= n * paqueteVigenciaMeses);
  return paquete ? { paquete, meses: Math.floor(paquete.piezas / n) } : null;
}
