import { cookies } from "next/headers";

/**
 * A dónde regresar después de entrar, aceptar los términos o crear la empresa.
 * Solo se aceptan rutas de esta lista, para que nadie arme una liga que mande a
 * otro sitio.
 */

export const COOKIE_SIGUIENTE = "lg_siguiente";
const PERMITIDOS = ["/carrito", "/cuenta/acceso"];
/** Al terminar de entrar desde una invitación, se acepta y queda unido al equipo. */
const ACEPTAR_INVITACION = /^\/invitacion\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/aceptar$/;

export const destinoSeguro = (v: unknown): string | null =>
  typeof v === "string" && (PERMITIDOS.includes(v) || ACEPTAR_INVITACION.test(v)) ? v : null;

/** Lo recuerda en una cookie, para el regreso desde la liga del correo o desde Google y Microsoft. */
export async function recordarSiguiente(destino: string | null) {
  if (!destino) return;
  (await cookies()).set(COOKIE_SIGUIENTE, destino, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 });
}

/** Lee y borra el destino guardado. Solo desde acciones del servidor o rutas. */
export async function tomarSiguiente(): Promise<string | null> {
  const almacen = await cookies();
  const destino = destinoSeguro(almacen.get(COOKIE_SIGUIENTE)?.value);
  if (almacen.has(COOKIE_SIGUIENTE)) almacen.delete(COOKIE_SIGUIENTE);
  return destino;
}
