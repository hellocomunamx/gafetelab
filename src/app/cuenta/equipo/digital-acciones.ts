"use server";

import { revalidatePath } from "next/cache";
import { requerirEmpresa } from "@/lib/cuenta/sesion";
import { clienteServicio } from "@/lib/supabase/publico";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Desactiva o vuelve a activar el gafete digital de una persona. Desactivado,
 * su liga deja de mostrarlo. Lo hace el servidor con la llave secreta porque
 * las empresas solo leen `gafetes`; antes se comprueba que quien lo pide
 * administra la empresa de esa persona.
 */
async function cambiar(d: FormData, de: "activo" | "desactivado", a: "activo" | "desactivado") {
  const id = String(d.get("id") ?? "");
  if (!UUID.test(id)) return;
  const { empresa, administra } = await requerirEmpresa();
  const servicio = clienteServicio();
  if (!administra || !servicio) return;
  const { data: gafete } = await servicio
    .from("gafetes")
    .select("id, pedido_id")
    .eq("empleado_id", id)
    .eq("empresa_id", empresa.id)
    .eq("tipo", "digital")
    .eq("estado", de)
    .order("emitido_en", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!gafete) return;
  if (a === "activo") {
    // Un gafete cuyo pago se devolvió o se perdió en una disputa no se puede reactivar.
    const { data: pedido } = gafete.pedido_id
      ? await servicio.from("pedidos").select("estado, disputa").eq("id", gafete.pedido_id).maybeSingle()
      : { data: null };
    if (!pedido || ["cancelado", "reembolsado"].includes(pedido.estado) || pedido.disputa === "perdida") return;
  }
  await servicio.from("gafetes").update({ estado: a }).eq("id", gafete.id).eq("estado", de);
  revalidatePath(`/cuenta/equipo/${id}`);
}

export async function desactivarDigital(d: FormData) {
  await cambiar(d, "activo", "desactivado");
}

export async function reactivarDigital(d: FormData) {
  await cambiar(d, "desactivado", "activo");
}

/**
 * Quita el candado (huella, cara o PIN) de la liga de una persona, por ejemplo
 * si cambió de celular. Su liga sigue igual y puede volver a activarlo.
 */
export async function quitarCandado(d: FormData) {
  const id = String(d.get("id") ?? "");
  if (!UUID.test(id)) return;
  const { empresa, administra } = await requerirEmpresa();
  const servicio = clienteServicio();
  if (!administra || !servicio) return;
  await servicio.from("llaves_gafete").delete().eq("empleado_id", id).eq("empresa_id", empresa.id);
  revalidatePath(`/cuenta/equipo/${id}`);
}
