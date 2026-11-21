"use server";

import { redirect } from "next/navigation";
import { origenSolicitud, proveedoresActivos } from "@/lib/cuenta/sesion";
import { crearClienteServidor } from "@/lib/supabase/server";

export type EstadoAcceso = { paso: "correo" | "codigo"; correo?: string; error?: string };

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Envía al correo una liga y un código de un solo uso. Crea la cuenta si no existe. */
export async function pedirAcceso(_: EstadoAcceso, datos: FormData): Promise<EstadoAcceso> {
  const correo = String(datos.get("correo") ?? "").trim().toLowerCase();
  if (correo.length > 254 || !CORREO_VALIDO.test(correo)) {
    return { paso: "correo", error: "Escribe un correo válido." };
  }
  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.signInWithOtp({
    email: correo,
    options: { shouldCreateUser: true, emailRedirectTo: `${await origenSolicitud()}/auth/confirmar` },
  });
  if (error) {
    const espera = error.status === 429 || error.code === "over_email_send_rate_limit";
    return {
      paso: "correo",
      correo,
      error: espera
        ? "Ya te enviamos un correo hace un momento. Espera un minuto y vuelve a intentar."
        : "No pudimos enviar el correo. Intenta de nuevo.",
    };
  }
  return { paso: "codigo", correo };
}

/** Entra con el código de 6 dígitos que llegó por correo. */
export async function verificarCodigo(_: EstadoAcceso, datos: FormData): Promise<EstadoAcceso> {
  const correo = String(datos.get("correo") ?? "").trim().toLowerCase();
  const codigo = String(datos.get("codigo") ?? "").replace(/\D/g, "");
  if (codigo.length < 6) return { paso: "codigo", correo, error: "Escribe el código de 6 dígitos." };
  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.verifyOtp({ email: correo, token: codigo, type: "email" });
  if (error) {
    return { paso: "codigo", correo, error: "El código no es correcto o ya venció. Pide uno nuevo." };
  }
  redirect("/cuenta");
}

/** Entra con una cuenta de Google o Microsoft, si están activadas. */
export async function entrarConProveedor(datos: FormData) {
  const proveedor = proveedoresActivos().find((p) => p === datos.get("proveedor"));
  if (!proveedor) redirect("/entrar");
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: proveedor,
    options: {
      redirectTo: `${await origenSolicitud()}/auth/confirmar`,
      ...(proveedor === "azure" ? { scopes: "email" } : {}),
    },
  });
  if (error || !data.url) redirect("/entrar?error=proveedor");
  redirect(data.url);
}
