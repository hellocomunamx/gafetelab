/**
 * Precios por pieza. Única fuente: la tabla de /precios, la calculadora,
 * el schema.org de Product y llms.txt leen de aquí.
 */
export type Tramo = { desde: number; hasta: number | null; precio: number };

export const tramos: Tramo[] = [
  { desde: 1, hasta: 9, precio: 85 },
  { desde: 10, hasta: 29, precio: 60 },
  { desde: 30, hasta: 99, precio: 45 },
  { desde: 100, hasta: 299, precio: 36 },
  { desde: 300, hasta: null, precio: 30 },
];

/** Extra por pieza cuando el gafete va impreso por frente y vuelta. */
export const extraDosCaras = 12;

/** Los precios publicados no incluyen IVA. */
export const ivaIncluido = false;
export const notaIva = ivaIncluido ? "IVA incluido" : "más IVA";

export const precioMinimo = Math.min(...tramos.map((t) => t.precio));
export const precioMaximo = Math.max(...tramos.map((t) => t.precio));

export function tramoPara(cantidad: number): Tramo {
  return (
    tramos.find((t) => cantidad >= t.desde && (t.hasta === null || cantidad <= t.hasta)) ??
    tramos[tramos.length - 1]
  );
}

export function cotizar(cantidad: number, dosCaras: boolean) {
  const piezas = Math.max(1, Math.floor(cantidad) || 1);
  const porPieza = tramoPara(piezas).precio + (dosCaras ? extraDosCaras : 0);
  return { piezas, porPieza, subtotal: porPieza * piezas };
}

export function rangoTexto(t: Tramo): string {
  return t.hasta === null ? `${t.desde} o más` : `${t.desde} a ${t.hasta}`;
}

export function pesos(n: number): string {
  return `$${n.toLocaleString("es-MX")}`;
}
