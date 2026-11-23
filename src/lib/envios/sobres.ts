/**
 * Cómo se empaca un pedido de gafetes y credenciales para mandarlo por paquetería.
 *
 * Cada gafete de PVC (CR80, 0.76 mm) pesa unos 5.5 g y mide 0.076 cm de grueso.
 * Se manda en sobre acolchado de 25 × 18 cm; con 100 gafetes queda de unos
 * 10 cm de alto y pesa unos 0.6 kg, de modo que ni el peso real ni el
 * volumétrico (largo × ancho × alto ÷ 5000) pasan de 1 kg.
 */

export const empaque = {
  gramosPorGafete: 5.5,
  gramosDelSobre: 60,
  /** Tope de gafetes por sobre para no pasar de 1 kg real ni volumétrico. */
  gafetesPorSobre: 100,
  largoCm: 25,
  anchoCm: 18,
  /** Alto con relleno, sin contar los gafetes. */
  altoBaseCm: 2,
  grosorGafeteCm: 0.076,
} as const;

export type Sobre = {
  gafetes: number;
  pesoKg: number;
  largo: number;
  ancho: number;
  alto: number;
};

/** Reparte las piezas en sobres parejos, todos dentro del tope. */
export function armarSobres(piezas: number): Sobre[] {
  if (!Number.isFinite(piezas) || piezas < 1) return [];
  const cuantos = Math.ceil(piezas / empaque.gafetesPorSobre);
  const base = Math.floor(piezas / cuantos);
  const sobran = piezas % cuantos;
  return Array.from({ length: cuantos }, (_, i) => {
    const gafetes = base + (i < sobran ? 1 : 0);
    const gramos = empaque.gramosDelSobre + gafetes * empaque.gramosPorGafete;
    return {
      gafetes,
      // Las paqueterías cobran por kilo o fracción: se redondea hacia arriba a décimas.
      pesoKg: Math.ceil(gramos / 100) / 10,
      largo: empaque.largoCm,
      ancho: empaque.anchoCm,
      alto: Math.ceil(empaque.altoBaseCm + gafetes * empaque.grosorGafeteCm),
    };
  });
}

/** «2 sobres: 70 y 70 gafetes». */
export function sobresEnFrase(sobres: Sobre[]): string {
  if (!sobres.length) return "Sin sobres";
  if (sobres.length === 1) return `1 sobre con ${sobres[0].gafetes} ${sobres[0].gafetes === 1 ? "gafete" : "gafetes"}`;
  const cantidades = sobres.map((s) => s.gafetes);
  const ultima = cantidades.pop();
  return `${sobres.length} sobres: ${cantidades.join(", ")} y ${ultima} gafetes`;
}
