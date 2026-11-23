import type { SupabaseClient } from "@supabase/supabase-js";
import { correoActivo, enviarCorreo } from "@/lib/correo";
import { RUTA_ADMIN } from "@/lib/admin/ruta";
import { pesos } from "@/lib/precios";
import { site, urlAbsoluta } from "@/lib/site";
import { escapar } from "@/lib/solicitudes";
import { centavos, ErrorStripe, stripe } from "@/lib/stripe";
import type { Database, Json } from "@/lib/supabase/tipos";
import { type AprobacionPedido, type MetodoPago, pago } from "./reglas";

/**
 * Lo que el servidor hace con un pedido: abrir su cobro en Stripe y moverlo de
 * estado. Todo va con el cliente de la llave secreta, porque las empresas no
 * pueden escribir en `pedidos`.
 */

export type Servicio = SupabaseClient<Database>;
export type Pedido = Database["public"]["Tables"]["pedidos"]["Row"];

/** Anota algo en la bitácora del pedido. Nunca detiene lo que se estaba haciendo. */
export async function anotar(servicio: Servicio, pedidoId: string, tipo: string, detalle: Record<string, Json> = {}, por?: string) {
  await servicio.from("pedido_eventos").insert({ pedido_id: pedidoId, tipo, detalle, por: por ?? null });
}

