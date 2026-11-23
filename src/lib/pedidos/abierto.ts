import type { SupabaseClient } from "@supabase/supabase-js";
import { correoActivo, enviarCorreos } from "@/lib/correo";
import { site, urlAbsoluta } from "@/lib/site";
import { escapar } from "@/lib/solicitudes";
import { clienteServicio } from "@/lib/supabase/publico";
import type { Database, Json } from "@/lib/supabase/tipos";
import { type AvisoAbierto, esRazon, leerPredeterminados, type Razon } from "./predeterminados";
import { pedidoMaximoPiezas } from "./reglas";

/**
 * El pedido abierto de una empresa: las reposiciones que fue apartando y, si
 * así lo eligió, las altas nuevas (personas activas que nunca han tenido un
 * gafete impreso). Cuando junta la cantidad que la empresa eligió, se le avisa
 * por correo a quien la administra.
 */

type Cliente = SupabaseClient<Database>;
export type RenglonAbierto = { empleado_id: string; razon: Razon; desde: string | null; apartado: boolean };

export async function pedidoAbiertoDe(supabase: Cliente, empresaId: string, aviso: Pick<AvisoAbierto, "altas">): Promise<RenglonAbierto[]> {
  const [{ data: apartados }, { data: activos }, { data: impresos }] = await Promise.all([
    supabase.from("pedido_abierto").select("empleado_id, razon, creado_en").eq("empresa_id", empresaId).limit(pedidoMaximoPiezas),
    supabase.from("empleados").select("id, creado_en").eq("empresa_id", empresaId).eq("estatus", "activo").limit(pedidoMaximoPiezas),
    aviso.altas
      ? supabase.from("gafetes").select("empleado_id").eq("empresa_id", empresaId).eq("tipo", "impreso").neq("estado", "cancelado").limit(20000)
      : Promise.resolve({ data: [] as { empleado_id: string }[] }),
  ]);
  const activosPorId = new Map((activos ?? []).map((a) => [a.id, a.creado_en]));
  const renglones: RenglonAbierto[] = (apartados ?? [])
    .filter((a) => activosPorId.has(a.empleado_id) && esRazon(a.razon))
    .map((a) => ({ empleado_id: a.empleado_id, razon: a.razon as Razon, desde: a.creado_en, apartado: true }));
  if (aviso.altas) {
    const ya = new Set([...renglones.map((r) => r.empleado_id), ...(impresos ?? []).map((g) => g.empleado_id)]);
    for (const [id, desde] of activosPorId) {
      if (!ya.has(id)) renglones.push({ empleado_id: id, razon: "alta", desde, apartado: false });
    }
  }
  return renglones;
}

/**
 * Revisa si el pedido abierto ya llegó a la cantidad elegida y, si es la
 * primera vez, avisa por correo a quien es dueño o administrador. Cuando el
 * pedido abierto vuelve a bajar (porque ya se pidió), se reinicia el aviso.
 * Nunca detiene lo que se estaba haciendo.
 */
export async function revisarAviso(empresaId: string): Promise<void> {
  try {
    const servicio = clienteServicio();
    if (!servicio) return;
    const { data: empresa } = await servicio.from("empresas").select("id, nombre, predeterminados").eq("id", empresaId).maybeSingle();
    if (!empresa) return;
    const p = leerPredeterminados(empresa.predeterminados);
    if (!p.aviso.cantidad) return;
    const total = (await pedidoAbiertoDe(servicio, empresaId, p.aviso)).length;
    const llego = total >= p.aviso.cantidad;
    if (llego === Boolean(p.aviso.avisado_en)) return;

    const crudo = (empresa.predeterminados && typeof empresa.predeterminados === "object" ? empresa.predeterminados : {}) as Record<string, Json>;
    const aviso = { ...((crudo.aviso as Record<string, Json>) ?? {}), avisado_en: llego ? new Date().toISOString() : null };
    await servicio.from("empresas").update({ predeterminados: { ...crudo, aviso } }).eq("id", empresaId);
    if (llego) await avisarAdministradores(servicio, empresa, total);
  } catch {
    // El aviso es una cortesía: lo que se estaba guardando ya quedó.
  }
}

async function avisarAdministradores(servicio: Cliente, empresa: { id: string; nombre: string }, total: number) {
  if (!correoActivo()) return;
  const { data: miembros } = await servicio
    .from("miembros")
    .select("usuario_id")
    .eq("empresa_id", empresa.id)
    .in("rol", ["propietario", "administrador"]);
  const correos = (
    await Promise.all((miembros ?? []).map((m) => servicio.auth.admin.getUserById(m.usuario_id).then((r) => r.data.user?.email ?? null)))
  ).filter((c): c is string => Boolean(c));
  if (!correos.length) return;
  const liga = urlAbsoluta("/cuenta/pedidos/abierto");
  const lineas = [
    `Tu pedido abierto de ${empresa.nombre} ya juntó ${total.toLocaleString("es-MX")} gafetes y credenciales, la cantidad que elegiste para avisarte.`,
    "Revisa quiénes van, ve tu total con envío e IVA y confírmalo cuando quieras.",
  ];
  await enviarCorreos(
    correos.map((para) => ({
      para,
      asunto: `Tu pedido abierto ya tiene ${total} gafetes`,
      texto: [...lineas, "", liga, "", site.nombre].join("\n"),
      html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1B1F3B;">${lineas
        .map((l) => `<p style="margin:0 0 10px;">${escapar(l)}</p>`)
        .join("")}<p style="margin:16px 0 0;"><a href="${escapar(liga)}">Ver mi pedido abierto</a></p></div>`,
    })),
  );
}
