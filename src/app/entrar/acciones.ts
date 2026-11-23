"use server";

import { redirect } from "next/navigation";
import { origenSolicitud, proveedoresActivos } from "@/lib/cuenta/sesion";
import { LARGO_MINIMO_CONTRASENA } from "@/lib/cuenta/roles";
import { destinoSeguro, recordarSiguiente, tomarSiguiente } from "@/lib/cuenta/siguiente";
import { crearClienteServidor } from "@/lib/supabase/server";

export type EstadoAcceso = {
  paso: "correo" | "codigo";
  correo?: string;
  error?: string;
  /** Por qué se envió el correo: para entrar con liga, para confirmar una cuenta nueva o por olvido. */
  motivo?: "liga" | "crear" | "olvido";
};

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Envía al correo una liga y un código de un solo uso. Crea la cuenta si no existe. */
export async function pedirAcceso(_: EstadoAcceso, datos: FormData): Promise<EstadoAcceso> {
  const correo = String(datos.get("correo") ?? "").trim().toLowerCase();
  if (correo.length > 254 || !CORREO_VALIDO.test(correo)) {
    return { paso: "correo", error: "Escribe un correo válido." };
  }
  const olvido = datos.get("motivo") === "olvido";
  // Quien olvidó su contraseña regresa a "Mi acceso" para crear otra, salvo que venga del carrito.
  await recordarSiguiente(destinoSeguro(datos.get("siguiente")) ?? (olvido ? "/cuenta/acceso" : null));
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
  return { paso: "codigo", correo, motivo: olvido ? "olvido" : "liga" };
}

/** Crea una cuenta con correo y contraseña. Llega un correo con liga y código para confirmarla. */
export async function crearCuenta(_: EstadoAcceso, datos: FormData): Promise<EstadoAcceso> {
  const correo = String(datos.get("correo") ?? "").trim().toLowerCase();
  const contrasena = String(datos.get("contrasena") ?? "");
  if (correo.length > 254 || !CORREO_VALIDO.test(correo)) {
    return { paso: "correo", error: "Escribe un correo válido." };
  }
  if (contrasena.length < LARGO_MINIMO_CONTRASENA || contrasena.length > 72) {
    return { paso: "correo", correo, error: `Tu contraseña debe tener entre ${LARGO_MINIMO_CONTRASENA} y 72 caracteres.` };
  }
  await recordarSiguiente(destinoSeguro(datos.get("siguiente")));
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.auth.signUp({
    email: correo,
    password: contrasena,
    options: { emailRedirectTo: `${await origenSolicitud()}/auth/confirmar` },
  });
  if (error) {
    const espera = error.status === 429 || error.code === "over_email_send_rate_limit";
    return {
      paso: "correo",
      correo,
      error: espera
        ? "Ya te enviamos un correo hace un momento. Espera un minuto y vuelve a intentar."
        : error.code === "weak_password"
          ? "Esa contraseña es muy fácil de adivinar. Prueba con una más larga o con números y símbolos."
          : "No pudimos crear tu cuenta. Intenta de nuevo.",
    };
  }
  // Supabase no dice si el correo ya existe: lo deja ver con una cuenta sin identidades.
  if (data.user && data.user.identities?.length === 0) {
    return {
      paso: "correo",
      correo,
      error: "Ya hay una cuenta con ese correo. Inicia sesión; si no tienes contraseña, usa «¿Olvidaste tu contraseña?».",
    };
  }
  // Si la confirmación por correo estuviera apagada, la sesión ya quedó iniciada.
  if (data.session) redirect(destinoSeguro(datos.get("siguiente")) ?? (await tomarSiguiente()) ?? "/cuenta");
  return { paso: "codigo", correo, motivo: "crear" };
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
  redirect(destinoSeguro(datos.get("siguiente")) ?? (await tomarSiguiente()) ?? "/cuenta");
}

/** Entra con correo y contraseña, para quien ya creó una en "Mi acceso". */
export async function entrarConContrasena(_: EstadoAcceso, datos: FormData): Promise<EstadoAcceso> {
  const correo = String(datos.get("correo") ?? "").trim().toLowerCase();
  const contrasena = String(datos.get("contrasena") ?? "");
  if (correo.length > 254 || !CORREO_VALIDO.test(correo)) {
    return { paso: "correo", error: "Escribe un correo válido." };
  }
  if (!contrasena) return { paso: "correo", correo, error: "Escribe tu contraseña." };
  const supabase = await crearClienteServidor();
  const { error } = await supabase.auth.signInWithPassword({ email: correo, password: contrasena });
  if (error) {
    return {
      paso: "correo",
      correo,
      error:
        error.status === 429
          ? "Demasiados intentos. Espera un minuto y vuelve a intentar."
          : error.code === "email_not_confirmed"
            ? "Falta confirmar tu correo. Usa «¿Olvidaste tu contraseña?» y te enviamos una liga para entrar."
            : "El correo o la contraseña no son correctos.",
    };
  }
  redirect(destinoSeguro(datos.get("siguiente")) ?? (await tomarSiguiente()) ?? "/cuenta");
}

/** Entra con una cuenta de Google o Microsoft, si están activadas. */
export async function entrarConProveedor(datos: FormData) {
  const proveedor = proveedoresActivos().find((p) => p === datos.get("proveedor"));
  if (!proveedor) redirect("/entrar");
  await recordarSiguiente(destinoSeguro(datos.get("siguiente")));
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
