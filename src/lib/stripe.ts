/**
 * Stripe sin SDK: el cobro usa Checkout alojado por Stripe, así que solo hacen
 * falta unas cuantas llamadas a su API y la comprobación de la firma del
 * webhook. Solo en el servidor.
 *
 * Variables: STRIPE_SECRET_KEY (llave restringida `rk_...`) y
 * STRIPE_WEBHOOK_SECRET (`whsec_...`). STRIPE_API_URL solo existe para las
 * pruebas locales, que apuntan a un Stripe de mentiras.
 */

const base = () => (process.env.STRIPE_API_URL ?? "https://api.stripe.com").replace(/\/$/, "");

/** ¿Está configurado el cobro en este ambiente? */
export const stripeActivo = () => Boolean(process.env.STRIPE_SECRET_KEY);

export class ErrorStripe extends Error {
  constructor(
    mensaje: string,
    public estado: number,
    public codigo?: string,
  ) {
    super(mensaje);
  }
}

type Valor = string | number | boolean | null | undefined | Valor[] | { [clave: string]: Valor };

/** Convierte un objeto anidado al formato de formulario de Stripe: `a[b][0]=c`. */
export function aFormulario(datos: Record<string, Valor>): URLSearchParams {
  const forma = new URLSearchParams();
  const agregar = (clave: string, valor: Valor) => {
    if (valor === null || valor === undefined) return;
    if (Array.isArray(valor)) valor.forEach((v, i) => agregar(`${clave}[${i}]`, v));
    else if (typeof valor === "object") for (const [k, v] of Object.entries(valor)) agregar(`${clave}[${k}]`, v);
    else forma.append(clave, String(valor));
  };
  for (const [k, v] of Object.entries(datos)) agregar(k, v);
  return forma;
}

/** Llama a la API de Stripe. Lanza ErrorStripe si responde con error. */
export async function stripe<T = Record<string, unknown>>(
  metodo: "GET" | "POST",
  ruta: string,
  datos?: Record<string, Valor>,
  /** Llave de idempotencia: repetir la llamada con la misma llave no crea nada dos veces. */
  idempotencia?: string,
): Promise<T> {
  const llave = process.env.STRIPE_SECRET_KEY;
  if (!llave) throw new ErrorStripe("Stripe no está configurado.", 0);
  const forma = datos ? aFormulario(datos) : null;
  const url = `${base()}${ruta}${metodo === "GET" && forma?.size ? `?${forma}` : ""}`;
  const respuesta = await fetch(url, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${llave}`,
      ...(metodo === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...(idempotencia ? { "Idempotency-Key": idempotencia } : {}),
    },
    body: metodo === "POST" ? (forma ?? new URLSearchParams()).toString() : undefined,
    cache: "no-store",
  });
  const cuerpo = (await respuesta.json().catch(() => null)) as { error?: { message?: string; code?: string } } | null;
  if (!respuesta.ok || !cuerpo) {
    throw new ErrorStripe(cuerpo?.error?.message ?? "Stripe no respondió.", respuesta.status, cuerpo?.error?.code);
  }
  return cuerpo as T;
}

/** Pesos a centavos, como los pide Stripe. */
export const centavos = (pesos: number) => Math.round(pesos * 100);

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

/** Compara dos textos sin que el tiempo que tarda revele en qué letra difieren. */
function iguales(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let distinto = 0;
  for (let i = 0; i < a.length; i++) distinto |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return distinto === 0;
}

export async function firmar(secreto: string, texto: string): Promise<string> {
  const codificador = new TextEncoder();
  const llave = await crypto.subtle.importKey("raw", codificador.encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", llave, codificador.encode(texto)));
}

/** Minutos que se acepta un aviso después de firmado, contra reenvíos de avisos viejos. */
const TOLERANCIA_SEGUNDOS = 5 * 60;

/**
 * Comprueba el encabezado `Stripe-Signature` de un aviso: la firma es el
 * HMAC-SHA256 de "<momento>.<cuerpo tal como llegó>" con el secreto del webhook.
 */
export async function firmaValida(cuerpo: string, encabezado: string | null, secreto: string, ahora = Date.now()): Promise<boolean> {
  if (!encabezado || !secreto) return false;
  let momento = "";
  const firmas: string[] = [];
  for (const parte of encabezado.split(",")) {
    const [clave, valor] = parte.trim().split("=", 2);
    if (clave === "t") momento = valor ?? "";
    if (clave === "v1" && valor) firmas.push(valor);
  }
  if (!/^\d+$/.test(momento) || !firmas.length) return false;
  if (Math.abs(ahora / 1000 - Number(momento)) > TOLERANCIA_SEGUNDOS) return false;
  const esperada = await firmar(secreto, `${momento}.${cuerpo}`);
  return firmas.some((f) => iguales(f, esperada));
}