/** Correo interno a LaGafetería sobre un pedido. Si falla o no hay correo configurado, no pasa nada. */
async function avisarInterno(asunto: string, lineas: string[], pedidoId: string) {
  if (!correoActivo()) return;
  const liga = urlAbsoluta(`${RUTA_ADMIN}/pedidos/${pedidoId}`);
  try {
    await enviarCorreo({
      para: site.correo,
      asunto,
      texto: [...lineas, "", `Ver el pedido: ${liga}`].join("\n"),
      html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1B1F3B;">${lineas
        .map((l) => `<p style="margin:0 0 10px;">${escapar(l)}</p>`)
        .join("")}<p style="margin:16px 0 0;"><a href="${escapar(liga)}">Ver el pedido</a></p></div>`,
    });
  } catch {
    // El aviso es una cortesía: el pedido ya quedó guardado.
  }
}

// ---------------------------------------------------------------------------
// Cobro
// ---------------------------------------------------------------------------

type SesionStripe = { id: string; url?: string | null; status?: string };

/** El cliente de Stripe de la empresa; lo crea la primera vez. */
async function clienteDe(servicio: Servicio, empresa: { id: string; nombre: string }, correo: string | null): Promise<string> {
  const { data: actual } = await servicio.from("stripe_clientes").select("cliente").eq("empresa_id", empresa.id).maybeSingle();
  if (actual) return actual.cliente;
  const nuevo = await stripe<{ id: string }>(
    "POST",
    "/v1/customers",
    { name: empresa.nombre, email: correo, preferred_locales: ["es-419"], metadata: { empresa_id: empresa.id } },
    `cliente_${empresa.id}`,
  );
  const { error } = await servicio.from("stripe_clientes").insert({ empresa_id: empresa.id, cliente: nuevo.id });
  if (error) {
    // Otra solicitud lo creó al mismo tiempo: se usa el que quedó guardado.
    const { data: guardado } = await servicio.from("stripe_clientes").select("cliente").eq("empresa_id", empresa.id).maybeSingle();
    if (guardado) return guardado.cliente;
    throw new ErrorStripe("No se pudo guardar el cliente de Stripe.", 0);
  }
  return nuevo.id;
}

/**
 * Deja listo el cobro del pedido en Stripe Checkout y devuelve la liga para
 * pagar. Si el pedido ya tenía una sesión de pago abierta, devuelve esa misma.
 */
export async function abrirCobro(
  servicio: Servicio,
  pedido: Pedido,
  empresa: { id: string; nombre: string },
  correo: string | null,
): Promise<string> {
  if (pedido.estado !== "por_pagar") throw new ErrorStripe("Este pedido ya no está por pagar.", 0);

  if (pedido.stripe_sesion) {
    const previa = await stripe<SesionStripe>("GET", `/v1/checkout/sessions/${pedido.stripe_sesion}`).catch(() => null);
    if (previa?.status === "open" && previa.url) return previa.url;
  }

  const cliente = await clienteDe(servicio, empresa, correo);
  const intento = pedido.intento + 1;
  await servicio.from("pedidos").update({ intento }).eq("id", pedido.id);

  const metodos = pedido.solo_transferencia ? ["customer_balance"] : ["card", "oxxo", "customer_balance"];
  const caras = pedido.dos_caras ? "frente y vuelta" : "una cara";
  const articulo = (nombre: string, importe: number, cantidad = 1, descripcion?: string) => ({
    quantity: cantidad,
    price_data: { currency: "mxn", unit_amount: centavos(importe), product_data: { name: nombre, description: descripcion } },
  });
  const regreso = urlAbsoluta(`/cuenta/pedidos/${pedido.id}`);

  const sesion = await stripe<SesionStripe>(
    "POST",
    "/v1/checkout/sessions",
    {
      mode: "payment",
      customer: cliente,
      locale: "es-419",
      client_reference_id: pedido.id,
      success_url: `${regreso}?pago=listo`,
      cancel_url: `${regreso}?pago=pendiente`,
      payment_method_types: metodos,
      payment_method_options: {
        // Tarjeta: pide autenticación 3D Secure siempre que la admita y deja el cargo solo
        // autorizado, para los minutos de gracia. Se cobra después, en `cobrarAutorizados`.
        ...(metodos.includes("card") ? { card: { request_three_d_secure: "any", capture_method: "manual" } } : {}),
        ...(metodos.includes("oxxo") ? { oxxo: { expires_after_days: pago.diasFichaOxxo } } : {}),
        customer_balance: { funding_type: "bank_transfer", bank_transfer: { type: "mx_bank_transfer" } },
      },
      line_items: [
        articulo(`Gafetes y credenciales, pedido ${pedido.folio}`, Number(pedido.por_pieza), pedido.piezas, `Impresos en PVC, ${caras}.`),
        ...(Number(pedido.envio) > 0 ? [articulo("Envío", Number(pedido.envio))] : []),
        articulo("IVA (16%)", Number(pedido.iva)),
      ],
      metadata: { pedido_id: pedido.id, folio: pedido.folio },
      payment_intent_data: {
        description: `Pedido ${pedido.folio} de ${site.nombre}`,
        metadata: { pedido_id: pedido.id, folio: pedido.folio, empresa_id: empresa.id },
      },
    },
    `pedido_${pedido.id}_${intento}`,
  );
  if (!sesion.url) throw new ErrorStripe("Stripe no devolvió la liga de pago.", 0);

  await servicio.from("pedidos").update({ stripe_sesion: sesion.id, stripe_url: sesion.url }).eq("id", pedido.id);
  await anotar(servicio, pedido.id, "cobro_abierto", { sesion: sesion.id, metodos });
  return sesion.url;
}

/** Cierra la sesión de pago del pedido en Stripe, para que ya no se pueda pagar. */
export async function cerrarCobro(pedido: Pick<Pedido, "stripe_sesion">) {
  if (!pedido.stripe_sesion) return;
  await stripe("POST", `/v1/checkout/sessions/${pedido.stripe_sesion}/expire`).catch(() => null);
}

// ---------------------------------------------------------------------------
// Cambios de estado
// ---------------------------------------------------------------------------

/**
 * Confirma el pago de un pedido. Solo se llama con un aviso firmado de Stripe.
 * Devuelve false si el pedido ya estaba pagado (el aviso llegó repetido).
 */
export async function marcarPagado(
  servicio: Servicio,
  pedido: Pedido,
  datos: { metodo: MetodoPago | null; pago: string | null },
): Promise<boolean> {
  const { data: movido, error } = await servicio
    .from("pedidos")
    .update({
      estado: "pagado",
      pagado_en: new Date().toISOString(),
      cancelado_en: null,
      metodo: datos.metodo ?? pedido.metodo,
      stripe_pago: datos.pago ?? pedido.stripe_pago,
    })
    .eq("id", pedido.id)
    .in("estado", ["por_pagar", "pago_en_proceso", "autorizado", "cancelado"])
    .select("id");
  if (error) throw new Error(error.message);
  if (!movido?.length) return false;

  const estabaCancelado = pedido.estado === "cancelado";
  if (estabaCancelado) {
    await servicio.from("gafetes").update({ estado: "en_pedido" }).eq("pedido_id", pedido.id).eq("estado", "cancelado");
  }
  await anotar(servicio, pedido.id, estabaCancelado ? "pago_tras_cancelar" : "pagado", { metodo: datos.metodo, pago: datos.pago });
  await avisarInterno(
    `Pedido ${pedido.folio} pagado${estabaCancelado ? " (estaba cancelado)" : ""}`,
    [
      `Se confirmó el pago del pedido ${pedido.folio}: ${pedido.piezas} gafetes y credenciales, ${pesos(Number(pedido.total))} con IVA.`,
      estabaCancelado
        ? "Ojo: el pedido estaba cancelado cuando llegó el pago. Decide si se produce o se devuelve el dinero."
        : pedido.primer_pedido || pedido.alertas.length
          ? "Necesita tu revisión antes de pasar a producción."
          : "Ya puede pasar a producción.",
    ],
    pedido.id,
  );
  return true;
}

/**
 * Tarjeta autorizada: el pedido queda en espera durante los minutos de gracia.
 * Devuelve false si el pedido ya no estaba por pagar.
 */
export async function marcarAutorizado(servicio: Servicio, pedido: Pedido, pagoId: string): Promise<boolean> {
  const hasta = new Date(Date.now() + pago.minutosDeGracia * 60_000).toISOString();
  const { data: movido, error } = await servicio
    .from("pedidos")
    .update({ estado: "autorizado", metodo: "tarjeta", stripe_pago: pagoId, gracia_hasta: hasta })
    .eq("id", pedido.id)
    .eq("estado", "por_pagar")
    .select("id");
  if (error) throw new Error(error.message);
  if (!movido?.length) return false;
  await anotar(servicio, pedido.id, "autorizado", { pago: pagoId, gracia_hasta: hasta });
  await avisarInterno(
    `Pedido ${pedido.folio}: pago con tarjeta autorizado`,
    [
      `El pedido ${pedido.folio} (${pedido.piezas} gafetes y credenciales, ${pesos(Number(pedido.total))} con IVA) ya tiene el pago autorizado.`,
      `La empresa puede cancelarlo sin costo durante ${pago.minutosDeGracia} minutos. Después se hace el cargo al abrir el panel de pedidos.`,
    ],
    pedido.id,
  );
  return true;
}

type PagoCobrado = { id: string; status?: string };

/**
 * Cobra los pedidos con tarjeta autorizada a los que ya se les acabaron los
 * minutos de gracia. No hay un reloj que lo dispare: se llama cada vez que
 * llega un aviso de Stripe y cada vez que alguien abre el panel o un pedido.
 * La autorización dura varios días, así que hay margen de sobra.
 */
export async function cobrarAutorizados(servicio: Servicio, soloPedido?: string): Promise<void> {
  let consulta = servicio.from("pedidos").select("*").eq("estado", "autorizado").lt("gracia_hasta", new Date().toISOString()).limit(20);
  if (soloPedido) consulta = consulta.eq("id", soloPedido);
  const { data: vencidos } = await consulta;
  for (const pedido of vencidos ?? []) {
    if (!pedido.stripe_pago) continue;
    try {
      const cobrado = await stripe<PagoCobrado>("POST", `/v1/payment_intents/${pedido.stripe_pago}/capture`, undefined, `cobro_${pedido.id}`);
      if (cobrado.status === "succeeded" || cobrado.status === "processing") {
        await marcarPagado(servicio, pedido, { metodo: "tarjeta", pago: pedido.stripe_pago });
      }
    } catch {
      // No se pudo cobrar. Si Stripe ya soltó la autorización, el pedido vuelve a estar por pagar.
      const actual = await stripe<PagoCobrado>("GET", `/v1/payment_intents/${pedido.stripe_pago}`).catch(() => null);
      if (actual?.status === "succeeded") await marcarPagado(servicio, pedido, { metodo: "tarjeta", pago: pedido.stripe_pago });
      else if (actual?.status === "canceled") await soltarAutorizacion(servicio, pedido, "autorizacion_vencida");
      else await anotar(servicio, pedido.id, "cobro_fallido", {});
    }
  }
}

/** La autorización ya no existe (venció o la canceló el banco): el pedido vuelve a estar por pagar. */
export async function soltarAutorizacion(servicio: Servicio, pedido: Pedido, motivo: string) {
  const { data: movido } = await servicio
    .from("pedidos")
    .update({ estado: "por_pagar", stripe_sesion: null, stripe_url: null, stripe_pago: null, metodo: null, gracia_hasta: null })
    .eq("id", pedido.id)
    .eq("estado", "autorizado")
    .select("id");
  if (movido?.length) await anotar(servicio, pedido.id, motivo, {});
}

/**
 * Cancela un pedido autorizado dentro de sus minutos de gracia: suelta la
 * autorización en Stripe, sin cargo ni comisión. Devuelve false si ya no se pudo.
 */
export async function cancelarAutorizado(servicio: Servicio, pedido: Pedido, por: string, quien: "empresa" | "administracion"): Promise<boolean> {
  if (pedido.estado !== "autorizado" || !pedido.stripe_pago) return false;
  try {
    await stripe("POST", `/v1/payment_intents/${pedido.stripe_pago}/cancel`, { cancellation_reason: "requested_by_customer" });
  } catch {
    return false;
  }
  const { data: movido } = await servicio
    .from("pedidos")
    .update({ estado: "cancelado", cancelado_en: new Date().toISOString() })
    .eq("id", pedido.id)
    .eq("estado", "autorizado")
    .select("id");
  if (!movido?.length) return false;
  await servicio.from("gafetes").update({ estado: "cancelado" }).eq("pedido_id", pedido.id);
  await anotar(servicio, pedido.id, "cancelado", { por: quien, en_gracia: true }, por);
  return true;
}

/** Aviso interno de una disputa: hay que responderla en Stripe con la evidencia del pedido. */
export const avisarDisputa = (pedido: Pedido) =>
  avisarInterno(
    `Disputa en el pedido ${pedido.folio}`,
    [
      `El banco del cliente abrió una disputa por el pago del pedido ${pedido.folio} (${pesos(Number(pedido.total))}).`,
      "Respóndela en Stripe antes de la fecha límite. La evidencia (aprobación de la vista previa, términos, envío) está en el pedido.",
    ],
    pedido.id,
  );

/** La evidencia de aprobación guardada en el pedido, con su tipo. */
export const aprobacionDe = (pedido: Pick<Pedido, "aprobacion">) => pedido.aprobacion as unknown as AprobacionPedido;

/** Avisa a quien hizo el pedido que ya va en camino. Si falla o no hay correo configurado, no pasa nada. */
export async function avisarEnvio(pedido: Pedido, rastreo?: string | null) {
  const para = aprobacionDe(pedido).correo;
  if (!para || !correoActivo()) return;
  const liga = urlAbsoluta(`/cuenta/pedidos/${pedido.id}`);
  const guia = [pedido.paqueteria, pedido.guia ? `guía ${pedido.guia}` : null].filter(Boolean).join(", ");
  const lineas = [
    `Tu pedido ${pedido.folio} de ${pedido.piezas} gafetes y credenciales ya va en camino${guia ? ` por ${guia}` : ""}.`,
    rastreo ? "Puedes seguirlo con la liga de rastreo de la paquetería." : "Puedes ver su avance en tu plataforma.",
  ];
  try {
    await enviarCorreo({
      para,
      asunto: `Tu pedido ${pedido.folio} va en camino`,
      texto: [...lineas, ...(rastreo ? ["", `Rastreo: ${rastreo}`] : []), "", liga].join("\n"),
      html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1B1F3B;">${lineas
        .map((l) => `<p style="margin:0 0 10px;">${escapar(l)}</p>`)
        .join("")}${
        rastreo ? `<p style="margin:16px 0 0;"><a href="${escapar(rastreo)}">Rastrear mi envío</a></p>` : ""
      }<p style="margin:16px 0 0;"><a href="${escapar(liga)}">Ver mi pedido</a></p></div>`,
    });
  } catch {
    // El aviso es una cortesía: el pedido ya quedó marcado como enviado.
  }
}
