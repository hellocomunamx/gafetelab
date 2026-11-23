import { centavos, stripe } from "@/lib/stripe";
import type { MetodoPago } from "./reglas";
import { anotar, anularSaldos, avisarDisputa, marcarAutorizado, marcarPagado, type Pedido, type Servicio, soltarAutorizacion } from "./servidor";

/**
 * Qué hace cada aviso (webhook) de Stripe con su pedido. El aviso ya llegó con
 * la firma comprobada. Si algo falla aquí se lanza un error, para que Stripe
 * lo reintente más tarde.
 */

export type AvisoStripe = { id: string; type: string; data: { object: Record<string, unknown> } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const texto = (v: unknown) => (typeof v === "string" && v ? v : null);
/** Un campo que Stripe manda como id o como objeto expandido. */
const idDe = (v: unknown) => texto(v) ?? texto((v as { id?: unknown } | null)?.id);

async function pedidoPor(servicio: Servicio, columna: "id" | "stripe_sesion" | "stripe_pago", valor: string | null): Promise<Pedido | null> {
  if (!valor || (columna === "id" && !UUID.test(valor))) return null;
  const { data, error } = await servicio.from("pedidos").select("*").eq(columna, valor).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

type PagoStripe = {
  id: string;
  status?: string;
  metadata?: Record<string, string>;
  next_action?: {
    type?: string;
    oxxo_display_details?: { hosted_voucher_url?: string };
    display_bank_transfer_instructions?: { hosted_instructions_url?: string };
  } | null;
  latest_charge?: { payment_method_details?: { type?: string } } | string | null;
};

/**
 * Cómo va el pago en Stripe: su estado, con qué se pagó (o se va a pagar) y, si
 * aplica, la liga a la ficha de OXXO o a los datos de la transferencia.
 */
async function detalleDelPago(pagoId: string | null): Promise<{ estado: string | null; metodo: MetodoPago | null; ficha: string | null }> {
  if (!pagoId) return { estado: null, metodo: null, ficha: null };
  const p = await stripe<PagoStripe>("GET", `/v1/payment_intents/${pagoId}`, { expand: ["latest_charge"] }).catch(() => null);
  if (!p) return { estado: null, metodo: null, ficha: null };
  const estado = texto(p.status);
  const siguiente = p.next_action;
  if (siguiente?.type === "oxxo_display_details") {
    return { estado, metodo: "oxxo", ficha: texto(siguiente.oxxo_display_details?.hosted_voucher_url) };
  }
  if (siguiente?.type === "display_bank_transfer_instructions") {
    return { estado, metodo: "spei", ficha: texto(siguiente.display_bank_transfer_instructions?.hosted_instructions_url) };
  }
  const tipo = typeof p.latest_charge === "object" ? p.latest_charge?.payment_method_details?.type : undefined;
  const metodo = tipo === "oxxo" ? "oxxo" : tipo === "customer_balance" ? "spei" : tipo === "card" || tipo === "link" ? "tarjeta" : null;
  return { estado, metodo, ficha: null };
}

/** El pedido de un cargo o de una disputa: por su pago o, si aún no está guardado, por los datos del pago. */
async function pedidoDelPago(servicio: Servicio, pagoId: string | null): Promise<Pedido | null> {
  const guardado = await pedidoPor(servicio, "stripe_pago", pagoId);
  if (guardado || !pagoId) return guardado;
  const p = await stripe<PagoStripe>("GET", `/v1/payment_intents/${pagoId}`).catch(() => null);
  return pedidoPor(servicio, "id", texto(p?.metadata?.pedido_id));
}

/** Procesa un aviso. Devuelve una palabra que describe lo que hizo, para la bitácora del servidor. */
export async function procesarAviso(servicio: Servicio, aviso: AvisoStripe): Promise<string> {
  const o = aviso.data.object;
  const metadatos = (o.metadata ?? {}) as Record<string, string>;

  switch (aviso.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const pedido =
        (await pedidoPor(servicio, "id", texto(metadatos.pedido_id))) ?? (await pedidoPor(servicio, "stripe_sesion", texto(o.id)));
      if (!pedido) return "sin_pedido";
      const pagoId = idDe(o.payment_intent);
      // El importe cobrado debe ser exactamente el del pedido.
      if (o.amount_total !== centavos(Number(pedido.total)) || String(o.currency).toLowerCase() !== "mxn") {
        await anotar(servicio, pedido.id, "importe_distinto", { cobrado: Number(o.amount_total) || 0, moneda: String(o.currency) });
        return "importe_distinto";
      }
      const { estado, metodo, ficha } = await detalleDelPago(pagoId);
      // Tarjeta autorizada y sin cobrar: empiezan los minutos de gracia.
      if (estado === "requires_capture" && pagoId) {
        return (await marcarAutorizado(servicio, pedido, pagoId)) ? "autorizado" : "ya_autorizado";
      }
      if (o.payment_status === "paid" || estado === "succeeded") {
        return (await marcarPagado(servicio, pedido, { metodo, pago: pagoId })) ? "pagado" : "ya_pagado";
      }
      // OXXO o transferencia: ya hay ficha o instrucciones, pero el dinero no ha llegado.
      const { data: movido, error } = await servicio
        .from("pedidos")
        .update({ estado: "pago_en_proceso", metodo, stripe_pago: pagoId, ficha_url: ficha })
        .eq("id", pedido.id)
        .eq("estado", "por_pagar")
        .select("id");
      if (error) throw new Error(error.message);
      if (movido?.length) await anotar(servicio, pedido.id, "pago_en_proceso", { metodo, pago: pagoId });
      return "pago_en_proceso";
    }

    case "checkout.session.async_payment_failed": {
      const pedido =
        (await pedidoPor(servicio, "id", texto(metadatos.pedido_id))) ?? (await pedidoPor(servicio, "stripe_sesion", texto(o.id)));
      if (!pedido) return "sin_pedido";
      // La ficha venció o la transferencia no llegó: el pedido vuelve a estar por pagar.
      const { data: movido, error } = await servicio
        .from("pedidos")
        .update({ estado: "por_pagar", stripe_sesion: null, stripe_url: null, stripe_pago: null, ficha_url: null, metodo: null })
        .eq("id", pedido.id)
        .eq("estado", "pago_en_proceso")
        .select("id");
      if (error) throw new Error(error.message);
      if (movido?.length) await anotar(servicio, pedido.id, "pago_no_llego", { sesion: texto(o.id) });
      return "pago_no_llego";
    }

    case "checkout.session.expired": {
      const pedido = await pedidoPor(servicio, "stripe_sesion", texto(o.id));
      if (!pedido) return "sin_pedido";
      const { error } = await servicio
        .from("pedidos")
        .update({ stripe_sesion: null, stripe_url: null })
        .eq("id", pedido.id)
        .eq("estado", "por_pagar")
        .eq("stripe_sesion", pedido.stripe_sesion ?? "");
      if (error) throw new Error(error.message);
      return "sesion_vencida";
    }

    case "payment_intent.payment_failed": {
      const pedido = await pedidoPor(servicio, "id", texto(metadatos.pedido_id));
      if (!pedido) return "sin_pedido";
      const falla = (o.last_payment_error ?? {}) as { code?: string; decline_code?: string };
      await anotar(servicio, pedido.id, "pago_rechazado", { codigo: falla.code ?? null, motivo: falla.decline_code ?? null });
      return "pago_rechazado";
    }

    case "payment_intent.canceled": {
      // La autorización de la tarjeta venció o se soltó sin que se cobrara.
      const pedido = (await pedidoPor(servicio, "stripe_pago", texto(o.id))) ?? (await pedidoPor(servicio, "id", texto(metadatos.pedido_id)));
      if (!pedido) return "sin_pedido";
      await soltarAutorizacion(servicio, pedido, "autorizacion_vencida");
      return "autorizacion_vencida";
    }

    case "charge.refunded": {
      const pedido = await pedidoDelPago(servicio, idDe(o.payment_intent));
      if (!pedido) return "sin_pedido";
      const total = o.refunded === true;
      if (total) {
        const { error } = await servicio.from("pedidos").update({ estado: "reembolsado" }).eq("id", pedido.id);
        if (error) throw new Error(error.message);
        if (pedido.tipo === "prepago") await anularSaldos(servicio, pedido.id);
        // Lo que no se alcanzó a entregar deja de contar como gafete emitido.
        await servicio.from("gafetes").update({ estado: "cancelado" }).eq("pedido_id", pedido.id).in("estado", ["en_pedido", "en_produccion"]);
        // Los gafetes digitales que ya estaban en el celular dejan de mostrarse.
        await servicio.from("gafetes").update({ estado: "desactivado" }).eq("pedido_id", pedido.id).eq("tipo", "digital").eq("estado", "activo");
      }
      await anotar(servicio, pedido.id, total ? "reembolsado" : "reembolso_parcial", { devuelto: Number(o.amount_refunded) || 0 });
      return total ? "reembolsado" : "reembolso_parcial";
    }

    case "charge.dispute.created":
    case "charge.dispute.closed": {
      const pedido = await pedidoDelPago(servicio, idDe(o.payment_intent));
      if (!pedido) return "sin_pedido";
      const abierta = aviso.type === "charge.dispute.created";
      const estado = abierta ? "abierta" : o.status === "won" ? "ganada" : o.status === "lost" ? "perdida" : null;
      const { error } = await servicio.from("pedidos").update({ disputa: estado }).eq("id", pedido.id);
      if (error) throw new Error(error.message);
      await anotar(servicio, pedido.id, abierta ? "disputa_abierta" : "disputa_cerrada", {
        motivo: texto(o.reason),
        resultado: texto(o.status),
      });
      if (abierta) await avisarDisputa(pedido);
      return abierta ? "disputa_abierta" : "disputa_cerrada";
    }

    default:
      return "ignorado";
  }
}
