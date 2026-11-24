/**
 * Punto de entrada del Worker: el sitio de Next.js (OpenNext) tal cual, más
 * el cron semanal. Cloudflare dispara `scheduled` según `triggers.crons` en
 * wrangler.jsonc y aquí se llama a /api/avisos/semanal dentro del mismo
 * Worker, sin salir a internet.
 */

// @ts-expect-error -- lo genera `opennextjs-cloudflare build` antes de desplegar.
import { default as sitio } from "./.open-next/worker.js";

type Entorno = { SUPABASE_SECRET_KEY?: string; [clave: string]: unknown };
type Contexto = { waitUntil(promesa: Promise<unknown>): void; passThroughOnException(): void };

async function llaveCron(secreto: string): Promise<string> {
  const datos = new TextEncoder().encode(`lagafeteria:avisos-semanal:${secreto}`);
  const huella = await crypto.subtle.digest("SHA-256", datos);
  return [...new Uint8Array(huella)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default {
  fetch: sitio.fetch,

  async scheduled(_evento: unknown, entorno: Entorno, contexto: Contexto) {
    if (!entorno.SUPABASE_SECRET_KEY) return console.error("Resumen semanal: falta SUPABASE_SECRET_KEY");
    const solicitud = new Request("https://lagafeteria.com/api/avisos/semanal", {
      method: "POST",
      headers: { "x-llave-cron": await llaveCron(entorno.SUPABASE_SECRET_KEY) },
    });
    const respuesta: Response = await sitio.fetch(solicitud, entorno, contexto);
    console.log("Resumen semanal:", respuesta.status, await respuesta.text());
  },
};

// @ts-expect-error -- igual que arriba.
export * from "./.open-next/worker.js";
