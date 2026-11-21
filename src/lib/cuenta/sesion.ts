import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { crearClienteServidor } from "@/lib/supabase/server";

export const COOKIE_EMPRESA = "lg_empresa";

/** Usuario con sesión iniciada; si no hay, manda a /entrar. */
export const requerirUsuario = cache(async () => {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/entrar");
  return { supabase, usuario: data.user };
});

/** Empresa activa de la persona; si no tiene ninguna, manda a crearla. */
export const requerirEmpresa = cache(async () => {
  const { supabase, usuario } = await requerirUsuario();
  const { data: empresas } = await supabase
    .from("empresas")
    .select("id, nombre, giro")
    .order("creado_en");
  if (!empresas?.length) redirect("/cuenta/empresa/nueva");
  const elegida = (await cookies()).get(COOKIE_EMPRESA)?.value;
  const empresa = empresas.find((e) => e.id === elegida) ?? empresas[0];
  return { supabase, usuario, empresa, empresas };
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
