import { medidas } from "@/lib/materiales";
import {
  type Cara,
  type Elemento,
  type FuenteId,
  MAX_ELEMENTOS,
  type Orientacion,
  tamano,
} from "./tipos";

/**
 * Revisa una cara que llega del navegador y deja solo lo que el diseño admite:
 * tipos conocidos, números dentro del gafete, colores válidos y archivos de la
 * propia empresa. Nada de lo que llega se guarda sin pasar por aquí.
 */

const COLOR = /^#[0-9a-f]{6}$/i;
const ID = /^[a-z0-9]{1,16}$/;
const CLAVE = /^[a-z][a-z0-9_]{0,39}$/;
const FUENTES: FuenteId[] = ["inter", "bricolage", "gochi"];

const numero = (v: unknown, min: number, max: number, respaldo: number) => {
  const n = typeof v === "number" && Number.isFinite(v) ? v : respaldo;
  return Math.round(Math.min(max, Math.max(min, n)) * 100) / 100;
};
const color = (v: unknown, respaldo: string) => (typeof v === "string" && COLOR.test(v) ? v.toLowerCase() : respaldo);
const objeto = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

export function limpiarCara(entrada: unknown, orientacion: Orientacion, empresaId: string): Cara | null {
  const cara = objeto(entrada);
  if (!cara) return null;
  const { w, h } = tamano(orientacion);
  const s = medidas.sangrado;
  const ruta = (v: unknown) =>
    typeof v === "string" && new RegExp(`^${empresaId}/[a-z0-9-]{8,40}\\.(jpg|png|webp)$`).test(v) ? v : undefined;

  const elementos: Elemento[] = [];
  const vistos = new Set<string>();
  for (const crudo of Array.isArray(cara.elementos) ? cara.elementos.slice(0, MAX_ELEMENTOS) : []) {
    const e = objeto(crudo);
    if (!e || typeof e.id !== "string" || !ID.test(e.id) || vistos.has(e.id)) continue;
    vistos.add(e.id);
    const ancho = numero(e.w, 1, w + s * 2, 20);
    const alto = numero(e.h, 1, h + s * 2, 10);
    const caja = {
      id: e.id,
      x: numero(e.x, -s, w + s - 1, 0),
      y: numero(e.y, -s, h + s - 1, 0),
      w: ancho,
      h: alto,
    };
    if (e.tipo === "texto") {
      const campo = typeof e.campo === "string" && CLAVE.test(e.campo) ? e.campo : undefined;
      const texto = typeof e.texto === "string" ? e.texto.slice(0, 200) : undefined;
      if (!campo && !texto?.trim()) continue;
      elementos.push({
        ...caja,
        tipo: "texto",
        ...(campo ? { campo, conEtiqueta: e.conEtiqueta === true } : { texto }),
        fuente: FUENTES.includes(e.fuente as FuenteId) ? (e.fuente as FuenteId) : "inter",
        tam: numero(e.tam, 1, 30, 3.5),
        negrita: e.negrita === true,
        mayusculas: e.mayusculas === true,
        color: color(e.color, "#1b1f3b"),
        alinear: e.alinear === "centro" || e.alinear === "derecha" ? e.alinear : "izquierda",
      });
    } else if (e.tipo === "foto") {
      elementos.push({ ...caja, tipo: "foto", radio: numero(e.radio, 0, 50, 2) });
    } else if (e.tipo === "qr") {
      const lado = Math.min(ancho, alto);
      elementos.push({ ...caja, w: lado, h: lado, tipo: "qr" });
    } else if (e.tipo === "imagen") {
      const archivo = ruta(e.ruta);
      if (archivo) {
        elementos.push({ ...caja, tipo: "imagen", ruta: archivo, ajuste: e.ajuste === "cubrir" ? "cubrir" : "contener" });
      }
    } else if (e.tipo === "forma") {
      elementos.push({ ...caja, tipo: "forma", color: color(e.color, "#e63b2e"), radio: numero(e.radio, 0, 50, 0) });
    }
  }
  const imagen = ruta(cara.imagen);
  return { fondo: color(cara.fondo, "#ffffff"), ...(imagen ? { imagen } : {}), elementos };
}

/** Rutas de archivos (fondo e imágenes) que usa una cara. */
export function rutasDe(cara: Cara | null | undefined): string[] {
  if (!cara) return [];
  return [
    ...(cara.imagen ? [cara.imagen] : []),
    ...cara.elementos.flatMap((e) => (e.tipo === "imagen" ? [e.ruta] : [])),
  ];
}
