import { medidas } from "@/lib/materiales";

/**
 * Un diseño de gafete. Todas las medidas van en milímetros, desde la esquina
 * superior izquierda del corte. Lo que sale hacia afuera (hasta el sangrado)
 * tiene coordenadas negativas.
 */

export type Orientacion = "horizontal" | "vertical";
export type FuenteId = "inter" | "bricolage" | "gochi";
export type Alineacion = "izquierda" | "centro" | "derecha";

type Caja = { id: string; x: number; y: number; w: number; h: number };

export type ElementoTexto = Caja & {
  tipo: "texto";
  /** Clave del campo del equipo que se imprime. Si falta, se imprime `texto` tal cual. */
  campo?: string;
  texto?: string;
  /** Antepone el nombre del campo: "Puesto: Ventas". */
  conEtiqueta?: boolean;
  fuente: FuenteId;
  /** Tamaño de letra en milímetros. */
  tam: number;
  negrita: boolean;
  mayusculas?: boolean;
  color: string;
  alinear: Alineacion;
};
export type ElementoFoto = Caja & { tipo: "foto"; radio: number };
export type ElementoQr = Caja & { tipo: "qr" };
export type ElementoImagen = Caja & { tipo: "imagen"; ruta: string; ajuste: "contener" | "cubrir" };
export type ElementoForma = Caja & { tipo: "forma"; color: string; radio: number };

export type Elemento = ElementoTexto | ElementoFoto | ElementoQr | ElementoImagen | ElementoForma;

export type Cara = {
  /** Color de fondo, hasta el sangrado. */
  fondo: string;
  /** Imagen de fondo (ruta en el almacenamiento), hasta el sangrado. */
  imagen?: string;
  elementos: Elemento[];
};

export type Diseno = {
  id: string;
  nombre: string;
  orientacion: Orientacion;
  frente: Cara;
  /** null: una sola cara. */
  vuelta: Cara | null;
};

/** Las dos primeras son copias con el tamaño óptico fijo (ver src/app/layout.tsx). */
export const fuentes: { id: FuenteId; nombre: string; css: string; variable: string }[] = [
  { id: "inter", nombre: "Inter (clara)", css: "var(--font-gafete-inter), system-ui, sans-serif", variable: "--font-gafete-inter" },
  { id: "bricolage", nombre: "Bricolage (títulos)", css: "var(--font-gafete-bricolage), system-ui, sans-serif", variable: "--font-gafete-bricolage" },
  { id: "gochi", nombre: "Gochi (a mano)", css: "var(--font-gochi), cursive", variable: "--font-gochi" },
];
export const fuenteCss = (id: FuenteId) => (fuentes.find((f) => f.id === id) ?? fuentes[0]).css;

/** Ancho y alto del corte según la orientación. */
export function tamano(orientacion: Orientacion) {
  return orientacion === "vertical"
    ? { w: medidas.alto, h: medidas.ancho }
    : { w: medidas.ancho, h: medidas.alto };
}

export const MAX_ELEMENTOS = 60;
export const puntosAMm = (pt: number) => pt * 0.3528;
export const mmAPuntos = (mm: number) => mm / 0.3528;
export const caraVacia = (): Cara => ({ fondo: "#ffffff", elementos: [] });
export const nuevoId = () => Math.random().toString(36).slice(2, 10);
