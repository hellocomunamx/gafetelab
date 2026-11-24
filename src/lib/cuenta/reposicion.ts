/**
 * Política de reposición de cada empresa: lo que le cobra a su persona por un
 * gafete impreso nuevo y qué le pide a cambio. Ese cobro es entre la empresa y
 * su persona (en efectivo, por nómina o como lo acostumbre): LaGafetería no lo
 * cobra ni lo recibe. Se muestra a quien pide cambiar su foto y además tiene
 * gafete impreso.
 */

export const REQUISITOS = {
  entregar_anterior: "Entregar el gafete anterior",
  carta_extravio: "Si se perdió o te lo robaron, una carta firmada de extravío o robo",
  acta_robo: "En caso de robo, copia de la denuncia o acta",
  firma_descuento: "Firmar la autorización del descuento",
} as const;
export type Requisito = keyof typeof REQUISITOS;
export const esRequisito = (v: unknown): v is Requisito => typeof v === "string" && v in REQUISITOS;

export type Reposicion = { costo: number; requisitos: Requisito[]; nota: string };

/** Lo que trae una empresa nueva: sin costo, entregar el anterior o carta de extravío. */
export const REPOSICION_INICIAL: Reposicion = { costo: 0, requisitos: ["entregar_anterior", "carta_extravio"], nota: "" };

/** Lee la política guardada en `empresas.reposicion`, con valores seguros si algo falta. */
export function reposicionDe(json: unknown): Reposicion {
  if (!json || typeof json !== "object" || Array.isArray(json)) return REPOSICION_INICIAL;
  const o = json as Record<string, unknown>;
  const costo = typeof o.costo === "number" && Number.isFinite(o.costo) && o.costo >= 0 ? Math.min(Math.round(o.costo), 5000) : 0;
  const requisitos = Array.isArray(o.requisitos) ? o.requisitos.filter(esRequisito) : REPOSICION_INICIAL.requisitos;
  const nota = typeof o.nota === "string" ? o.nota.slice(0, 300) : "";
  return { costo, requisitos, nota };
}

export const pesos = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

/** Estados de un gafete impreso que siguen vigentes (no cancelado ni desactivado). */
export const IMPRESO_VIGENTE = ["en_pedido", "en_produccion", "enviado", "activo"];
