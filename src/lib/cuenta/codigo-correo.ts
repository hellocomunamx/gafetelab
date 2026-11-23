/**
 * Código de 6 dígitos para confirmar el correo de una empresa. No se guarda en
 * la base: viaja en una cookie firmada con la llave secreta del servidor, que
 * solo sirve junto con el código que llegó al correo y vence en 15 minutos.
 */

export const COOKIE_CODIGO = "lg_codigo_correo";
export const MINUTOS_CODIGO = 15;

type Carga = { empresa: string; correo: string; negocio: string; vence: number };

const codificador = new TextEncoder();
const base64 = (bytes: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const desdeBase64 = (texto: string) => atob(texto.replace(/-/g, "+").replace(/_/g, "/"));

async function firma(texto: string): Promise<string | null> {
  const secreto = process.env.SUPABASE_SECRET_KEY;
  if (!secreto) return null;
  const llave = await crypto.subtle.importKey("raw", codificador.encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64(await crypto.subtle.sign("HMAC", llave, codificador.encode(`codigo-correo:${texto}`)));
}

/** Un código nuevo y la cookie que lo respalda. Null si falta la llave del servidor. */
export async function nuevoCodigo(datos: Omit<Carga, "vence">): Promise<{ codigo: string; cookie: string } | null> {
  const codigo = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, "0");
  const carga = base64(codificador.encode(JSON.stringify({ ...datos, vence: Date.now() + MINUTOS_CODIGO * 60_000 })));
  const sello = await firma(`${carga}.${codigo}`);
  return sello ? { codigo, cookie: `${carga}.${sello}` } : null;
}

/** Comprueba el código contra la cookie. Devuelve los datos si coincide y no ha vencido. */
export async function revisarCodigo(cookie: string | undefined, codigo: string): Promise<Carga | null> {
  const [carga, sello] = (cookie ?? "").split(".");
  if (!carga || !sello || !/^\d{6}$/.test(codigo)) return null;
  const esperado = await firma(`${carga}.${codigo}`);
  if (!esperado || esperado.length !== sello.length) return null;
  let diferencia = 0;
  for (let i = 0; i < sello.length; i++) diferencia |= sello.charCodeAt(i) ^ esperado.charCodeAt(i);
  if (diferencia) return null;
  try {
    const datos = JSON.parse(new TextDecoder().decode(Uint8Array.from(desdeBase64(carga), (c) => c.charCodeAt(0)))) as Carga;
    return datos.vence > Date.now() ? datos : null;
  } catch {
    return null;
  }
}
