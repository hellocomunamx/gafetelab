import { NextResponse } from "next/server";
import { recordarEmpresa } from "@/lib/cuenta/sesion";
import { crearClienteServidor } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Último paso de la liga de invitación: con la sesión ya iniciada, acepta la
 * invitación (y las demás que la misma persona le hizo a ese correo) y entra a
 * la cuenta. Si el correo de la sesión no es el invitado, regresa a la
 * pantalla de la invitación, que lo explica.
 */
export async function GET(solicitud: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ir = (ruta: string) => NextResponse.redirect(new URL(ruta, solicitud.url), { status: 303 });
  if (!UUID.test(id)) return ir("/entrar");

  const supabase = await crearClienteServidor();
  const { data: sesion } = await supabase.auth.getUser();
  if (!sesion.user) return ir(`/invitacion/${id}`);

  const { data: invitaciones } = await supabase.rpc("ver_invitacion", { p_invitacion: id });
  if (!invitaciones?.length) return ir("/cuenta/invitaciones");
  // Vencida o para otro correo: la pantalla de la invitación lo explica.
  if (invitaciones[0].vencida || invitaciones[0].correo !== sesion.user.email?.toLowerCase()) {
    return ir(`/invitacion/${id}`);
  }

  let primera: string | null = null;
  for (const i of invitaciones) {
    const { data } = await supabase.rpc("aceptar_invitacion", { p_invitacion: i.id });
    primera ??= data ?? null;
  }
  if (!primera) return ir("/cuenta/invitaciones");
  await recordarEmpresa(primera);
  return ir("/cuenta");
}
