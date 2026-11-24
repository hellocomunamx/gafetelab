import { getCloudflareContext } from "@opennextjs/cloudflare";
import { leerCuerpo, mismoOrigen } from "@/lib/solicitudes";
import { clienteServicio } from "@/lib/supabase/publico";
import { dispositivoDe, esPrograma, origenDe, rutaContable } from "@/lib/visitas";

export const dynamic = "force-dynamic";

const listo = () => new Response(null, { status: 204 });

/** País y estado que informa Cloudflare. Fuera de Cloudflare (pruebas locales) no hay. */
function lugar(solicitud: Request): { pais: string | null; region: string | null } {
  let pais = solicitud.headers.get("cf-ipcountry");
  let region: string | null = null;
  try {
    const cf = getCloudflareContext().cf;
    if (typeof cf?.country === "string") pais = cf.country;
    if (typeof cf?.region === "string") region = cf.region;
  } catch {
    // Sin contexto de Cloudflare: se queda con el encabezado, si viene.
  }
  return {
    pais: pais && /^[A-Za-z]{2}$/.test(pais) ? pais.toUpperCase() : null,
    region: region ? region.slice(0, 60) : null,
  };
}

/**
 * Anota una página vista. No guarda la dirección IP ni el navegador, y no usa
 * cookies. Siempre responde igual, se haya contado o no.
 */
export async function POST(solicitud: Request) {
  const servicio = clienteServicio();
  const navegador = solicitud.headers.get("user-agent") ?? "";
  if (!servicio || !mismoOrigen(solicitud) || esPrograma(navegador)) return listo();
  if (Number(solicitud.headers.get("content-length") ?? 0) > 2000) return listo();

  const cuerpo = await leerCuerpo(solicitud);
  const ruta = rutaContable(cuerpo?.ruta);
  if (!cuerpo || !ruta) return listo();

  const entrada = cuerpo.entrada === true;
  await servicio.from("visitas").insert({
    ruta,
    entrada,
    origen: entrada ? origenDe(cuerpo.ref, cuerpo.utm, new URL(solicitud.url).hostname) : null,
    dispositivo: dispositivoDe(navegador),
    ...lugar(solicitud),
  });
  return listo();
}
