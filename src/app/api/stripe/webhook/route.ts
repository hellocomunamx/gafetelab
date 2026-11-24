import { type AvisoStripe, procesarAviso } from "@/lib/pedidos/avisos";
import { cobrarAutorizados } from "@/lib/pedidos/servidor";
import { firmaValida } from "@/lib/stripe";
import { clienteServicio } from "@/lib/supabase/publico";

export const dynamic = "force-dynamic";

const responder = (estado: number, cuerpo: Record<string, unknown>) => Response.json(cuerpo, { status: estado });

/**
 * Avisos de Stripe: aquí se confirma que un pedido se pagó. Solo se atienden
 * los que traen la firma de Stripe; cada aviso se procesa una sola vez.
 */
export async function POST(solicitud: Request) {
  const secreto = process.env.STRIPE_WEBHOOK_SECRET;
  const servicio = clienteServicio();
  if (!secreto || !servicio) return responder(503, { error: "sin_configurar" });

  // La firma se calcula sobre el cuerpo tal como llegó, sin volver a darle formato.
  const cuerpo = await solicitud.text();
  if (!(await firmaValida(cuerpo, solicitud.headers.get("stripe-signature"), secreto))) {
    return responder(400, { error: "firma_invalida" });
  }

  let aviso: AvisoStripe;
  try {
    aviso = JSON.parse(cuerpo);
  } catch {
    return responder(400, { error: "cuerpo_invalido" });
  }
  if (typeof aviso?.id !== "string" || typeof aviso.type !== "string" || typeof aviso.data?.object !== "object") {
    return responder(400, { error: "cuerpo_invalido" });
  }

  const { data: visto } = await servicio.from("stripe_eventos").select("id").eq("id", aviso.id).maybeSingle();
  if (visto) return responder(200, { resultado: "repetido" });

  try {
    const resultado = await procesarAviso(servicio, aviso);
    // Se anota hasta el final: si algo falló antes, Stripe lo vuelve a mandar y se reintenta.
    await servicio.from("stripe_eventos").insert({ id: aviso.id, tipo: aviso.type });
    // De paso, se cobran los pedidos a los que ya se les acabaron los minutos de gracia.
    await cobrarAutorizados(servicio).catch(() => null);
    return responder(200, { resultado });
  } catch {
    return responder(500, { error: "reintentar" });
  }
}
