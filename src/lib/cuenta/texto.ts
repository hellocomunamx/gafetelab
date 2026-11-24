/** Texto sin acentos, en minúsculas y con espacios simples: para comparar nombres. */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Convierte una etiqueta en clave de campo: "Tipo de sangre" → "tipo_de_sangre". */
export function claveDe(etiqueta: string): string {
  const base = normalizar(etiqueta).replace(/ /g, "_").replace(/^[^a-z]+/, "");
  return base.slice(0, 40) || "campo";
}

/**
 * Cómo se llama a una persona en las listas. El nombre es opcional (hay
 * gafetes genéricos, como «Visitante»): sin nombre se usa su puesto o número.
 */
export function quien(p: { nombre: string | null; puesto?: string | null; numero_empleado?: string | null; numero?: string | null }): string {
  const nombre = p.nombre?.trim();
  if (nombre) return nombre;
  const numero = p.numero_empleado ?? p.numero;
  if (p.puesto) return `Sin nombre · ${p.puesto}${numero ? ` · No. ${numero}` : ""}`;
  return numero ? `Sin nombre · No. ${numero}` : "Sin nombre";
}
