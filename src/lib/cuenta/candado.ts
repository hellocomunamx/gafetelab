import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { RUTA_LIGA } from "@/lib/cuenta/ligas";
import { sha256 } from "@/lib/portal/cripto";
import { site } from "@/lib/site";
import type { Database } from "@/lib/supabase/tipos";

/**
 * Candado del gafete digital con la huella, la cara o el PIN del celular
 * (passkeys, WebAuthn). Si la persona lo activa, su liga solo se abre después
 * de confirmar en su dispositivo; LaGafetería solo guarda la llave pública.
 *
 * Al abrirlo queda una cookie firmada, solo para esa liga, que dura unos
 * minutos: recargar no vuelve a pedir la huella, pero abrirla otro día sí.
 * El reto de cada intento también viaja en una cookie firmada, de un solo uso.
 */

/** Cuánto tiempo queda abierta la liga después de confirmar. */
export const MINUTOS_ABIERTO = 10;
const MINUTOS_RETO = 5;
/** Dispositivos con candado por persona, como máximo. */
export const MAX_LLAVES = 5;

const COOKIE_ABIERTO = "lg_candado";
const COOKIE_RETO = "lg_reto";

export const rutaDeLiga = (liga: string) => `${RUTA_LIGA}/${liga}`;

/** Dominio y origen que firman las llaves: los del sitio. */
export function sitioWebAuthn() {
  const url = new URL(site.url);
  return { rpID: url.hostname, origen: url.origin, nombre: site.nombre };
}

const codificador = new TextEncoder();
let llaveFirma: Promise<CryptoKey> | null = null;

/** Llave HMAC derivada de la llave secreta del servidor (no se guarda en ningún lado). */
function llaveDeFirma(): Promise<CryptoKey> {
  const secreto = process.env.SUPABASE_SECRET_KEY;
  if (!secreto) throw new Error("Falta SUPABASE_SECRET_KEY");
  llaveFirma ??= (async () => {
    const material = await sha256(`lagafeteria:candado:${secreto}`);
    return crypto.subtle.importKey("raw", codificador.encode(material), { name: "HMAC", hash: "SHA-256" }, false, [
      "sign",
      "verify",
    ]);
  })();
  return llaveFirma;
}

function aBase64Url(bytes: ArrayBuffer): string {
  let texto = "";
  for (const b of new Uint8Array(bytes)) texto += String.fromCharCode(b);
  return btoa(texto).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function firmar(mensaje: string): Promise<string> {
  return aBase64Url(await crypto.subtle.sign("HMAC", await llaveDeFirma(), codificador.encode(mensaje)));
}

/** valor.expira.firma, con la firma sobre propósito|liga|valor|expira. */
async function sellar(proposito: string, liga: string, valor: string, minutos: number): Promise<string> {
  const expira = Date.now() + minutos * 60_000;
  return `${valor}.${expira}.${await firmar(`${proposito}|${liga}|${valor}|${expira}`)}`;
}

async function abrirSello(proposito: string, liga: string, sello: string | undefined): Promise<string | null> {
  const partes = sello?.split(".");
  if (!partes || partes.length !== 3) return null;
  const [valor, expira, firma] = partes;
  if (!/^\d+$/.test(expira) || Number(expira) < Date.now()) return null;
  const esperada = await firmar(`${proposito}|${liga}|${valor}|${expira}`);
  if (esperada.length !== firma.length) return null;
  let diferencia = 0;
  for (let i = 0; i < firma.length; i++) diferencia |= firma.charCodeAt(i) ^ esperada.charCodeAt(i);
  return diferencia === 0 ? valor : null;
}

const opcionesCookie = (liga: string, minutos: number) => ({
  path: rutaDeLiga(liga),
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: minutos * 60,
});

/** Guarda el reto de este intento (registro o entrada). Solo desde acciones del servidor. */
export async function guardarReto(liga: string, tipo: "registro" | "entrada", reto: string) {
  (await cookies()).set(COOKIE_RETO, await sellar(`reto-${tipo}`, liga, reto, MINUTOS_RETO), opcionesCookie(liga, MINUTOS_RETO));
}

/** El reto guardado, que se borra al leerlo: cada reto sirve una sola vez. */
export async function tomarReto(liga: string, tipo: "registro" | "entrada"): Promise<string | null> {
  const almacen = await cookies();
  const reto = await abrirSello(`reto-${tipo}`, liga, almacen.get(COOKIE_RETO)?.value);
  almacen.set(COOKIE_RETO, "", { ...opcionesCookie(liga, 0), maxAge: 0 });
  return reto;
}

/** Deja la liga abierta unos minutos en este navegador. */
export async function abrirCandado(liga: string, empleadoId: string) {
  (await cookies()).set(COOKIE_ABIERTO, await sellar("abierto", liga, empleadoId, MINUTOS_ABIERTO), opcionesCookie(liga, MINUTOS_ABIERTO));
}

/** Vuelve a cerrar la liga en este navegador. */
export async function cerrarCandado(liga: string) {
  (await cookies()).set(COOKIE_ABIERTO, "", { ...opcionesCookie(liga, 0), maxAge: 0 });
}

/** ¿Este navegador abrió la liga con su huella hace poco? */
export async function candadoAbierto(liga: string, empleadoId: string): Promise<boolean> {
  return (await abrirSello("abierto", liga, (await cookies()).get(COOKIE_ABIERTO)?.value)) === empleadoId;
}

export type LlaveGafete = Pick<
  Database["public"]["Tables"]["llaves_gafete"]["Row"],
  "id" | "credencial_id" | "llave_publica" | "contador" | "transportes" | "dispositivo" | "creada_en" | "usada_en"
>;

export async function llavesDe(servicio: SupabaseClient<Database>, empleadoId: string): Promise<LlaveGafete[]> {
  const { data } = await servicio
    .from("llaves_gafete")
    .select("id, credencial_id, llave_publica, contador, transportes, dispositivo, creada_en, usada_en")
    .eq("empleado_id", empleadoId)
    .order("creada_en");
  return data ?? [];
}

/**
 * ¿La liga está cerrada con candado para este navegador? Sí cuando la persona
 * tiene al menos un dispositivo registrado y aquí no lo ha abierto.
 */
export async function ligaBloqueada(servicio: SupabaseClient<Database>, liga: string, empleadoId: string): Promise<boolean> {
  const { count } = await servicio
    .from("llaves_gafete")
    .select("id", { count: "exact", head: true })
    .eq("empleado_id", empleadoId);
  return Boolean(count) && !(await candadoAbierto(liga, empleadoId));
}

/** «iPhone», «Android», «Computadora»: para reconocer cada dispositivo en la lista. */
export function dispositivoDe(agente: string | null): string {
  const ua = agente ?? "";
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) return "Android";
  if (/Macintosh|Windows|Linux|CrOS/i.test(ua)) return "Computadora";
  return "Dispositivo";
}
