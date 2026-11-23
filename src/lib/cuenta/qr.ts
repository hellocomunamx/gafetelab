import { site } from "@/lib/site";

export type ModoQr = "verificacion" | "liga" | "dato";

/** Ajuste "Qué muestra tu QR" de una empresa (columnas qr_* de `empresas`). */
export type AjusteQr = {
  qr_modo: string;
  qr_mostrar: string[];
  qr_vigencia: string | null;
  qr_liga: string | null;
  qr_dato: string;
};

export const COLUMNAS_QR = "qr_modo, qr_mostrar, qr_vigencia, qr_liga, qr_dato";

export const modosQr: { id: ModoQr; titulo: string; texto: string }[] = [
  {
    id: "verificacion",
    titulo: "Página de verificación",
    texto: "Al escanear se ve si el gafete está vigente o expirado, con los datos que tú elijas. Incluida sin costo extra.",
  },
  {
    id: "liga",
    titulo: "Una liga tuya",
    texto: "Tu sitio, tu intranet o tu sistema de asistencia. Puede llevar el número de cada persona.",
  },
  {
    id: "dato",
    titulo: "Un dato",
    texto: "El código contiene solo un dato de la persona, por ejemplo su número de empleado.",
  },
];

/** Lo que la empresa puede mostrar en la página de verificación. */
export const datosVerificables = [
  { clave: "empresa", etiqueta: "Nombre de tu empresa" },
  { clave: "nombre", etiqueta: "Nombre" },
  { clave: "puesto", etiqueta: "Puesto" },
  { clave: "numero_empleado", etiqueta: "Número de empleado" },
  { clave: "departamento", etiqueta: "Departamento" },
  { clave: "foto", etiqueta: "Fotografía" },
] as const;

export const rutaVerificacion = (codigo: string) => `/v/${codigo}`;
export const ligaVerificacion = (codigo: string) => `${site.url}${rutaVerificacion(codigo)}`;

/** Código de muestra para el editor y las miniaturas, con el mismo largo que uno real. */
export const CODIGO_MUESTRA = "EJEMPLO-0042";

/**
 * Lo que lleva escrito el código QR de una persona, según el ajuste de su empresa.
 * `valores` son sus datos por clave de campo. Devuelve "" si no hay nada que escribir.
 */
export function contenidoQr(
  ajuste: AjusteQr,
  persona: { codigo: string; valores: Record<string, string> },
): string {
  if (ajuste.qr_modo === "liga") {
    const liga = ajuste.qr_liga ?? "";
    const numero = (persona.valores.numero_empleado ?? "").trim();
    // Si la liga pide el número y la persona no lo tiene, es mejor avisar que imprimir una liga rota.
    if (liga.includes("{numero}") && !numero) return "";
    return liga
      .replaceAll("{numero}", encodeURIComponent(numero))
      .replaceAll("{codigo}", encodeURIComponent(persona.codigo));
  }
  if (ajuste.qr_modo === "dato") return (persona.valores[ajuste.qr_dato] ?? "").trim();
  return ligaVerificacion(persona.codigo);
}

/** Explica en pocas palabras a dónde lleva el QR con este ajuste. */
export function resumenQr(ajuste: AjusteQr, etiquetas: Record<string, string>): string {
  if (ajuste.qr_modo === "liga") return "Lleva a tu liga.";
  if (ajuste.qr_modo === "dato") return `Contiene: ${(etiquetas[ajuste.qr_dato] ?? ajuste.qr_dato).toLowerCase()}.`;
  return "Lleva a la página de verificación.";
}
