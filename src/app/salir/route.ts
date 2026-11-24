import { NextResponse } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/server";

/**
 * Cierra la sesión de este navegador (no la de otros dispositivos).
 * Solo por POST, para que una liga no pueda cerrarla.
 */
export async function POST(solicitud: Request) {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut({ scope: "local" });
  return NextResponse.redirect(new URL("/", solicitud.url), { status: 303 });
}
