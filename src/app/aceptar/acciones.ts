"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { usuarioDeSesion } from "@/lib/cuenta/sesion";
import type { Resultado } from "@/lib/cuenta/tipos";
import { legal } from "@/lib/site";

/** Deja constancia de que la persona aceptó los términos y el aviso vigentes. */
export async function aceptarTerminos(_: Resultado, d: FormData): Promise<Resultado> {
  const { supabase } = await usuarioDeSesion();
  if (d.get("acepto") !== "on") {
    return { error: "Marca la casilla para continuar." };
  }
  const { error } = await supabase
    .from("aceptaciones")
    .insert({ terminos_version: legal.terminosVersion, aviso_version: legal.avisoVersion });
  // 23505: ya había aceptado estas mismas versiones (por ejemplo, en otra pestaña).
  if (error && error.code !== "23505") return { error: "No pudimos guardar. Intenta de nuevo." };
  revalidatePath("/cuenta", "layout");
  redirect("/cuenta");
}
