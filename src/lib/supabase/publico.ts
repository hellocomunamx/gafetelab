import { createClient } from "@supabase/supabase-js";
import type { Database } from "./tipos";

const sinSesion = { auth: { persistSession: false, autoRefreshToken: false } };

/**
 * Cliente sin sesión, para páginas públicas que solo llaman funciones abiertas
 * (por ejemplo, la verificación de un gafete). No lee ni escribe cookies.
 */
export function clientePublico() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const llave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && llave ? createClient<Database>(url, llave, sinSesion) : null;
}

/**
 * Cliente con la llave secreta del proyecto: se salta las reglas de acceso, así
 * que solo se usa en el servidor y para cosas muy puntuales. Devuelve null si
 * la llave (SUPABASE_SECRET_KEY) no está configurada.
 */
export function clienteServicio() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const llave = process.env.SUPABASE_SECRET_KEY;
  return url && llave ? createClient<Database>(url, llave, sinSesion) : null;
}
