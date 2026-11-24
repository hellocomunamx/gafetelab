/**
 * Criptografía del portal de empleados, con WebCrypto (funciona igual en
 * Cloudflare Workers y en Node). Nada de esto se guarda en claro: ni el NIP,
 * ni los códigos, ni las ligas, ni las cookies de sesión.
 */

const codificador = new TextEncoder();
const ITERACIONES = 100_000; // El máximo que permite PBKDF2 en Cloudflare Workers.

const aHex = (bytes: ArrayBuffer | Uint8Array) =>
  Array.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");

function aBase64Url(bytes: Uint8Array): string {
  let texto = "";
  for (const b of bytes) texto += String.fromCharCode(b);
  return btoa(texto).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Texto aleatorio para ligas y cookies (32 bytes, 43 caracteres). */
export function tokenAleatorio(): string {
  return aBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}
export const FORMATO_TOKEN = /^[A-Za-z0-9_-]{43}$/;

/** Dígitos al azar, sin sesgo. */
export function digitosAleatorios(cuantos = 6): string {
  let salida = "";
  while (salida.length < cuantos) {
    const [n] = crypto.getRandomValues(new Uint32Array(1));
    if (n < 4_294_967_290) salida += String(n % 10); // descarta el sobrante para no sesgar
  }
  return salida;
}

/** SHA-256 en hexadecimal. Para tokens largos y aleatorios basta: no se pueden adivinar. */
export async function sha256(texto: string): Promise<string> {
  return aHex(await crypto.subtle.digest("SHA-256", codificador.encode(texto)));
}

/** Compara sin revelar, por el tiempo que tarda, cuántos caracteres coinciden. */
export function igualesSeguro(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferencia === 0;
}

async function derivar(nip: string, sal: string, iteraciones: number): Promise<string> {
  const llave = await crypto.subtle.importKey("raw", codificador.encode(nip), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: codificador.encode(sal), iterations: iteraciones },
    llave,
    256,
  );
  return aHex(bits);
}

/** NIP → pbkdf2$<iteraciones>$<sal>$<hash>. */
export async function hashNip(nip: string): Promise<string> {
  const sal = aHex(crypto.getRandomValues(new Uint8Array(16)));
  return `pbkdf2$${ITERACIONES}$${sal}$${await derivar(nip, sal, ITERACIONES)}`;
}

/** Hash de relleno: si el ID no existe se gasta el mismo tiempo, para no revelar qué IDs existen. */
const HASH_RELLENO = `pbkdf2$${ITERACIONES}$00000000000000000000000000000000$${"0".repeat(64)}`;

/** ¿El NIP coincide? Sin hash guardado, tarda lo mismo y dice que no. */
export async function nipCorrecto(nip: string, guardado: string | null | undefined): Promise<boolean> {
  const partes = (guardado || HASH_RELLENO).split("$");
  if (partes.length !== 4 || partes[0] !== "pbkdf2") return false;
  const iteraciones = Number(partes[1]);
  if (!Number.isInteger(iteraciones) || iteraciones < 1 || iteraciones > ITERACIONES) return false;
  const calculado = await derivar(nip, partes[2], iteraciones);
  return Boolean(guardado) && igualesSeguro(calculado, partes[3]);
}
