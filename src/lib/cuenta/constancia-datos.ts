import { regimenesFiscales } from "./catalogos";
import { normalizar } from "./texto";

/**
 * Lo que se puede leer del texto de una Constancia de Situación Fiscal del
 * SAT, para prellenar los datos de la empresa. Nada de esto se da por bueno:
 * la persona lo revisa y lo confirma antes de guardar.
 */
export type DatosConstancia = {
  rfc?: string;
  /** Razón social (sin el régimen de capital) o nombre completo de la persona física. */
  razonSocial?: string;
  /** Clave del régimen fiscal, del catálogo del SAT ("601"). */
  regimen?: string;
  /** true si la constancia trae más de un régimen de los que conocemos. */
  variosRegimenes?: boolean;
  cp?: string;
  /** Fecha de emisión, AAAA-MM-DD. */
  fecha?: string;
};

export const RFC_VALIDO = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/;

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** Etiquetas de la constancia: el valor de cada una llega hasta la siguiente. */
const ETIQUETAS = [
  "RFC",
  "CURP",
  "Nombre \\(s\\)",
  "Primer Apellido",
  "Segundo Apellido",
  "Denominaci[oó]n\\s*/\\s*Raz[oó]n Social",
  "R[eé]gimen Capital",
  "Nombre Comercial",
  "Fecha inicio de operaciones",
  "Estatus en el padr[oó]n",
  "Fecha de [uú]ltimo cambio de estado",
  "C[oó]digo Postal",
  "Tipo de Vialidad",
  "Nombre de Vialidad",
  "N[uú]mero Exterior",
  "N[uú]mero Interior",
  "Nombre de la Colonia",
  "Nombre de la Localidad",
  "Nombre del Municipio[^:]*",
  "Nombre de la Entidad Federativa",
  "Entre Calle",
  "Y Calle",
  "Datos del domicilio registrado",
  "Datos de Identificaci[oó]n del Contribuyente",
];
const SIGUIENTE = `(?=\\s*(?:${ETIQUETAS.join("|")})\\s*:|$)`;

function valor(texto: string, etiqueta: string): string {
  const encontrado = new RegExp(`${etiqueta}\\s*:\\s*(.*?)${SIGUIENTE}`, "i").exec(texto);
  return encontrado?.[1].trim() ?? "";
}

/** Palabras que distinguen a cada régimen, en el orden en que se prefieren para facturar. */
const REGIMENES: [clave: string, pista: string][] = [
  ["626", "simplificado de confianza"],
  ["601", "general de ley personas morales"],
  ["603", "fines no lucrativos"],
  ["612", "actividades empresariales y profesionales"],
  ["621", "incorporacion fiscal"],
  ["625", "plataformas tecnologicas"],
  ["622", "agricolas ganaderas"],
  ["623", "grupos de sociedades"],
  ["624", "coordinados"],
  ["606", "arrendamiento"],
  ["605", "sueldos y salarios"],
  ["616", "sin obligaciones fiscales"],
];

/** Lee los datos de una constancia a partir de su texto. Null si el texto no es de una constancia. */
export function leerConstancia(texto: string): DatosConstancia | null {
  const plano = texto.replace(/\s+/g, " ").trim();
  if (!normalizar(plano).includes("constancia de situacion fiscal")) return null;
  const datos: DatosConstancia = {};

  const rfc = valor(plano, "RFC").toUpperCase().replace(/[\s-]/g, "");
  if (RFC_VALIDO.test(rfc)) datos.rfc = rfc;

  const razon = valor(plano, "Denominaci[oó]n\\s*/\\s*Raz[oó]n Social");
  const persona = [valor(plano, "Nombre \\(s\\)"), valor(plano, "Primer Apellido"), valor(plano, "Segundo Apellido")]
    .filter(Boolean)
    .join(" ");
  const nombre = (razon || persona).slice(0, 200);
  if (nombre) datos.razonSocial = nombre;

  const cp = /^\d{5}/.exec(valor(plano, "C[oó]digo Postal"))?.[0];
  if (cp) datos.cp = cp;

  // "HERMOSILLO , SONORA A 05 DE NOVIEMBRE DE 2026"
  const emision = /Lugar y Fecha de Emisi[oó]n.*?\bA\s+(\d{1,2})\s+DE\s+([A-ZÁÉÍÓÚ]+)\s+DE\s+(\d{4})/i.exec(plano);
  const mes = emision ? MESES.indexOf(normalizar(emision[2])) : -1;
  if (emision && mes >= 0) datos.fecha = `${emision[3]}-${String(mes + 1).padStart(2, "0")}-${emision[1].padStart(2, "0")}`;

  // Los regímenes vienen en una tabla al final, después del título "Regímenes:".
  const tabla = normalizar(plano.slice(Math.max(0, plano.search(/Reg[ií]menes\s*:/i))));
  const encontrados = REGIMENES.filter(([, pista]) => tabla.includes(pista)).map(([clave]) => clave);
  if (encontrados.length && regimenesFiscales.some((r) => r.clave === encontrados[0])) {
    datos.regimen = encontrados[0];
    datos.variosRegimenes = encontrados.length > 1;
  }

  return datos.rfc || datos.razonSocial || datos.fecha ? datos : null;
}
