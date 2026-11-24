import { type FuenteId, fuentes } from "./tipos";

/** Separación entre renglones, en proporción al tamaño de letra. */
export const INTERLINEA = 1.18;

/** Ancho de un texto en "emes": se multiplica por el tamaño de letra para tener milímetros. */
export type Medidor = (texto: string, fuente: FuenteId, negrita: boolean) => number;

/** Cálculo aproximado, para cuando no hay navegador (servidor) o las letras no han cargado. */
export const medidorAproximado: Medidor = (texto, fuente, negrita) =>
  texto.length * (fuente === "gochi" ? 0.46 : negrita ? 0.6 : 0.55);

let medidorReal: Medidor | null = null;
const oyentes = new Set<() => void>();

/** Las letras del gafete ya cargadas en el navegador: su familia real y un medidor exacto. */
export type Letras = { familias: Record<FuenteId, string>; medir: Medidor };
let letras: Promise<Letras | null> | null = null;

/** Carga las letras una sola vez por página. Devuelve null si no hay navegador o lienzo. */
export function letrasListas(): Promise<Letras | null> {
  if (typeof document === "undefined") return Promise.resolve(null);
  letras ??= (async () => {
    const estilos = getComputedStyle(document.body);
    const familias = Object.fromEntries(
      fuentes.map((f) => [f.id, estilos.getPropertyValue(f.variable).trim() || "sans-serif"]),
    ) as Record<FuenteId, string>;
    await Promise.all(
      fuentes.flatMap((f) =>
        [400, 700].map((peso) => document.fonts.load(`${peso} 20px ${familias[f.id]}`).catch(() => null)),
      ),
    );
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return null;
    const memoria = new Map<string, number>();
    const medir: Medidor = (texto, fuente, negrita) => {
      const clave = `${fuente}|${negrita ? 1 : 0}|${texto}`;
      let ancho = memoria.get(clave);
      if (ancho === undefined) {
        ctx.font = `${negrita ? 700 : 400} 100px ${familias[fuente]}`;
        ancho = ctx.measureText(texto).width / 100;
        if (memoria.size > 5000) memoria.clear();
        memoria.set(clave, ancho);
      }
      return ancho;
    };
    return { familias, medir };
  })();
  return letras;
}

/** Mide con las letras reales del navegador. Se prepara una sola vez por página. */
function prepararMedidor() {
  if (medidorReal || typeof document === "undefined") return;
  void letrasListas().then((listas) => {
    if (!listas || medidorReal) return;
    medidorReal = listas.medir;
    oyentes.forEach((avisar) => avisar());
  });
}

export const medidor = {
  suscribir(avisar: () => void) {
    oyentes.add(avisar);
    prepararMedidor();
    return () => {
      oyentes.delete(avisar);
    };
  },
  actual: (): Medidor => medidorReal ?? medidorAproximado,
  servidor: (): Medidor => medidorAproximado,
};

function partir(texto: string, anchoEm: number, medir: (t: string) => number): string[] {
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of texto.split(/\s+/).filter(Boolean)) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (!actual || medir(prueba) <= anchoEm) actual = prueba;
    else {
      lineas.push(actual);
      actual = palabra;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

export type TextoAcomodado = { lineas: string[]; tam: number; recortado: boolean };

/**
 * Acomoda un texto en su caja: lo parte en renglones si la caja tiene alto para
 * más de uno y, si aun así no cabe, reduce la letra hasta 55 %. Como último
 * recurso lo recorta con puntos suspensivos y avisa.
 */
export function acomodar(
  texto: string,
  caja: { w: number; h: number },
  tam: number,
  fuente: FuenteId,
  negrita: boolean,
  medir: Medidor,
): TextoAcomodado {
  const ancho = (t: string) => medir(t, fuente, negrita);
  let ultimo = { lineas: [texto], tam, maximo: 1 };
  for (const escala of [1, 0.92, 0.85, 0.78, 0.7, 0.62, 0.55]) {
    const t = tam * escala;
    const maximo = Math.max(1, Math.floor((caja.h + 0.05) / (t * INTERLINEA)));
    const lineas = partir(texto, caja.w / t, ancho);
    ultimo = { lineas, tam: t, maximo };
    if (lineas.length <= maximo && lineas.every((l) => ancho(l) * t <= caja.w * 1.005)) {
      return { lineas, tam: t, recortado: false };
    }
  }
  const lineas = ultimo.lineas.slice(0, ultimo.maximo);
  let final = ultimo.lineas.slice(ultimo.maximo - 1).join(" ");
  while (final.length > 1 && ancho(`${final}…`) * ultimo.tam > caja.w) final = final.slice(0, -1).trimEnd();
  lineas[lineas.length - 1] = `${final}…`;
  return { lineas, tam: ultimo.tam, recortado: true };
}
