/**
 * Avisos por correo a quienes administran una empresa. Cada administrador
 * elige, por tipo, si le llega al momento, en el resumen semanal o nunca.
 * Sin elegir nada, le llega en el resumen semanal.
 */

export const TIPOS_AVISO = {
  cambio_foto: {
    nombre: "Cambios de foto",
    detalle: "Alguien de tu equipo pide cambiar la foto de su gafete digital.",
  },
  datos_liga: {
    nombre: "Datos y fotos por aprobar",
    detalle: "Alguien de tu equipo mandó sus datos o su foto desde su liga.",
  },
} as const;
export type TipoAviso = keyof typeof TIPOS_AVISO;
export const esTipoAviso = (v: unknown): v is TipoAviso => typeof v === "string" && v in TIPOS_AVISO;

export const MODOS_AVISO = {
  inmediato: { nombre: "Al momento", detalle: "Un correo cada vez" },
  semanal: { nombre: "Resumen semanal", detalle: "Los lunes, solo si hay pendientes" },
  ninguno: { nombre: "No me avises", detalle: "Lo ves al entrar" },
} as const;
export type ModoAviso = keyof typeof MODOS_AVISO;
export const esModoAviso = (v: unknown): v is ModoAviso => typeof v === "string" && v in MODOS_AVISO;
export const MODO_INICIAL: ModoAviso = "semanal";

export const RUTA_AVISOS = "/cuenta/avisos";
export const RUTA_CAMBIOS_FOTO = "/cuenta/equipo/cambios-foto";
export const RUTA_LIGAS = "/cuenta/equipo/ligas";
