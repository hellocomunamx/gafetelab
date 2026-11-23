import { type MaterialId, materiales } from "@/lib/materiales";
import { pedidoMaximoPiezas } from "./reglas";

/**
 * Predeterminados del negocio y pedido abierto. Se guardan en
 * `empresas.predeterminados`; la dirección y los datos fiscales de siempre
 * usan sus propias banderas (`predeterminada` y `predeterminado`).
 */

export type AvisoAbierto = {
  /** Cuántos gafetes juntar antes de avisar. 0: sin aviso. */
  cantidad: number;
  /** Si las altas nuevas (personas activas sin gafete impreso) se suman solas. */
  altas: boolean;
  /** Cuándo se mandó el último aviso; se limpia cuando el pedido abierto baja de la cantidad. */
  avisado_en: string | null;
};

export type Predeterminados = {
  material: MaterialId | null;
  /** Id de un diseño, "listos" o "reglas". */
  fuente: string | null;
  /** Si el pedido arranca con "No necesito factura". */
  sin_factura: boolean;
  aviso: AvisoAbierto;
};

export const avisoMaximo = 1000;

export function leerPredeterminados(json: unknown): Predeterminados {
  const o = (json && typeof json === "object" && !Array.isArray(json) ? json : {}) as Record<string, unknown>;
  const a = (o.aviso && typeof o.aviso === "object" ? o.aviso : {}) as Record<string, unknown>;
  const material = materiales.find((m) => m.id === o.material && m.disponible)?.id ?? null;
  const cantidad = Number(a.cantidad);
  return {
    material,
    fuente: typeof o.fuente === "string" && o.fuente.length <= 40 ? o.fuente : null,
    sin_factura: o.sin_factura === true,
    aviso: {
      cantidad: Number.isInteger(cantidad) && cantidad > 0 ? Math.min(cantidad, avisoMaximo, pedidoMaximoPiezas) : 0,
      altas: a.altas !== false,
      avisado_en: typeof a.avisado_en === "string" ? a.avisado_en : null,
    },
  };
}

/** Por qué se pide un gafete que va en el pedido abierto o en una reposición. */
export type Razon = "alta" | "perdido" | "danado" | "cambio_datos";
export const razones: Record<Razon, { nombre: string; frase: string }> = {
  alta: { nombre: "Alta", frase: "Su primer gafete" },
  perdido: { nombre: "Se perdió", frase: "Reposición: se perdió" },
  danado: { nombre: "Se dañó", frase: "Reposición: se dañó" },
  cambio_datos: { nombre: "Cambiaron sus datos", frase: "Reposición: cambiaron sus datos" },
};
export const esRazon = (v: unknown): v is Razon => typeof v === "string" && v in razones;
/** Las razones de una reposición, en el orden en que se ofrecen. */
export const razonesReposicion: Razon[] = ["perdido", "danado", "cambio_datos"];

/** El motivo que se guarda en `gafetes.motivo` según la razón y si ya tuvo gafete impreso. */
export function motivoDe(razon: Razon | null, yaTuvo: boolean): "alta" | "reposicion" | "cambio_datos" {
  if (razon === "cambio_datos") return yaTuvo ? "cambio_datos" : "alta";
  return yaTuvo ? "reposicion" : "alta";
}

/** Cómo se lee el motivo de un gafete en un pedido o en el historial: "Reposición: se perdió". Null en un alta. */
export function etiquetaMotivo(motivo: string, razon: string | null): string | null {
  if (motivo === "alta") return null;
  if (motivo === "cambio_datos") return "Cambio de datos";
  if (razon === "perdido") return "Reposición: se perdió";
  if (razon === "danado") return "Reposición: se dañó";
  if (razon === "cambio_datos") return "Reposición: cambiaron sus datos";
  return "Reposición";
}
