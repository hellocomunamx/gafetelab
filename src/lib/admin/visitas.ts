import type { Json } from "@/lib/supabase/tipos";

/** Periodos del panel de visitas. Los días se cortan con la hora de Sonora (UTC-7). */
const DESFASE_MS = 7 * 60 * 60 * 1000;
const DIA_MS = 24 * 60 * 60 * 1000;

export const periodosVisitas = [
  { id: "hoy", nombre: "Hoy", dias: 1, frase: "hoy" },
  { id: "7", nombre: "7 días", dias: 7, frase: "en los últimos 7 días" },
  { id: "30", nombre: "30 días", dias: 30, frase: "en los últimos 30 días" },
  { id: "90", nombre: "90 días", dias: 90, frase: "en los últimos 90 días" },
] as const;
export type PeriodoVisitas = (typeof periodosVisitas)[number];
export const periodoVisitas = (id: unknown): PeriodoVisitas => periodosVisitas.find((p) => p.id === id) ?? periodosVisitas[2];

/** Desde el inicio del primer día del periodo (hora de Sonora) hasta este momento. */
export function rangoVisitas(dias: number, ahora = Date.now()) {
  const local = new Date(ahora - DESFASE_MS);
  const hoy = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) + DESFASE_MS;
  return { desde: hoy - (dias - 1) * DIA_MS, hasta: ahora };
}

export type DiaVisitas = { dia: string; vistas: number; visitas: number };
export type ResumenVisitas = {
  vistas: number;
  visitas: number;
  escaneos: number;
  dias: DiaVisitas[];
  paginas: { ruta: string; vistas: number; entradas: number }[];
  origenes: { origen: string; visitas: number }[];
  dispositivos: { dispositivo: string; visitas: number }[];
  lugares: { pais: string; region: string; visitas: number }[];
};

const lista = (j: Json | undefined): Record<string, Json | undefined>[] =>
  Array.isArray(j) ? j.filter((x): x is Record<string, Json | undefined> => Boolean(x) && typeof x === "object" && !Array.isArray(x)) : [];
const n = (j: Json | undefined) => Number(j) || 0;
const t = (j: Json | undefined) => (typeof j === "string" ? j : "");

/** Lo que devuelve `resumen_visitas`, ya con forma. Si viene vacío o roto, ceros. */
export function leerResumen(j: Json | null): ResumenVisitas {
  const o = j && typeof j === "object" && !Array.isArray(j) ? j : {};
  return {
    vistas: n(o.vistas),
    visitas: n(o.visitas),
    escaneos: n(o.escaneos),
    dias: lista(o.dias).map((d) => ({ dia: t(d.dia), vistas: n(d.vistas), visitas: n(d.visitas) })),
    paginas: lista(o.paginas).map((p) => ({ ruta: t(p.ruta), vistas: n(p.vistas), entradas: n(p.entradas) })),
    origenes: lista(o.origenes).map((x) => ({ origen: t(x.origen), visitas: n(x.visitas) })),
    dispositivos: lista(o.dispositivos).map((x) => ({ dispositivo: t(x.dispositivo), visitas: n(x.visitas) })),
    lugares: lista(o.lugares).map((x) => ({ pais: t(x.pais), region: t(x.region), visitas: n(x.visitas) })),
  };
}

export type Columna = { clave: string; etiqueta: string; vistas: number; visitas: number };

const fechaDe = (clave: string, opciones: Intl.DateTimeFormatOptions) =>
  new Date(`${clave}T12:00:00Z`).toLocaleDateString("es-MX", { ...opciones, timeZone: "UTC" });

/**
 * Una columna por día del periodo (con ceros donde no hubo visitas). Pasados
 * los 31 días se agrupa por semana, para que las columnas no queden como hilos.
 */
export function columnas(dias: DiaVisitas[], rango: { desde: number; hasta: number }): Columna[] {
  const porDia = new Map(dias.map((d) => [d.dia, d]));
  const todas: Columna[] = [];
  for (let ms = rango.desde; ms <= rango.hasta; ms += DIA_MS) {
    const clave = new Date(ms - DESFASE_MS).toISOString().slice(0, 10);
    const d = porDia.get(clave);
    todas.push({ clave, etiqueta: fechaDe(clave, { weekday: "short", day: "numeric", month: "short" }), vistas: d?.vistas ?? 0, visitas: d?.visitas ?? 0 });
  }
  if (todas.length <= 31) return todas;
  const semanas: Columna[] = [];
  for (let i = 0; i < todas.length; i += 7) {
    const grupo = todas.slice(i, i + 7);
    semanas.push({
      clave: grupo[0].clave,
      etiqueta: `Semana del ${fechaDe(grupo[0].clave, { day: "numeric", month: "short" })}`,
      vistas: grupo.reduce((s, d) => s + d.vistas, 0),
      visitas: grupo.reduce((s, d) => s + d.visitas, 0),
    });
  }
  return semanas;
}
