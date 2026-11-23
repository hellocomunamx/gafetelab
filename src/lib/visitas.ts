import { RUTA_ADMIN } from "@/lib/admin/ruta";

/**
 * Conteo propio y anónimo de visitas. Aquí están las reglas de qué se cuenta
 * y cómo se guarda; nada de esto identifica a una persona.
 */

/** Lo que no se cuenta: la plataforma con sesión, el panel, las rutas internas y la liga de cada persona. */
const SIN_CONTAR = ["/cuenta", RUTA_ADMIN, "/aceptar", "/api", "/auth", "/salir", "/mi-gafete"];

/** Ruta bajo la que se guardan todas las verificaciones de QR, sin el código de la persona. */
export const RUTA_QR = "/v";

/** La ruta tal como se guarda, o null si esa página no se cuenta. */
export function rutaContable(valor: unknown): string | null {
  if (typeof valor !== "string" || !valor.startsWith("/") || valor.length > 300) return null;
  let ruta = valor.split(/[?#]/)[0].replace(/\/{2,}/g, "/");
  if (ruta.length > 1) ruta = ruta.replace(/\/$/, "");
  if (!/^\/[A-Za-z0-9\-._~/%]*$/.test(ruta) || ruta.length > 200) return null;
  if (ruta === RUTA_QR || ruta.startsWith(`${RUTA_QR}/`)) return RUTA_QR;
  if (SIN_CONTAR.some((p) => ruta === p || ruta.startsWith(`${p}/`))) return null;
  return ruta;
}

const limpio = (texto: string) => texto.toLowerCase().replace(/^www\./, "").slice(0, 100);

/**
 * De dónde llegó la visita: la campaña (utm_source) si la liga la trae o, si
 * no, el sitio que la mandó. Null cuando entró directo o venía del propio sitio.
 */
export function origenDe(referente: unknown, campana: unknown, sitio: string): string | null {
  if (typeof campana === "string" && /^[A-Za-z0-9._-]{1,60}$/.test(campana)) return limpio(campana);
  if (typeof referente !== "string" || !referente) return null;
  try {
    const url = new URL(referente);
    if (!/^https?:$/.test(url.protocol)) return null;
    const host = limpio(url.hostname);
    return host && host !== limpio(sitio) ? host : null;
  } catch {
    return null;
  }
}

export type Dispositivo = "celular" | "tableta" | "computadora";

export function dispositivoDe(navegador: string): Dispositivo {
  if (/ipad|tablet|kindle|silk|playbook/i.test(navegador) || (/android/i.test(navegador) && !/mobile/i.test(navegador))) return "tableta";
  if (/mobi|iphone|ipod|android|windows phone/i.test(navegador)) return "celular";
  return "computadora";
}

/** Programas que no son personas: rastreadores, monitores y navegadores automáticos. */
export const esPrograma = (navegador: string) =>
  !navegador ||
  /bot|crawl|spider|slurp|preview|monitor|lighthouse|headless|phantom|puppeteer|playwright|selenium|python|curl|wget|httpclient|go-http|okhttp|axios|node-fetch|facebookexternalhit|whatsapp|pingdom|uptime/i.test(
    navegador,
  );

export const nombresDispositivo: Record<Dispositivo, string> = {
  celular: "Celular",
  tableta: "Tableta",
  computadora: "Computadora",
};

/** Cómo se lee un origen conocido en el panel. */
const ORIGENES: [RegExp, string][] = [
  [/(^|\.)google\./, "Google"],
  [/(^|\.)bing\.com$/, "Bing"],
  [/(^|\.)duckduckgo\.com$/, "DuckDuckGo"],
  [/(^|\.)yahoo\.com$/, "Yahoo"],
  [/(^|\.)(chatgpt\.com|openai\.com)$/, "ChatGPT"],
  [/(^|\.)perplexity\.ai$/, "Perplexity"],
  [/(^|\.)(claude\.ai|anthropic\.com)$/, "Claude"],
  [/(^|\.)gemini\.google\.com$/, "Gemini"],
  [/(^|\.)copilot\.microsoft\.com$/, "Copilot"],
  [/(^|\.)(facebook\.com|fb\.com)$/, "Facebook"],
  [/(^|\.)instagram\.com$/, "Instagram"],
  [/(^|\.)(t\.co|twitter\.com|x\.com)$/, "X"],
  [/(^|\.)linkedin\.com$/, "LinkedIn"],
  [/(^|\.)tiktok\.com$/, "TikTok"],
  [/(^|\.)youtube\.com$/, "YouTube"],
  [/(^|\.)(wa\.me|whatsapp\.com)$/, "WhatsApp"],
];
export function nombreOrigen(origen: string): string {
  if (!origen) return "Directo (escribieron la dirección o abrieron una liga guardada)";
  // Gemini va antes que Google porque su dominio también es de Google.
  if (/(^|\.)gemini\.google\.com$/.test(origen)) return "Gemini";
  return ORIGENES.find(([patron]) => patron.test(origen))?.[1] ?? origen;
}
