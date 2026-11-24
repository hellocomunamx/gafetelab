/** Utilidades compartidas por las rutas de API que reciben formularios públicos. */

export const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Escapa texto escrito por una persona antes de meterlo en el HTML de un correo. */
export const escapar = (t: string) => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function error(mensaje: string, estado: number) {
  return Response.json({ ok: false, mensaje }, { status: estado });
}

/** Solo se aceptan envíos hechos desde el propio sitio. */
export function mismoOrigen(solicitud: Request): boolean {
  const origen = solicitud.headers.get("origin");
  if (!origen) return true;
  try {
    return new URL(origen).host === new URL(solicitud.url).host;
  } catch {
    return false;
  }
}

/** Lee el cuerpo JSON de la solicitud; devuelve null si no es un objeto válido. */
export async function leerCuerpo(solicitud: Request): Promise<Record<string, unknown> | null> {
  try {
    const cuerpo: unknown = await solicitud.json();
    return cuerpo && typeof cuerpo === "object" && !Array.isArray(cuerpo)
      ? (cuerpo as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** Campo trampa: las personas no lo ven; los bots lo llenan. */
export const esBot = (cuerpo: Record<string, unknown>) =>
  typeof cuerpo.sitioWeb === "string" && cuerpo.sitioWeb.length > 0;
