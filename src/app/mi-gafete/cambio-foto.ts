"use server";

import { revalidatePath } from "next/cache";
import { RUTA_CAMBIOS_FOTO } from "@/lib/avisos/tipos";
import { registrarCambioFoto, retirarCambioFoto } from "@/lib/cuenta/cambio-foto-servidor";
import { gafeteDigitalDe } from "@/lib/cuenta/gafete-digital";
import { personaDeLiga } from "@/lib/cuenta/liga-publica";
import { RUTA_LIGA } from "@/lib/cuenta/ligas";
import type { Resultado } from "@/lib/cuenta/tipos";
import { dentroDelLimite, ipActual, MENSAJE_LIMITE } from "@/lib/seguridad/limites";

/**
 * Pide cambiar la foto desde el gafete digital, como una foto de perfil. La
 * foto vigente no cambia hasta que la empresa aprueba. Solo para quien tiene
 * su gafete digital activo; si además tiene impreso, debe aceptar que
 * necesitará una reposición.
 */
export async function solicitarCambioFoto(datos: FormData): Promise<Resultado> {
  if (!(await dentroDelLimite("LIMITE_FORMULARIOS", `cambio-foto:${await ipActual()}`))) return { error: MENSAJE_LIMITE };
  const liga = String(datos.get("liga") ?? "");
  const encontrada = await personaDeLiga(liga);
  if (!encontrada) return { error: "Esta liga ya no está activa. Pide una nueva en tu empresa." };
  const { servicio, persona, empresa } = encontrada;
  if (!(await gafeteDigitalDe(servicio, persona))) {
    return { error: `Tu gafete digital no está activo. Para cambiar tu foto, habla con ${empresa.nombre}.` };
  }
  const resultado = await registrarCambioFoto(servicio, persona, empresa, datos);
  if (resultado.ok) {
    revalidatePath(`${RUTA_LIGA}/${liga}`);
    revalidatePath(RUTA_CAMBIOS_FOTO);
  }
  return resultado;
}

/** La persona se arrepiente: retira su solicitud mientras sigue sin revisarse. */
export async function cancelarCambioFoto(datos: FormData): Promise<Resultado> {
  const liga = String(datos.get("liga") ?? "");
  const encontrada = await personaDeLiga(liga);
  if (!encontrada) return { error: "Esta liga ya no está activa." };
  const resultado = await retirarCambioFoto(encontrada.servicio, encontrada.persona.id);
  revalidatePath(`${RUTA_LIGA}/${liga}`);
  revalidatePath(RUTA_CAMBIOS_FOTO);
  return resultado;
}
