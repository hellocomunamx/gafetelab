/**
 * Punto de entrada del Worker: el sitio de Next.js (OpenNext) tal cual, más
 * el cron semanal. Cloudflare dispara `scheduled` según `triggers.crons` en
 * wrangler.jsonc y aquí se llama a /api/avisos/semanal dentro del mismo
 * Worker, sin salir a internet.
 */

// @ts-expect-error -- lo genera `opennextjs-cloudflare build` antes de desplegar.
import { default as sitio } from "./.open-next/worker.js";

type Entorno = {
  SUPABASE_SECRET_KEY?: string;
  ASSETS: { fetch(solicitud: Request): Promise<Response> };
  [clave: string]: unknown;
};
type Contexto = { waitUntil(promesa: Promise<unknown>): void; passThroughOnException(): void };

async function llaveCron(secreto: string): Promise<string> {
  const datos = new TextEncoder().encode(`lagafeteria:avisos-semanal:${secreto}`);
  const huella = await crypto.subtle.digest("SHA-256", datos);
  return [...new Uint8Array(huella)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Los archivos estáticos de Cloudflare responden siempre el archivo completo
 * (200) aunque el navegador pida un pedazo con `Range`. Sin la respuesta 206,
 * Safari y Chrome no dejan adelantar ni regresar el video tocando la barra.
 * Por eso /video/* pasa primero por aquí (`run_worker_first` en
 * wrangler.jsonc): se lee el archivo de ASSETS y se entrega solo el pedazo.
 */
async function servirVideo(solicitud: Request, entorno: Entorno): Promise<Response> {
  const original = await entorno.ASSETS.fetch(new Request(solicitud.url, { method: "GET" }));
  if (!original.ok) return original;

  const encabezados = new Headers(original.headers);
  encabezados.set("Accept-Ranges", "bytes");
  encabezados.delete("Content-Range");

  const rango = solicitud.headers.get("Range");
  const siRango = solicitud.headers.get("If-Range");
  const etag = original.headers.get("ETag");
  const usarRango = rango && (!siRango || siRango === etag);
  const soloEncabezados = solicitud.method === "HEAD";

  if (!usarRango) {
    return new Response(soloEncabezados ? null : original.body, { status: 200, headers: encabezados });
  }

  const datos = await original.arrayBuffer();
  const total = datos.byteLength;
  const partes = /^bytes=(\d*)-(\d*)$/.exec(rango.trim());
  let inicio = -1;
  let fin = -1;
  if (partes && (partes[1] || partes[2])) {
    if (partes[1]) {
      inicio = Number(partes[1]);
      fin = partes[2] ? Math.min(Number(partes[2]), total - 1) : total - 1;
    } else {
      inicio = Math.max(total - Number(partes[2]), 0);
      fin = total - 1;
    }
  }
  if (inicio < 0 || inicio >= total || fin < inicio) {
    encabezados.set("Content-Range", `bytes */${total}`);
    encabezados.set("Content-Length", "0");
    return new Response(null, { status: 416, headers: encabezados });
  }

  encabezados.set("Content-Range", `bytes ${inicio}-${fin}/${total}`);
  encabezados.set("Content-Length", String(fin - inicio + 1));
  return new Response(soloEncabezados ? null : datos.slice(inicio, fin + 1), { status: 206, headers: encabezados });
}

const trabajador = {
  async fetch(solicitud: Request, entorno: Entorno, contexto: Contexto): Promise<Response> {
    const ruta = new URL(solicitud.url).pathname;
    if (ruta.startsWith("/video/") && (solicitud.method === "GET" || solicitud.method === "HEAD")) {
      return servirVideo(solicitud, entorno);
    }
    return sitio.fetch(solicitud, entorno, contexto);
  },

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

export default trabajador;

// @ts-expect-error -- igual que arriba.
export * from "./.open-next/worker.js";
