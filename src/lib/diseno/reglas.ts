/**
 * Diseños por reglas: qué diseño le toca a cada persona según un dato suyo
 * (puesto, departamento, tipo de contrato o un campo propio, como sucursal).
 * Gana la primera regla que coincide, en el orden en que la empresa las puso;
 * quien no coincide con ninguna lleva el diseño predeterminado.
 */

export type ReglaDiseno = { id: string; campo: string; valor: string; diseno_id: string; orden: number };

/** Datos de la persona que se pueden usar en una regla, además de los campos propios de texto. */
export const camposDeRegla: { clave: string; etiqueta: string }[] = [
  { clave: "puesto", etiqueta: "Puesto" },
  { clave: "departamento", etiqueta: "Departamento" },
  { clave: "tipo_contrato", etiqueta: "Tipo de contrato" },
];

/** Campos de sistema que no tiene sentido usar en una regla. */
const NO_SIRVEN = new Set(["nombre", "numero_empleado"]);

/** Los campos disponibles para reglas: los de siempre y los propios de texto de la empresa. */
export function camposParaReglas(campos: { clave: string; etiqueta: string; tipo: string }[]) {
  const fijos = new Set(camposDeRegla.map((c) => c.clave));
  return [
    ...camposDeRegla,
    ...campos.filter((c) => c.tipo === "texto" && !fijos.has(c.clave) && !NO_SIRVEN.has(c.clave)).map(({ clave, etiqueta }) => ({ clave, etiqueta })),
  ];
}

/** Para comparar sin que importen mayúsculas, acentos ni espacios de más. */
export const normalizar = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/** El diseño que le toca a una persona, o el predeterminado si ninguna regla coincide. */
export function disenoPorReglas(valores: Record<string, string>, reglas: ReglaDiseno[], porOmision: string | null): string | null {
  const ordenadas = [...reglas].sort((a, b) => a.orden - b.orden);
  for (const r of ordenadas) {
    const v = valores[r.campo];
    if (v && normalizar(v) === normalizar(r.valor)) return r.diseno_id;
  }
  return porOmision;
}
