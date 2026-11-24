/**
 * Solicitudes que hace una persona desde su portal y en qué van. Hay dos
 * tablas: `solicitudes_foto` (cambio de foto, la que ya existía) y
 * `solicitudes_empleado` (corregir datos y reponer el gafete). Para la persona
 * y para la bandeja de la empresa se ven como una sola lista.
 */

export const TIPOS_SOLICITUD = {
  foto: { nombre: "Cambio de foto", corto: "Foto" },
  datos: { nombre: "Corrección de datos", corto: "Datos" },
  reposicion: { nombre: "Reposición de gafete", corto: "Reposición" },
} as const;
export type TipoSolicitud = keyof typeof TIPOS_SOLICITUD;

export const CAUSAS_REPOSICION = {
  perdida: "Lo perdí",
  robo: "Me lo robaron",
  dano: "Está dañado o roto",
} as const;
export type CausaReposicion = keyof typeof CAUSAS_REPOSICION;
export const esCausa = (v: unknown): v is CausaReposicion => typeof v === "string" && v in CAUSAS_REPOSICION;
/** Razón con que entra al pedido abierto. */
export const razonDeCausa = (c: CausaReposicion) => (c === "dano" ? "danado" : "perdido");

/** Seguimiento de la impresión, después de aprobada. */
export type Impresion = "en_impresion" | "en_camino" | "entregada";

/** Lo que ve la persona: un solo estado por solicitud, en palabras simples. */
export const ESTADOS_VISIBLES = {
  enviada: { nombre: "En revisión", clase: "bg-resaltador/40 text-tinta", paso: 1 },
  aprobada: { nombre: "Aprobada", clase: "bg-[#dff3ea] text-[#0a5c3b]", paso: 2 },
  en_impresion: { nombre: "En impresión", clase: "bg-[#e3ecff] text-[#1f3f8f]", paso: 3 },
  en_camino: { nombre: "En camino", clase: "bg-[#e3ecff] text-[#1f3f8f]", paso: 4 },
  entregada: { nombre: "Entregada", clase: "bg-[#dff3ea] text-[#0a5c3b]", paso: 5 },
  rechazada: { nombre: "No aprobada", clase: "bg-rojo/10 text-rojo-oscuro", paso: 0 },
  cancelada: { nombre: "Cancelada", clase: "bg-linea text-gris", paso: 0 },
} as const;
export type EstadoVisible = keyof typeof ESTADOS_VISIBLES;

export function estadoVisible(fila: { estado: string; impresion: string | null }): EstadoVisible {
  if (fila.estado === "pendiente") return "enviada";
  if (fila.estado === "rechazada") return "rechazada";
  if (fila.estado === "cancelada") return "cancelada";
  if (fila.impresion === "en_impresion" || fila.impresion === "en_camino" || fila.impresion === "entregada") return fila.impresion;
  return "aprobada";
}

/** Pasos de la línea de tiempo: con impresión, cinco; sin impresión (solo digital o datos), dos. */
export function pasosDe(conImpresion: boolean): EstadoVisible[] {
  return conImpresion ? ["enviada", "aprobada", "en_impresion", "en_camino", "entregada"] : ["enviada", "aprobada"];
}

export type SolicitudPortal = {
  id: string;
  tipo: TipoSolicitud;
  estado: EstadoVisible;
  /** Lleva gafete impreso nuevo (se sigue su impresión). */
  conImpresion: boolean;
  creada: string;
  resuelta: string | null;
  motivo: string | null;
  /** Resumen en una línea: qué datos, por qué causa… */
  detalle: string;
};

/** Para el correo y la pantalla: qué significa el estado nuevo. */
export function fraseDeEstado(estado: EstadoVisible, empresa: string, conImpresion: boolean): { titulo: string; detalle: string } {
  switch (estado) {
    case "aprobada":
      return {
        titulo: "Tu solicitud fue aprobada",
        detalle: conImpresion
          ? `${empresa} la aprobó. Te avisamos cuando tu gafete nuevo entre a impresión.`
          : `${empresa} la aprobó. Ya quedó en tu gafete.`,
      };
    case "en_impresion":
      return { titulo: "Tu gafete nuevo está en impresión", detalle: "Lo estamos imprimiendo. Te avisamos cuando salga." };
    case "en_camino":
      return { titulo: "Tu gafete nuevo va en camino", detalle: `Ya salió hacia ${empresa}. Ellos te lo entregan.` };
    case "entregada":
      return { titulo: "Tu gafete nuevo llegó", detalle: `Ya está con ${empresa}. Pídelo donde te indiquen.` };
    case "rechazada":
      return { titulo: "Tu solicitud no fue aprobada", detalle: `${empresa} no la aprobó. Puedes revisar el motivo y enviar otra.` };
    default:
      return { titulo: "Recibimos tu solicitud", detalle: `${empresa} la va a revisar.` };
  }
}
