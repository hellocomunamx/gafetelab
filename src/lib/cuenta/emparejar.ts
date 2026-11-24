import { normalizar } from "./texto";

export type PersonaFoto = {
  id: string;
  nombre: string;
  numero_empleado: string | null;
  /** Nombre de archivo que venía en el Excel, si lo trajo. */
  foto_archivo: string | null;
};

export type Via = "archivo" | "numero" | "nombre";

const sinExtension = (archivo: string) => archivo.replace(/^.*[\\/]/, "").replace(/\.[a-z0-9]{2,5}$/i, "");
const sinCeros = (t: string) => t.replace(/^0+(?=\d)/, "");
const palabras = (t: string) => normalizar(t).split(" ").sort().join(" ");

/**
 * Prepara un buscador que dice a qué persona corresponde una foto, por su
 * nombre de archivo. Prueba, en orden: el archivo indicado en el Excel, el
 * número de empleado y el nombre completo. Si hay dos candidatos, no adivina.
 */
export function crearEmparejador(personas: PersonaFoto[]) {
  const indice = (clave: (p: PersonaFoto) => string | null) => {
    const mapa = new Map<string, string | null>();
    for (const p of personas) {
      const k = clave(p);
      if (!k) continue;
      // Clave repetida: queda ambigua y no se usa.
      mapa.set(k, mapa.has(k) ? null : p.id);
    }
    return mapa;
  };
  const porArchivo = indice((p) => (p.foto_archivo ? normalizar(sinExtension(p.foto_archivo)) : null));
  const porNumero = indice((p) => (p.numero_empleado ? sinCeros(normalizar(p.numero_empleado)) : null));
  const porNombre = indice((p) => palabras(p.nombre));

  return (archivo: string): { id: string; via: Via } | null => {
    const base = sinExtension(archivo);
    const n = normalizar(base);
    if (!n) return null;
    const intentos: [Via, string | null | undefined][] = [
      ["archivo", porArchivo.get(n)],
      ["numero", porNumero.get(sinCeros(n))],
      ["nombre", porNombre.get(palabras(base))],
    ];
    for (const [via, id] of intentos) if (id) return { id, via };
    return null;
  };
}
