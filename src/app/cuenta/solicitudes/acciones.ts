"use server";

import { revalidatePath } from "next/cache";
import { requerirEmpresa } from "@/lib/cuenta/sesion";
import { esColumnaSistema, type Resultado } from "@/lib/cuenta/tipos";
import { avisarEstado } from "@/lib/portal/servidor";
import { esCausa, razonDeCausa } from "@/lib/portal/solicitudes";
import { clienteServicio } from "@/lib/supabase/publico";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ERROR_GENERAL = "No pudimos guardar. Intenta de nuevo.";
const refrescar = () => revalidatePath("/cuenta", "layout");

function avisar(id: string) {
  const servicio = clienteServicio();
  return servicio ? avisarEstado(servicio, { tabla: "solicitudes_empleado", id }) : Promise.resolve();
}

/**
 * Aprueba una corrección de datos (los aplica a su ficha) o una reposición. Si
 * se pide, suma su gafete impreso al pedido abierto; de ahí en adelante la
 * persona ve «en impresión», «en camino» y «entregada» conforme avanza el pedido.
 */
export async function aprobarSolicitud(_: Resultado, d: FormData): Promise<Resultado> {
  const id = String(d.get("id") ?? "");
  if (!UUID.test(id)) return { error: ERROR_GENERAL };
  const reponer = d.get("reponer") !== "no";
  const { supabase, empresa, usuario } = await requerirEmpresa();
  const { data: s } = await supabase
    .from("solicitudes_empleado")
    .select("id, empleado_id, tipo, datos, causa")
    .eq("id", id)
    .eq("empresa_id", empresa.id)
    .eq("estado", "pendiente")
    .maybeSingle();
  if (!s) return { error: "Esa solicitud ya se resolvió." };
  const { data: persona } = await supabase
    .from("empleados")
    .select("id, datos, estatus")
    .eq("id", s.empleado_id)
    .eq("empresa_id", empresa.id)
    .maybeSingle();
  if (!persona || persona.estatus === "baja") return { error: "Esa persona ya no está activa en tu equipo." };

  if (s.tipo === "datos") {
    const cambios = s.datos && typeof s.datos === "object" && !Array.isArray(s.datos) ? (s.datos as Record<string, unknown>) : {};
    const sistema: Record<string, string | null> = {};
    const propios: Record<string, unknown> = { ...(persona.datos && typeof persona.datos === "object" && !Array.isArray(persona.datos) ? (persona.datos as Record<string, unknown>) : {}) };
    for (const [clave, valor] of Object.entries(cambios)) {
      if (typeof valor !== "string") continue;
      if (esColumnaSistema(clave)) sistema[clave] = valor || null;
      else if (valor) propios[clave] = valor;
      else delete propios[clave];
    }
    if ("nombre" in sistema && !sistema.nombre) delete sistema.nombre;
    const { error } = await supabase
      .from("empleados")
      .update({ ...sistema, datos: propios as never })
      .eq("id", persona.id)
      .eq("empresa_id", empresa.id);
    if (error) return { error: ERROR_GENERAL };
  }

  // Gafete impreso nuevo: al pedido abierto (si ya estaba ahí, se queda).
  let apartada = false;
  const quiereImpreso = s.tipo === "reposicion" ? reponer : d.get("reponer") === "si";
  if (quiereImpreso && persona.estatus === "activo") {
    const razon = s.tipo === "reposicion" && esCausa(s.causa) ? razonDeCausa(s.causa) : "cambio_datos";
    const { data: ya } = await supabase.from("pedido_abierto").select("empleado_id").eq("empleado_id", persona.id).maybeSingle();
    if (!ya) {
      const { error } = await supabase.from("pedido_abierto").insert({ empresa_id: empresa.id, empleado_id: persona.id, razon, agregado_por: usuario.id });
      apartada = !error;
    } else apartada = true;
  }

  const { data: resuelta } = await supabase
    .from("solicitudes_empleado")
    .update({ estado: "aprobada", motivo: null, reposicion_apartada: apartada, resuelto_en: new Date().toISOString(), resuelto_por: usuario.id })
    .eq("id", s.id)
    .eq("estado", "pendiente")
    .select("id");
  if (!resuelta?.length) return { error: "Esa solicitud ya se resolvió." };
  await avisar(s.id);
  refrescar();
  return {
    ok: apartada
      ? "Aprobada. Su gafete quedó en tu pedido abierto; le avisamos conforme avance."
      : s.tipo === "datos"
        ? "Aprobada. Sus datos ya están en su ficha."
        : "Aprobada.",
  };
}

/** No se aprueba: la persona ve el motivo en su portal y le llega por correo. */
export async function rechazarSolicitud(_: Resultado, d: FormData): Promise<Resultado> {
  const id = String(d.get("id") ?? "");
  if (!UUID.test(id)) return { error: ERROR_GENERAL };
  const motivo = String(d.get("motivo") ?? "").trim().slice(0, 300);
  if (!motivo) return { error: "Escribe por qué, para que sepa qué hacer." };
  const { supabase, empresa, usuario } = await requerirEmpresa();
  const { data } = await supabase
    .from("solicitudes_empleado")
    .update({ estado: "rechazada", motivo, resuelto_en: new Date().toISOString(), resuelto_por: usuario.id })
    .eq("id", id)
    .eq("empresa_id", empresa.id)
    .eq("estado", "pendiente")
    .select("id");
  if (!data?.length) return { error: "Esa solicitud ya se resolvió." };
  await avisar(id);
  refrescar();
  return { ok: "Listo. Lo verá en su portal y le llega por correo si lo tienes registrado." };
}
