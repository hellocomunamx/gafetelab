import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/tipos";
import { IMPRESO_VIGENTE, type Reposicion, reposicionDe } from "./reposicion";

type Servicio = SupabaseClient<Database>;

/** Foto nueva que pidió una persona desde su gafete digital, en espera de aprobación. */
export const rutaCambioFoto = (empresaId: string, empleadoId: string) => `${empresaId}/cambios/${empleadoId}.jpg`;

/** ¿La persona tiene un gafete impreso vigente (en pedido, en producción, enviado o activo)? */
export async function tieneImpreso(servicio: Servicio, empleadoId: string): Promise<boolean> {
  const { data } = await servicio
    .from("gafetes")
    .select("id")
    .eq("empleado_id", empleadoId)
    .eq("tipo", "impreso")
    .in("estado", IMPRESO_VIGENTE)
    .limit(1);
  return Boolean(data?.length);
}

export type CambioFotoPersona = {
  conImpreso: boolean;
  reposicion: Reposicion;
  /** Su última solicitud, si sigue pendiente o la rechazaron. */
  solicitud: { estado: "pendiente" | "rechazada" | "aprobada"; motivo: string | null; foto: string | null; fecha: string } | null;
};

/** Lo que el gafete digital necesita para ofrecer «Cambiar mi foto». */
export async function cambioFotoDe(servicio: Servicio, empleadoId: string, empresaId: string): Promise<CambioFotoPersona> {
  const [conImpreso, { data: empresa }, { data: ultima }] = await Promise.all([
    tieneImpreso(servicio, empleadoId),
    servicio.from("empresas").select("reposicion").eq("id", empresaId).maybeSingle(),
    servicio
      .from("solicitudes_foto")
      .select("estado, motivo, foto_path, creado_en, resuelto_en")
      .eq("empleado_id", empleadoId)
      .neq("estado", "cancelada")
      .order("creado_en", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  let solicitud: CambioFotoPersona["solicitud"] = null;
  if (ultima && (ultima.estado === "pendiente" || ultima.estado === "rechazada" || ultima.estado === "aprobada")) {
    const foto = ultima.foto_path
      ? ((await servicio.storage.from("fotos").createSignedUrl(ultima.foto_path, 3600)).data?.signedUrl ?? null)
      : null;
    // Una aprobada solo se menciona unos días, para confirmar que ya quedó.
    const reciente = ultima.estado !== "aprobada" || Date.now() - new Date(ultima.resuelto_en ?? 0).getTime() < 7 * 86_400_000;
    if (reciente) solicitud = { estado: ultima.estado, motivo: ultima.motivo, foto, fecha: ultima.resuelto_en ?? ultima.creado_en };
  }
  return { conImpreso, reposicion: reposicionDe(empresa?.reposicion), solicitud };
}
