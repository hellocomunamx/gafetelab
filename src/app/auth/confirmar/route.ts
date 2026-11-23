import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { tomarSiguiente } from "@/lib/cuenta/siguiente";
import { crearClienteServidor } from "@/lib/supabase/server";

const TIPOS: EmailOtpType[] = ["email", "magiclink", "signup", "invite", "recovery", "email_change"];

/**
 * Regreso de la liga del correo (token_hash) o de Google o Microsoft (code).
 * Si todo sale bien queda la sesión iniciada y se entra a /cuenta.
 */
export async function GET(solicitud: Request) {
  const url = new URL(solicitud.url);
  const tokenHash = url.searchParams.get("token_hash");
  const tipo = url.searchParams.get("type") as EmailOtpType | null;
  const codigo = url.searchParams.get("code");
  const supabase = await crearClienteServidor();

  let entro = false;
  if (tokenHash && tipo && TIPOS.includes(tipo)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo });
    entro = !error;
  } else if (codigo) {
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    entro = !error;
  }
  // Si venía del carrito, regresa a pagar.
  const siguiente = entro ? await tomarSiguiente() : null;
  return NextResponse.redirect(new URL(entro ? (siguiente ?? "/cuenta") : "/entrar?error=liga", url.origin));
}
