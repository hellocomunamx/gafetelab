import { urlAbsoluta } from "@/lib/site";

/**
 * Reglas del portal de empleados «Mi gafete»: dirección de cada empresa,
 * NIP, bloqueos y vigencias. Todo lo que define qué tan difícil es entrar
 * sin permiso vive aquí.
 */

/** Ruta base del portal. La de cada empresa es /e/<handle>. */
export const RUTA_PORTAL = "/e";
export const rutaPortal = (handle: string) => `${RUTA_PORTAL}/${handle}`;
export const urlPortal = (handle: string) => urlAbsoluta(rutaPortal(handle));
/** Dónde la empresa configura su portal y da los NIP. */
export const RUTA_PORTAL_EMPRESA = "/cuenta/portal";

/** Cookie de la sesión del portal. Solo viaja en /e: nunca se mezcla con la cuenta de empresa. */
export const COOKIE_PORTAL = "lg_portal";
export const DIAS_SESION = 30;

/** Handle: 3 a 30 caracteres, minúsculas, números y guiones (no al inicio ni al final, ni dobles). */
export const FORMATO_HANDLE = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;
const RESERVADOS = new Set([
  "admin", "8admins", "api", "app", "ayuda", "cuenta", "e", "entrar", "lagafeteria", "gafetelab", "login",
  "mi-gafete", "nip", "portal", "salir", "soporte", "www", "hola", "no-reply", "seguridad", "test", "prueba",
]);

/** Convierte lo que se escribió en un handle válido, o explica por qué no se puede. */
export function validarHandle(texto: string): { handle: string } | { error: string } {
  const handle = texto.trim().toLowerCase();
  if (handle.length < 3 || handle.length > 30) return { error: "Usa de 3 a 30 caracteres." };
  if (!FORMATO_HANDLE.test(handle) || handle.includes("--")) {
    return { error: "Usa solo minúsculas sin acentos, números y guiones (no al inicio ni al final)." };
  }
  if (RESERVADOS.has(handle)) return { error: "Esa dirección está reservada. Elige otra." };
  return { handle };
}

/** Una propuesta de handle a partir del nombre de la empresa. */
export function sugerirHandle(nombre: string): string {
  const base = nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\b(s\.? ?a\.?|de|c\.? ?v\.?|s\.? ?de r\.? ?l\.?|sapi|sc)\b/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/g, "");
  return base.length >= 3 ? base : `${base}-equipo`.replace(/^-/, "");
}

/** ID de acceso: lo que la persona escribe junto con su NIP. */
export const FORMATO_ID_ACCESO = /^[A-Za-z0-9._-]{1,40}$/;
export const limpiarIdAcceso = (texto: unknown) => (typeof texto === "string" ? texto.trim().replace(/\s+/g, "") : "");

/** NIP: exactamente 6 dígitos. */
export const FORMATO_NIP = /^\d{6}$/;

/** NIP que no se permiten por fáciles de adivinar. */
export function nipDebil(nip: string, idAcceso = ""): string | null {
  if (!FORMATO_NIP.test(nip)) return "El NIP son 6 números.";
  if (/^(\d)\1{5}$/.test(nip)) return "No uses el mismo número repetido.";
  const ascendente = "01234567890";
  const descendente = "09876543210";
  if (ascendente.includes(nip) || descendente.includes(nip)) return "No uses números seguidos (123456).";
  if (/^(\d\d)\1\1$/.test(nip) || /^(\d{3})\1$/.test(nip)) return "No uses un patrón repetido (121212).";
  const soloDigitosId = idAcceso.replace(/\D/g, "");
  if (soloDigitosId.length >= 4 && (nip.includes(soloDigitosId) || soloDigitosId.includes(nip))) {
    return "No uses tu número de empleado como NIP.";
  }
  // Año y mes (199805): muy común y fácil de adivinar.
  if (/^(19|20)\d{2}(0[1-9]|1[0-2])$/.test(nip)) return "No uses una fecha.";
  return null;
}

/**
 * Bloqueo por intentos fallidos con el NIP: cada 5 errores seguidos se bloquea
 * un rato (15 min, luego 1 h); a los 15 errores queda bloqueado hasta que la
 * empresa le dé un NIP nuevo. Esto se suma a los límites por IP.
 */
export const INTENTOS_POR_TANDA = 5;
export const INTENTOS_MAXIMOS = 15;
export function bloqueoTras(intentos: number): Date | null {
  if (intentos >= INTENTOS_MAXIMOS) return new Date("9999-12-31T00:00:00Z");
  if (intentos % INTENTOS_POR_TANDA !== 0) return null;
  const minutos = intentos === INTENTOS_POR_TANDA ? 15 : 60;
  return new Date(Date.now() + minutos * 60_000);
}
export const bloqueadoHastaQueLaEmpresa = (hasta: string | null) => Boolean(hasta && new Date(hasta).getUTCFullYear() >= 9999);
/** Cómo está hoy el acceso con NIP: libre, bloqueado un rato o hasta que la empresa le dé otro NIP. */
export function estadoBloqueo(hasta: string | null): "no" | "rato" | "empresa" {
  if (!hasta || new Date(hasta).getTime() <= Date.now()) return "no";
  return bloqueadoHastaQueLaEmpresa(hasta) ? "empresa" : "rato";
}

/** Código que llega al correo: 6 dígitos, 15 minutos, 5 intentos. */
export const MINUTOS_CODIGO = 15;
export const INTENTOS_CODIGO = 5;
export const FORMATO_CODIGO = /^\d{6}$/;
