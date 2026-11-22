/**
 * Datos del asistente que también usa el navegador (nombre, saludo, límites).
 * Las instrucciones y el conocimiento viven en asistente.ts, solo en el servidor.
 */
import { site } from "./site";

export const asistente = {
  /** Nombre con el que se presenta. Cámbialo aquí y se cambia en todos lados. */
  nombre: "Gafi",
  modelo: "claude-opus-5-5",
  /** Para platicar basta con poco razonamiento: responde rápido y gasta menos. */
  esfuerzo: "low",
  /** Tope de la respuesta. Un mensaje de chat rara vez pasa de 300 tokens. */
  maxTokens: 1200,
  /** Caracteres por mensaje de la persona. */
  maxCaracteres: 1000,
  /** Mensajes de historial que se mandan al modelo (los más recientes). */
  maxHistorial: 20,
  /** Mensajes de la persona por conversación antes de sugerir el contacto. */
  maxTurnos: 30,
  /** Solicitudes por minuto por persona (IP). Va también en wrangler.jsonc. */
  porMinutoPorPersona: 8,
  /** Solicitudes por minuto en todo el sitio, como freno de gasto. */
  porMinutoGlobal: 60,
} as const;

export const saludoAsistente = `¡Hola! Soy ${asistente.nombre}, el asistente de ${site.nombre}. Te ayudo con dudas sobre gafetes y credenciales: precios, materiales, cómo se pide, la plataforma o los envíos. ¿Qué te gustaría saber?`;

export const sugerenciasAsistente = [
  "¿Cuánto cuestan 50 gafetes?",
  "¿Qué incluye la plataforma?",
  "¿Cómo subo a mi equipo?",
  "¿Cuánto tarda en llegar?",
];
