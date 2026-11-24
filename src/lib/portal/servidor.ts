import type { SupabaseClient } from "@supabase/supabase-js";
import { correoActivo, enviarCorreo } from "@/lib/correo";
import type { Database } from "@/lib/supabase/tipos";
import { correoEstadoSolicitud } from "./correos";
import { urlAbsoluta } from "@/lib/site";
import { RUTA_PORTAL, urlPortal } from "./reglas";
import {
  CAUSAS_REPOSICION,
  esCausa,
  estadoVisible,
  type EstadoVisible,
  fraseDeEstado,
  type Impresion,
  type SolicitudPortal,
  TIPOS_SOLICITUD,
} from "./solicitudes";

type Servicio = SupabaseClient<Database>;
type Tabla = "solicitudes_foto" | "solicitudes_empleado";

const ETIQUETAS_SISTEMA: Record<string, string> = {
  nombre: "Nombre",
  puesto: "Puesto",
  numero_empleado: "Número de empleado",
  departamento: "Departamento",
  tipo_contrato: "Tipo de contrato",
};

/** Etiquetas de los datos de una empresa, para decir «Nombre, Puesto» y no claves. */
export async function etiquetasDe(servicio: Servicio, empresaId: string): Promise<Record<string, string>> {
  const { data } = await servicio.from("campos").select("clave, etiqueta").eq("empresa_id", empresaId);
  return { ...ETIQUETAS_SISTEMA, ...Object.fromEntries((data ?? []).map((c) => [c.clave, c.etiqueta])) };
}

/** Las solicitudes de una persona, la más reciente primero. */
export async function solicitudesDePersona(servicio: Servicio, empleadoId: string, empresaId: string): Promise<SolicitudPortal[]> {
  const [{ data: fotos }, { data: otras }, etiquetas] = await Promise.all([
    servicio
      .from("solicitudes_foto")
      .select("id, estado, impresion, con_impreso, reposicion_apartada, motivo, creado_en, resuelto_en")
      .eq("empleado_id", empleadoId)
      .order("creado_en", { ascending: false })
      .limit(15),
    servicio
      .from("solicitudes_empleado")
      .select("id, tipo, estado, impresion, datos, causa, reposicion_apartada, motivo, creado_en, resuelto_en")
      .eq("empleado_id", empleadoId)
      .order("creado_en", { ascending: false })
      .limit(15),
    etiquetasDe(servicio, empresaId),
  ]);
  const lista: SolicitudPortal[] = [
    ...(fotos ?? []).map((f) => ({
      id: f.id,
      tipo: "foto" as const,
      estado: estadoVisible(f),
      conImpresion: f.estado === "aprobada" ? f.reposicion_apartada : f.con_impreso,
      creada: f.creado_en,
      resuelta: f.resuelto_en,
      motivo: f.motivo,
      detalle: f.con_impreso ? "Foto nueva para tu gafete digital e impreso" : "Foto nueva para tu gafete digital",
    })),
    ...(otras ?? []).map((s) => {
      const tipo = s.tipo === "reposicion" ? ("reposicion" as const) : ("datos" as const);
      const claves = s.datos && typeof s.datos === "object" && !Array.isArray(s.datos) ? Object.keys(s.datos) : [];
      return {
        id: s.id,
        tipo,
        estado: estadoVisible(s),
        conImpresion: tipo === "reposicion" ? s.estado !== "aprobada" || s.reposicion_apartada : s.reposicion_apartada,
        creada: s.creado_en,
        resuelta: s.resuelto_en,
        motivo: s.motivo,
        detalle:
          tipo === "reposicion"
            ? esCausa(s.causa)
              ? CAUSAS_REPOSICION[s.causa]
              : "Gafete nuevo"
            : claves.map((c) => etiquetas[c] ?? c).join(", ") || "Datos",
      };
    }),
  ];
  return lista.sort((a, b) => b.creada.localeCompare(a.creada)).slice(0, 20);
}

/**
 * Avisa por correo a la persona que su solicitud cambió de estado, si tiene
 * correo registrado. Nunca detiene lo que se estaba haciendo.
 */
