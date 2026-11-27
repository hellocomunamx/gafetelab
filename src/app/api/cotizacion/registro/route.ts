import { FOLIO_VALIDO, cotizacionDe, guardarCotizacion } from "@/lib/cotizaciones";
import { dentroDelLimite, ipDe } from "@/lib/seguridad/limites";
import { leerCuerpo, mismoOrigen } from "@/lib/solicitudes";
import { esPrograma } from "@/lib/visitas";

export const dynamic = "force-dynamic";

const listo = () => new Response(null, { status: 204 });

/**
 * Anota una cotización descargada en PDF. No pide ningún dato de la persona y
 * siempre responde igual, se haya guardado o no.
 */
export async function POST(solicitud: Request) {
  const navegador = solicitud.headers.get("user-agent") ?? "";
  if (!mismoOrigen(solicitud) || esPrograma(navegador)) return listo();
  if (Number(solicitud.headers.get("content-length") ?? 0) > 2000) return listo();
  const cuerpo = await leerCuerpo(solicitud);
  const folio = String(cuerpo?.folio ?? "");
  if (!cuerpo || !FOLIO_VALIDO.test(folio)) return listo();
  if (!(await dentroDelLimite("LIMITE_FORMULARIOS", `cotizacion-pdf:${ipDe(solicitud.headers)}`))) return listo();

  await guardarCotizacion({
    folio,
    canal: "pdf",
    cotizacion: cotizacionDe(cuerpo),
    empresa: String(cuerpo.empresa ?? ""),
    origen: cuerpo.origen,
    navegador,
  });
  return listo();
}
