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
