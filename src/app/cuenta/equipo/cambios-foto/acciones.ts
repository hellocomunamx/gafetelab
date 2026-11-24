"use server";

import { revalidatePath } from "next/cache";
import { RUTA_CAMBIOS_FOTO } from "@/lib/avisos/tipos";
import { rutaFoto } from "@/lib/cuenta/imagen";
import { esRequisito } from "@/lib/cuenta/reposicion";
import { requerirEmpresa } from "@/lib/cuenta/sesion";
import type { Resultado } from "@/lib/cuenta/tipos";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ERROR_GENERAL = "No pudimos guardar. Intenta de nuevo.";
const refrescar = () => revalidatePath("/cuenta", "layout");

/**
 * Aprueba la foto nueva: guarda una copia de la anterior en el historial,
 * pone la nueva en su ficha (el gafete digital se actualiza solo) y, si se
 * pidió, suma su reposición impresa al pedido abierto.
 */
export async function aprobarCambioFoto(_: Resultado, d: FormData): Promise<Resultado> {
  const id = String(d.get("id") ?? "");
  if (!UUID.test(id)) return { error: ERROR_GENERAL };
  const reponer = d.get("reponer") === "si";
  const { supabase, empresa, usuario } = await requerirEmpresa();
  const { data: solicitud } = await supabase
    .from("solicitudes_foto")
    .select("id, empleado_id, foto_path")
    .eq("id", id)
    .eq("empresa_id", empresa.id)
    .eq("estado", "pendiente")
    .maybeSingle();
  if (!solicitud?.foto_path) return { error: "Esa solicitud ya se resolvió." };
  const { data: persona } = await supabase
    .from("empleados")
    .select("id, foto_path, estatus")
    .eq("id", solicitud.empleado_id)
    .eq("empresa_id", empresa.id)
    .maybeSingle();
  if (!persona) return { error: "Esa persona ya no está en tu equipo." };

  const fotos = supabase.storage.from("fotos");
  const { data: nueva } = await fotos.download(solicitud.foto_path);
  if (!nueva) return { error: "No pudimos leer la foto nueva. Pídele que la mande otra vez." };

  // La anterior se guarda aparte antes de reemplazarla.
  let anterior: string | null = null;
  if (persona.foto_path) {
    const { data: vieja } = await fotos.download(persona.foto_path);
    if (vieja) {
      const ruta = `${empresa.id}/historial/${solicitud.id}.jpg`;
      const { error } = await fotos.upload(ruta, vieja, { contentType: "image/jpeg", upsert: true });
      if (!error) anterior = ruta;
    }
  }
  const destino = rutaFoto(empresa.id, persona.id);
  const { error: errorSubir } = await fotos.upload(destino, nueva, { contentType: "image/jpeg", upsert: true });
  if (errorSubir) return { error: ERROR_GENERAL };
  const { error: errorFicha } = await supabase.from("empleados").update({ foto_path: destino }).eq("id", persona.id).eq("empresa_id", empresa.id);
  if (errorFicha) return { error: ERROR_GENERAL };
  await fotos.remove([solicitud.foto_path]);

  // Reposición del impreso: al pedido abierto, como «cambiaron sus datos».
  let apartada = false;
  if (reponer && persona.estatus === "activo") {
    const { data: ya } = await supabase.from("pedido_abierto").select("empleado_id").eq("empleado_id", persona.id).maybeSingle();
    if (!ya) {
      const { error } = await supabase
        .from("pedido_abierto")
        .insert({ empresa_id: empresa.id, empleado_id: persona.id, razon: "cambio_datos", agregado_por: usuario.id });
      apartada = !error;
    } else apartada = true;
  }

  await supabase
    .from("solicitudes_foto")
    .update({
      estado: "aprobada",
      foto_path: null,
      foto_anterior_path: anterior,
      motivo: null,
      reposicion_apartada: apartada,
      resuelto_en: new Date().toISOString(),
      resuelto_por: usuario.id,
    })
    .eq("id", solicitud.id);
  refrescar();
  return { ok: apartada ? "Aprobada. Su reposición quedó en tu pedido abierto." : "Aprobada. Su gafete digital ya tiene la foto nueva." };
}

/** No se aprueba la foto: se le dice por qué y puede mandar otra desde su gafete. */
export async function rechazarCambioFoto(_: Resultado, d: FormData): Promise<Resultado> {
  const id = String(d.get("id") ?? "");
  if (!UUID.test(id)) return { error: ERROR_GENERAL };
  const motivo = String(d.get("motivo") ?? "").trim().slice(0, 300);
  if (!motivo) return { error: "Escribe por qué, para que mande otra." };
  const { supabase, empresa, usuario } = await requerirEmpresa();
  const { data: solicitud } = await supabase
    .from("solicitudes_foto")
    .select("id, foto_path")
    .eq("id", id)
    .eq("empresa_id", empresa.id)
    .eq("estado", "pendiente")
    .maybeSingle();
  if (!solicitud) return { error: "Esa solicitud ya se resolvió." };
  if (solicitud.foto_path) await supabase.storage.from("fotos").remove([solicitud.foto_path]);
  const { error } = await supabase
    .from("solicitudes_foto")
    .update({ estado: "rechazada", motivo, foto_path: null, resuelto_en: new Date().toISOString(), resuelto_por: usuario.id })
    .eq("id", solicitud.id);
  if (error) return { error: ERROR_GENERAL };
  refrescar();
  return { ok: "Listo. Lo verá en su gafete digital." };
}

/** Lo que la empresa cobra y pide por un gafete impreso nuevo. */
export async function guardarReposicion(_: Resultado, d: FormData): Promise<Resultado> {
  const { supabase, empresa, administra } = await requerirEmpresa();
  if (!administra) return { error: "Solo quien administra la empresa puede cambiar esto." };
  const texto = String(d.get("costo") ?? "").replace(/[$,\s]/g, "");
  const costo = texto ? Number(texto) : 0;
  if (!Number.isFinite(costo) || costo < 0 || costo > 5000) return { error: "Escribe un costo entre $0 y $5,000." };
  const requisitos = d.getAll("requisitos").filter(esRequisito);
  const nota = String(d.get("nota") ?? "").trim().slice(0, 300);
  const { data, error } = await supabase
    .from("empresas")
    .update({ reposicion: { costo: Math.round(costo), requisitos, nota } })
    .eq("id", empresa.id)
    .select("id");
  if (error || !data.length) return { error: ERROR_GENERAL };
  revalidatePath(RUTA_CAMBIOS_FOTO);
  return { ok: "Guardado." };
}
