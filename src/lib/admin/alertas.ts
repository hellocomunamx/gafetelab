import type { Cara } from "@/lib/diseno/tipos";

/**
 * Palabras que piden una revisión a mano antes de producir: nombres de
 * autoridades, dependencias e identificaciones oficiales. Que aparezcan no
 * significa que el pedido sea indebido (hay empresas de seguridad privada y
 * proveedores de gobierno), solo que una persona debe verlo.
 *
 * Se escriben sin acentos y en minúsculas; se buscan como palabras completas,
 * para que "INE" no salte con "línea" ni "SAT" con "satélite".
 */
const SENSIBLES: { palabra: string; nombre: string }[] = [
  { palabra: "ine", nombre: "INE" },
  { palabra: "ife", nombre: "IFE" },
  { palabra: "instituto nacional electoral", nombre: "INE" },
  { palabra: "credencial para votar", nombre: "credencial para votar" },
  { palabra: "gobierno", nombre: "gobierno" },
  { palabra: "gobernacion", nombre: "Gobernación" },
  { palabra: "ayuntamiento", nombre: "ayuntamiento" },
  { palabra: "municipio", nombre: "municipio" },
  { palabra: "presidencia", nombre: "presidencia" },
  { palabra: "policia", nombre: "policía" },
  { palabra: "policial", nombre: "policía" },
  { palabra: "police", nombre: "policía" },
  { palabra: "seguridad publica", nombre: "seguridad pública" },
  { palabra: "guardia nacional", nombre: "Guardia Nacional" },
  { palabra: "ejercito", nombre: "ejército" },
  { palabra: "sedena", nombre: "SEDENA" },
  { palabra: "marina", nombre: "Marina" },
  { palabra: "semar", nombre: "SEMAR" },
  { palabra: "transito", nombre: "tránsito" },
  { palabra: "fiscalia", nombre: "fiscalía" },
  { palabra: "fgr", nombre: "FGR" },
  { palabra: "ministerio publico", nombre: "ministerio público" },
  { palabra: "poder judicial", nombre: "poder judicial" },
  { palabra: "migracion", nombre: "migración" },
  { palabra: "inm", nombre: "INM" },
  { palabra: "aduana", nombre: "aduana" },
  { palabra: "aduanas", nombre: "aduana" },
  { palabra: "sat", nombre: "SAT" },
  { palabra: "hacienda", nombre: "Hacienda" },
  { palabra: "shcp", nombre: "SHCP" },
  { palabra: "imss", nombre: "IMSS" },
  { palabra: "issste", nombre: "ISSSTE" },
  { palabra: "infonavit", nombre: "Infonavit" },
  { palabra: "profeco", nombre: "Profeco" },
  { palabra: "cofepris", nombre: "Cofepris" },
  { palabra: "stps", nombre: "STPS" },
  { palabra: "sep", nombre: "SEP" },
  { palabra: "cfe", nombre: "CFE" },
  { palabra: "pemex", nombre: "Pemex" },
  { palabra: "proteccion civil", nombre: "protección civil" },
  { palabra: "identificacion oficial", nombre: "identificación oficial" },
  { palabra: "federal", nombre: "federal" },
];

const limpiar = (t: string) =>
  ` ${t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()} `;

/** Las palabras sensibles que aparecen en estos textos, sin repetir y como se muestran. */
export function palabrasSensibles(textos: (string | null | undefined)[]): string[] {
  const todo = limpiar(textos.filter(Boolean).join(" · "));
  // Las siglas también se escriben con puntos o espacios: "I.N.E." queda como "i n e".
  const juntas = todo.replace(/(?<= )(?:[a-z] ){2,}/g, (letras) => `${letras.replaceAll(" ", "")} `);
  const halladas = new Set<string>();
  for (const s of SENSIBLES) {
    if (todo.includes(` ${s.palabra} `) || juntas.includes(` ${s.palabra} `)) halladas.add(s.nombre);
  }
  return [...halladas];
}

/** Los textos fijos de un diseño (lo que la empresa escribió, no los datos de cada persona). */
export function textosDeDiseno(diseno: { nombre: string; frente: unknown; vuelta: unknown }): string[] {
  const deCara = (v: unknown) => {
    const cara = v as Partial<Cara> | null;
    return (Array.isArray(cara?.elementos) ? cara.elementos : []).flatMap((e) =>
      e.tipo === "texto" && !e.campo && e.texto ? [e.texto] : [],
    );
  };
  return [diseno.nombre, ...deCara(diseno.frente), ...deCara(diseno.vuelta)];
}