export async function avisarEstado(servicio: Servicio, opts: { tabla: Tabla; id: string }): Promise<void> {
  if (!correoActivo()) return;
  try {
    const { data: s } =
      opts.tabla === "solicitudes_foto"
        ? await servicio.from("solicitudes_foto").select("empleado_id, empresa_id, estado, impresion, motivo, reposicion_apartada").eq("id", opts.id).maybeSingle()
        : await servicio
            .from("solicitudes_empleado")
            .select("empleado_id, empresa_id, estado, impresion, motivo, reposicion_apartada, tipo")
            .eq("id", opts.id)
            .maybeSingle();
    if (!s) return;
    const [{ data: persona }, { data: empresa }] = await Promise.all([
      servicio.from("empleados").select("nombre, correo, estatus").eq("id", s.empleado_id).maybeSingle(),
      servicio.from("empresas").select("nombre, handle, portal_activo").eq("id", s.empresa_id).maybeSingle(),
    ]);
    if (!persona?.correo || persona.estatus === "baja" || !empresa) return;
    const estado: EstadoVisible = estadoVisible(s);
    const tipo = "tipo" in s && s.tipo === "reposicion" ? "reposicion" : "tipo" in s ? "datos" : "foto";
    const frase = fraseDeEstado(estado, empresa.nombre, s.reposicion_apartada);
    // Con el portal apagado, el botón lleva a la entrada general del portal.
    const url = empresa.portal_activo && empresa.handle ? urlPortal(empresa.handle) : urlAbsoluta(RUTA_PORTAL);
    const correo = correoEstadoSolicitud({
      empresa: empresa.nombre,
      nombre: persona.nombre,
      solicitud: TIPOS_SOLICITUD[tipo].nombre,
      titulo: frase.titulo,
      detalle: frase.detalle,
      motivo: estado === "rechazada" ? s.motivo : null,
      url,
    });
    await enviarCorreo({ para: persona.correo, ...correo });
  } catch (falla) {
    console.error("Aviso de solicitud:", falla);
  }
}

/** Estado de un gafete impreso → seguimiento de la solicitud que lo originó. */
const SEGUIMIENTO: Record<string, Impresion> = { en_produccion: "en_impresion", enviado: "en_camino", activo: "entregada" };
const ANTES: Record<Impresion, (Impresion | null)[]> = {
  en_impresion: [null],
  en_camino: [null, "en_impresion"],
  entregada: [null, "en_impresion", "en_camino"],
};

/**
 * Cuando un pedido pasa a producción, se envía o se entrega, las solicitudes
 * aprobadas con reposición de las personas de ese pedido avanzan con él, y a
 * cada persona le llega su aviso.
 */
export async function avanzarSolicitudesDelPedido(servicio: Servicio, pedidoId: string, estadoGafetes: string): Promise<void> {
  const impresion = SEGUIMIENTO[estadoGafetes];
  if (!impresion) return;
  try {
    const { data: pedido } = await servicio.from("pedidos").select("creado_en").eq("id", pedidoId).maybeSingle();
    const { data: gafetes } = await servicio.from("gafetes").select("empleado_id").eq("pedido_id", pedidoId).eq("tipo", "impreso");
    const personas = [...new Set((gafetes ?? []).map((g) => g.empleado_id))];
    if (!pedido || !personas.length) return;
    for (const tabla of ["solicitudes_foto", "solicitudes_empleado"] as const) {
      for (let i = 0; i < personas.length; i += 200) {
        const { data: filas } = await servicio
          .from(tabla)
          .select("id, impresion, pedido_id, resuelto_en")
          .in("empleado_id", personas.slice(i, i + 200))
          .eq("estado", "aprobada")
          .eq("reposicion_apartada", true)
          // Solo lo aprobado antes de hacerse el pedido: ahí entró su gafete.
          .lte("resuelto_en", pedido.creado_en);
        const toca = (filas ?? []).filter(
          (f) => (f.pedido_id === null || f.pedido_id === pedidoId) && ANTES[impresion].includes((f.impresion ?? null) as Impresion | null),
        );
        for (const f of toca) {
          const { data: movida } = await servicio
            .from(tabla)
            .update({ impresion, pedido_id: pedidoId })
            .eq("id", f.id)
            .eq("estado", "aprobada")
            .select("id");
          if (movida?.length) await avisarEstado(servicio, { tabla, id: f.id });
        }
      }
    }
  } catch (falla) {
    console.error("Seguimiento de solicitudes:", falla);
  }
}
