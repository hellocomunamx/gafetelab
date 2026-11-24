"use server";

import { revalidatePath } from "next/cache";
import { RUTA_ADMIN } from "@/lib/admin/ruta";
import { requerirAdmin } from "@/lib/admin/sesion";
import { correoActivo, enviarCorreo } from "@/lib/correo";
import { site, urlAbsoluta } from "@/lib/site";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Aprueba o rechaza la constancia de una empresa. Solo desde el panel de administración. */
export async function revisarConstancia(d: FormData) {
  const { servicio } = await requerirAdmin();
  const id = String(d.get("id") ?? "");
  const aprobar = d.get("decision") === "aprobar";
  const motivo = String(d.get("motivo") ?? "").trim().slice(0, 300);
  // Un rechazo sin motivo no le sirve a la empresa: no se guarda.
  if (!servicio || !UUID.test(id) || (!aprobar && !motivo)) return;
  await servicio
    .from("constancias")
    .update({
      estado: aprobar ? "aprobada" : "rechazada",
      motivo: aprobar ? null : motivo,
      revisada_en: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("estado", "pendiente");
  revalidatePath(RUTA_ADMIN);
  revalidatePath("/cuenta", "layout");
}

const escaparHtml = (t: string) => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * Quita la verificación a una empresa ya verificada: pasa a «retirada» con el
 * motivo, quién y cuándo. La empresa ya no puede hacer pedidos hasta
 * verificarse de nuevo, y a sus dueños y administradores les llega un correo.
 * Los pedidos ya pagados no se tocan: el panel los marca para revisarlos.
 */
export async function quitarVerificacion(d: FormData) {
  const { servicio, usuario } = await requerirAdmin();
  const empresaId = String(d.get("empresa") ?? "");
  const motivo = String(d.get("motivo") ?? "").trim().slice(0, 300);
  if (!servicio || !UUID.test(empresaId) || !motivo || d.get("seguro") !== "si") return;
  const { data: actual } = await servicio
    .from("constancias")
    .select("id, estado")
    .eq("empresa_id", empresaId)
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (actual?.estado !== "aprobada") return;
  const { error } = await servicio
    .from("constancias")
    .update({ estado: "retirada", motivo, retirada_en: new Date().toISOString(), retirada_por: usuario.id })
    .eq("id", actual.id)
    .eq("estado", "aprobada");
  if (error) return;

  // Aviso a quienes administran la empresa. Si el correo falla, la verificación ya se quitó.
  if (correoActivo()) {
    const [{ data: empresa }, { data: miembros }] = await Promise.all([
      servicio.from("empresas").select("nombre").eq("id", empresaId).maybeSingle(),
      servicio.from("miembros").select("usuario_id").eq("empresa_id", empresaId).in("rol", ["propietario", "administrador"]),
    ]);
    const correos = await Promise.all(
      (miembros ?? []).map((m) => servicio.auth.admin.getUserById(m.usuario_id).then((r) => r.data.user?.email ?? null).catch(() => null)),
    );
    const nombre = empresa?.nombre ?? "tu empresa";
    const liga = urlAbsoluta("/cuenta/verificacion");
    const texto = `Quitamos la verificación de ${nombre} en ${site.nombre}.\n\nMotivo: ${motivo}\n\nMientras no la verifiques de nuevo no puedes hacer pedidos nuevos. Tu equipo, tus diseños y tus datos siguen en tu cuenta. Si ya tenías un pedido pagado, lo revisamos y te escribimos.\n\nPara verificarla otra vez: ${liga}`;
    const html = `<p>Quitamos la verificación de <strong>${escaparHtml(nombre)}</strong> en ${site.nombre}.</p><p><strong>Motivo:</strong> ${escaparHtml(motivo)}</p><p>Mientras no la verifiques de nuevo no puedes hacer pedidos nuevos. Tu equipo, tus diseños y tus datos siguen en tu cuenta. Si ya tenías un pedido pagado, lo revisamos y te escribimos.</p><p><a href="${liga}">Verificar mi empresa otra vez</a></p>`;
    await Promise.all(
      [...new Set(correos.filter((c): c is string => Boolean(c)))].map((para) =>
        enviarCorreo({ para, asunto: `Quitamos la verificación de ${nombre}`, texto, html }).catch(() => null),
      ),
    );
  }
  revalidatePath(RUTA_ADMIN, "layout");
  revalidatePath("/cuenta", "layout");
}
