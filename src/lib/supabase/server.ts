import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./tipos";

/**
 * Cliente de Supabase para Server Components, Server Actions y Route Handlers.
 * Lee cookies, así que la ruta que lo use se renderiza por solicitud: úsalo
 * solo en la app (cuenta, pedidos), no en las páginas públicas de contenido.
 */
export async function crearClienteServidor() {
  const almacen = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => almacen.getAll(),
        setAll: (lista) => {
          try {
            lista.forEach(({ name, value, options }) => almacen.set(name, value, options));
          } catch {
            // Llamado desde un Server Component: las cookies no se pueden escribir ahí.
          }
        },
      },
    },
  );
}
