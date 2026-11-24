import type { Database } from "@/lib/supabase/tipos";

type Tablas = Database["public"]["Tables"];

export type Empleado = Tablas["empleados"]["Row"];
export type Campo = Tablas["campos"]["Row"];
export type Direccion = Tablas["direcciones"]["Row"];
export type DatosFiscales = Tablas["datos_fiscales"]["Row"];
export type Gafete = Tablas["gafetes"]["Row"];

/** Lo que devuelve una acción de formulario. */
export type Resultado = { ok?: string; error?: string };

/** Una persona leída del Excel, lista para importar. */
export type FilaImportada = {
  nombre: string;
  numero_empleado?: string;
  puesto?: string;
  departamento?: string;
  tipo_contrato?: string;
  /** Campos propios de la empresa, por clave. */
  datos?: Record<string, string>;
  /** Correo de la persona, para mandarle su liga. */
  correo?: string;
  /** Nombre del archivo de su foto, si el Excel lo trae. */
  foto_archivo?: string;
};

/** Campos de sistema que viven en columnas de `empleados`. */
export const COLUMNAS_SISTEMA = ["nombre", "puesto", "numero_empleado", "departamento", "tipo_contrato"] as const;
export type ColumnaSistema = (typeof COLUMNAS_SISTEMA)[number];
export const esColumnaSistema = (clave: string): clave is ColumnaSistema =>
  (COLUMNAS_SISTEMA as readonly string[]).includes(clave);

/** Datos que trae cada empresa de entrada. Se pueden quitar y recuperar; «Nombre» siempre se queda. */
export const DATOS_DE_ENTRADA = [
  { clave: "puesto", etiqueta: "Puesto", tipo: "texto", cara: "frente" },
  { clave: "numero_empleado", etiqueta: "Número de empleado", tipo: "texto", cara: "frente" },
  { clave: "foto", etiqueta: "Fotografía", tipo: "foto", cara: "frente" },
  { clave: "departamento", etiqueta: "Departamento", tipo: "texto", cara: "frente" },
  { clave: "tipo_contrato", etiqueta: "Tipo de contrato", tipo: "texto", cara: "frente" },
  { clave: "qr", etiqueta: "Código QR", tipo: "qr", cara: "vuelta" },
] as const;
