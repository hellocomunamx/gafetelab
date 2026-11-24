import { CORREO_VALIDO } from "@/lib/solicitudes";
import { urlAbsoluta } from "@/lib/site";
import { columnasDe } from "./excel";
import { esColumnaSistema } from "./tipos";

/**
 * Liga por persona: cada quien tiene una liga propia para llenar sus datos y
 * subir su foto sin crear cuenta. Lo que manda queda como propuesta hasta que
 * la empresa lo aprueba.
 */

/** Página pública de la liga. El resto de la ruta es la liga de la persona. */
export const RUTA_LIGA = "/mi-gafete";
export const FORMATO_LIGA = /^[A-Za-z0-9_-]{24}$/;
export const urlDeLiga = (liga: string) => urlAbsoluta(`${RUTA_LIGA}/${liga}`);

/** Correos que se mandan con un solo clic, como máximo. */
export const CORREOS_POR_ENVIO = 1000;

/** El correo en minúsculas si es válido; si no, null. */
export function correoValido(valor: unknown): string | null {
  const texto = typeof valor === "string" ? valor.trim().toLowerCase() : "";
  return texto.length <= 200 && CORREO_VALIDO.test(texto) ? texto : null;
}

/** Claves de campos propios que suelen guardar el correo de la persona. */
export const CLAVES_DE_CORREO = ["correo", "correo_electronico", "email", "e_mail", "mail"];

/** Foto que mandó la persona y que todavía no se aprueba. */
export const rutaFotoPendiente = (empresaId: string, empleadoId: string) => `${empresaId}/pendientes/${empleadoId}.jpg`;
/** Lo más que puede pesar la foto que llega por la liga (ya viene recortada del navegador). */
export const PESO_MAXIMO_FOTO = 800 * 1024;

type CampoLiga = { clave: string; etiqueta: string; tipo: string; obligatorio?: boolean };

/** De los campos de la empresa, los que la persona puede llenar: texto y fecha. */
export function camposPedibles<T extends CampoLiga>(campos: T[]): T[] {
  return columnasDe(campos) as T[];
}

/** Los campos que la empresa eligió pedir, en el orden de siempre. */
export function camposDeLiga<T extends CampoLiga>(campos: T[], elegidos: string[]): T[] {
  return camposPedibles(campos).filter((c) => elegidos.includes(c.clave));
}

type ConDatos = {
  nombre: string;
  numero_empleado: string | null;
  puesto: string | null;
  departamento: string | null;
  tipo_contrato: string | null;
  datos: unknown;
};

/** El valor de un campo de una persona, sea de los de siempre o propio de la empresa. */
export function valorDe(persona: ConDatos, clave: string): string {
  if (esColumnaSistema(clave)) return persona[clave] ?? "";
  const datos = persona.datos && typeof persona.datos === "object" ? (persona.datos as Record<string, unknown>) : {};
  const valor = datos[clave];
  return typeof valor === "string" ? valor : "";
}

/** Los datos de una propuesta como texto por clave. */
export function datosPropuestos(json: unknown): Record<string, string> {
  if (!json || typeof json !== "object" || Array.isArray(json)) return {};
  return Object.fromEntries(Object.entries(json).filter((par): par is [string, string] => typeof par[1] === "string"));
}

export const estadosLiga = {
  sin_enviar: { nombre: "Sin enviar", clase: "bg-linea text-gris" },
  enviada: { nombre: "Enviada, sin respuesta", clase: "bg-papel text-tinta" },
  pendiente: { nombre: "Por aprobar", clase: "bg-resaltador/40 text-tinta" },
  aprobada: { nombre: "Aprobada", clase: "bg-[#dff3ea] text-[#0a5c3b]" },
  rechazada: { nombre: "Pediste corrección", clase: "bg-rojo/10 text-rojo-oscuro" },
} as const;
export type EstadoLiga = keyof typeof estadosLiga;
export const esEstadoLiga = (v: unknown): v is EstadoLiga => typeof v === "string" && v in estadosLiga;

/** En qué va la liga de una persona. */
export function estadoDeLiga(persona: { liga_enviada_en: string | null }, propuesta?: { estado: string } | null): EstadoLiga {
  if (propuesta && (propuesta.estado === "pendiente" || propuesta.estado === "aprobada" || propuesta.estado === "rechazada")) {
    return propuesta.estado;
  }
  return persona.liga_enviada_en ? "enviada" : "sin_enviar";
}

/** Lo que se le pide a la persona, en palabras: "tus datos y tu foto". */
export function loQueSePide(conDatos: boolean, conFoto: boolean): string {
  if (conDatos && conFoto) return "revises tus datos y subas tu foto";
  return conFoto ? "subas tu foto" : "revises tus datos";
}

/** Qué puede pedir corregir la empresa. Se guarda al inicio del motivo: «Tu foto: salió oscura». */
export const QUE_CORREGIR = ["Tu foto", "Tus datos", "Tu foto y tus datos"] as const;

/** Separa un motivo guardado en qué corregir y por qué. Los motivos viejos no traen el «qué». */
export function partesCorreccion(motivo: string): { que: string | null; porque: string } {
  const que = QUE_CORREGIR.find((q) => motivo.startsWith(`${q}: `));
  return que ? { que, porque: motivo.slice(que.length + 2) } : { que: null, porque: motivo };
}

/** «Sekiur te solicita una corrección de tu foto debido a: salió oscura.» */
export function fraseCorreccion(empresa: string, motivo: string): string {
  const { que, porque } = partesCorreccion(motivo);
  const final = /[.!?]$/.test(porque) ? porque : `${porque}.`;
  return `${empresa} te solicita una corrección${que ? ` de ${que.toLowerCase()}` : ""} debido a: ${final}`;
}

/** Mensaje listo para pegar en WhatsApp o en cualquier chat. */
export function mensajeDeLiga(opts: {
  nombre: string;
  empresa: string;
  url: string;
  conDatos: boolean;
  conFoto: boolean;
  /** Lo que la empresa le pidió corregir, si fue el caso. */
  correccion?: string | null;
}): string {
  const primerNombre = opts.nombre.trim().split(/\s+/)[0] ?? "";
  if (opts.correccion) {
    return [
      `Hola${primerNombre ? `, ${primerNombre}` : ""}. ${fraseCorreccion(opts.empresa, opts.correccion)}`,
      `Corrígelo en tu liga personal y vuelve a enviarlo; toma un minuto y no necesitas crear cuenta:`,
      opts.url,
    ].join("\n");
  }
  return [
    `Hola${primerNombre ? `, ${primerNombre}` : ""}. En ${opts.empresa} estamos preparando tu gafete y necesitamos que ${loQueSePide(opts.conDatos, opts.conFoto)}.`,
    `Entra a tu liga personal, toma un minuto y no necesitas crear cuenta:`,
    opts.url,
  ].join("\n");
}
