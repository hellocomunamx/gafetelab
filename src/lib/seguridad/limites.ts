import { getCloudflareContext } from "@opennextjs/cloudflare";
import { headers } from "next/headers";

/**
 * Límites de uso contra registros masivos y envíos repetidos (bots). Usan los
 * bindings de Rate Limiting de Cloudflare declarados en `wrangler.jsonc`; cada
 * uno cuenta por llave (IP o correo) en ventanas de 60 segundos.
 */
export const LIMITES = {
  /** Entrar, crear cuenta o pedir liga de acceso: por IP. */
  LIMITE_ACCESO: 10,
  /** Correos de acceso a una misma dirección. */
  LIMITE_ACCESO_CORREO: 3,
  /** Formularios públicos (contacto, liga por persona, cotización en PDF): por IP. */
  LIMITE_FORMULARIOS: 10,
} as const;

export type NombreLimite = keyof typeof LIMITES;

type Limitador = { limit: (opciones: { key: string }) => Promise<{ success: boolean }> };

/**
 * Respaldo en memoria para `next dev` o si el binding no existe: cuenta por
 * instancia, así que solo frena ráfagas. En producción manda el binding.
 */
const ventanas = new Map<string, { inicio: number; cuenta: number }>();
function dentroDelLimiteLocal(clave: string, limite: number): boolean {
  const ahora = Date.now();
  const v = ventanas.get(clave);
  if (!v || ahora - v.inicio > 60_000) {
    if (ventanas.size > 5_000) ventanas.clear();
    ventanas.set(clave, { inicio: ahora, cuenta: 1 });
    return true;
  }
  v.cuenta += 1;
  return v.cuenta <= limite;
}

/** ¿Todavía puede? `clave` es la IP, el correo o lo que se quiera contar. */
export async function dentroDelLimite(nombre: NombreLimite, clave: string): Promise<boolean> {
  let limitador: Limitador | undefined;
  try {
    limitador = (getCloudflareContext().env as unknown as Record<string, unknown>)[nombre] as Limitador | undefined;
  } catch {
    // Fuera de Cloudflare: se usa el respaldo.
  }
  try {
    if (limitador) return (await limitador.limit({ key: clave })).success;
  } catch (e) {
    // Si el servicio de límites falla, no se le cierra la puerta a nadie.
    console.error("Límite de uso:", e);
    return true;
  }
  return dentroDelLimiteLocal(`${nombre}:${clave}`, LIMITES[nombre]);
}

/** IP de quien hace la solicitud, según Cloudflare. */
export function ipDe(cabeceras: Headers): string {
  return (
    cabeceras.get("cf-connecting-ip") ??
    cabeceras.get("x-forwarded-for")?.split(",")[0].trim() ??
    "desconocida"
  );
}

/** IP de quien llama una acción del servidor. */
export async function ipActual(): Promise<string> {
  return ipDe(await headers());
}

export const MENSAJE_LIMITE = "Recibimos muchos intentos seguidos. Espera un minuto y vuelve a intentar.";
