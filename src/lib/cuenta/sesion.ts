import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { COLUMNAS_QR } from "@/lib/cuenta/qr";
import { crearClienteServidor } from "@/lib/supabase/server";

export const COOKIE_EMPRESA = "lg_empresa";

/** Columnas del proyecto: equipo de trabajo o evento, y los datos del evento. */
export const COLUMNAS_PROYECTO =
  "tipo, padre_id, evento_tipo, evento_inicio, evento_fin, evento_limite, evento_sede, categorias, datos_borrados_en";

/** Usuario con sesión iniciada; si no hay, manda a /entrar. No revisa si aceptó los términos. */
export const usuarioDeSesion = cache(async () => {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/entrar");
  return { supabase, usuario: data.user };
});

/**
 * La aceptación más reciente de los términos y del aviso de privacidad.
 * `pendiente` es true solo cuando sabemos que la persona no ha aceptado: si la
 * consulta falla no se le cierra la puerta a nadie.
 */
export const miAceptacion = cache(async () => {
  const { supabase } = await usuarioDeSesion();
  const { data, error } = await supabase
    .from("aceptaciones")
    .select("terminos_version, aviso_version, aceptado_en")
    .order("aceptado_en", { ascending: false })
    .limit(1);
  return { aceptacion: data?.[0] ?? null, pendiente: !error && !data?.length };
});

/**
 * Usuario con sesión iniciada que ya aceptó los términos y condiciones y el
 * aviso de privacidad. A quien le falta se le manda a /aceptar.
 */
export const requerirUsuario = cache(async () => {
  const sesion = await usuarioDeSesion();
  if ((await miAceptacion()).pendiente) redirect("/aceptar");
  return sesion;
});

export type Rol = "propietario" | "administrador" | "editor";

/** Invitaciones pendientes para el correo de la sesión. */
export const misInvitaciones = cache(async () => {
  const { supabase } = await requerirUsuario();
  const { data } = await supabase.rpc("mis_invitaciones");
  return data ?? [];
});

/**
 * Empresa activa de la persona y su rol en ella. Si no tiene ninguna, la manda
 * a aceptar sus invitaciones o, si no hay, a crear su empresa.
 */
export const requerirEmpresa = cache(async () => {
  const { supabase, usuario } = await requerirUsuario();
  const [{ data: empresas }, { data: membresias }] = await Promise.all([
    supabase.from("empresas").select(`id, nombre, giro, ${COLUMNAS_QR}, ${COLUMNAS_PROYECTO}`).order("creado_en"),
    supabase.from("miembros").select("empresa_id, rol").eq("usuario_id", usuario.id),
  ]);
  if (!empresas?.length) {
    redirect((await misInvitaciones()).length ? "/cuenta/invitaciones" : "/cuenta/empresa/nueva");
  }
  const elegida = (await cookies()).get(COOKIE_EMPRESA)?.value;
  const empresa = empresas.find((e) => e.id === elegida) ?? empresas[0];
  const rol = (membresias?.find((m) => m.empresa_id === empresa.id)?.rol ?? "editor") as Rol;
  return {
    supabase,
    usuario,
    empresa,
    empresas,
    rol,
    /** Dueño o administrador: puede cambiar datos de la empresa, envío y facturación. */
    administra: rol !== "editor",
    /** El proyecto activo es un evento (y no el equipo de trabajo de la organización). */
    esEvento: empresa.tipo === "evento",
  };
});

/** Origen de la solicitud ("https://dominio"), para armar ligas de regreso. */
export async function origenSolicitud(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protocolo = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocolo}://${host}`;
}

/** Proveedores de inicio de sesión con cuenta externa activados por configuración. */
export function proveedoresActivos(): ("google" | "azure")[] {
  return (process.env.NEXT_PUBLIC_AUTH_PROVEEDORES ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter((p): p is "google" | "azure" => p === "google" || p === "azure");
}

/** Deja elegida una empresa para las siguientes visitas. Solo desde acciones del servidor. */
export async function recordarEmpresa(empresaId: string) {
  (await cookies()).set(COOKIE_EMPRESA, empresaId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
}
