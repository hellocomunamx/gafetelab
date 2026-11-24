"use server";

import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Cierra la sesión de otra cuenta y regresa a la invitación para entrar con el correo invitado. */
export async function salirYVolver(d: FormData) {
  const id = String(d.get("id") ?? "");
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut({ scope: "local" });
  redirect(UUID.test(id) ? `/invitacion/${id}` : "/entrar");
}
