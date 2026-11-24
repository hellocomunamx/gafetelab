import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Mantiene viva la sesión de Supabase en las rutas de la cuenta: renueva el
 * token cuando vence y manda a /entrar a quien no ha iniciado sesión.
 * Las páginas públicas no pasan por aquí.
 *
 * Se queda como `middleware.ts` (runtime edge) y no como `proxy.ts`: OpenNext en
 * Cloudflare todavía no soporta bien el proxy de Node (falla con cualquier cookie).
 */
export async function middleware(solicitud: NextRequest) {
  let respuesta = NextResponse.next({ request: solicitud });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const llave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !llave) return respuesta;

  const supabase = createServerClient(url, llave, {
    cookies: {
      getAll: () => solicitud.cookies.getAll(),
      setAll: (lista) => {
        lista.forEach(({ name, value }) => solicitud.cookies.set(name, value));
        respuesta = NextResponse.next({ request: solicitud });
        lista.forEach(({ name, value, options }) => respuesta.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  if (!data.user && (/^\/cuenta(\/|$)/.test(solicitud.nextUrl.pathname) || solicitud.nextUrl.pathname === "/aceptar")) {
    const destino = solicitud.nextUrl.clone();
    destino.pathname = "/entrar";
    destino.search = "";
    return NextResponse.redirect(destino);
  }
  return respuesta;
}

export const config = { matcher: ["/cuenta/:path*", "/8admins/:path*", "/entrar", "/aceptar"] };
