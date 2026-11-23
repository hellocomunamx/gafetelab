"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { RUTA_ADMIN } from "@/lib/admin/ruta";
import { requerirAdmin } from "@/lib/admin/sesion";
import { ErrorEnvia, generarGuia } from "@/lib/envios/envia";
import { armarSobres } from "@/lib/envios/sobres";
import { type DireccionCopiada, requiereRevision } from "@/lib/pedidos/reglas";
import { activarDigitales, anotar, aprobacionDe, avisarEnvio, cancelarAutorizado, cerrarCobro, liberarSaldo, type Pedido, type Servicio } from "@/lib/pedidos/servidor";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** El pedido de un formulario del panel, ya con la sesión de administradora comprobada. */
async function abrir(d: FormData): Promise<{ servicio: Servicio; pedido: Pedido; usuario: string } | null> {
  const { servicio, usuario } = await requerirAdmin();
  const id = String(d.get("id") ?? "");
  if (!servicio || !UUID.test(id)) return null;
  const { data: pedido } = await servicio.from("pedidos").select("*").eq("id", id).maybeSingle();
  return pedido ? { servicio, pedido, usuario: usuario.id } : null;
}

const refrescar = (id: string) => {
  revalidatePath(`${RUTA_ADMIN}/pedidos`);
  revalidatePath(`${RUTA_ADMIN}/pedidos/${id}`);
  revalidatePath("/cuenta", "layout");
};

/** Mueve el pedido de un estado a otro y lleva sus gafetes al estado que corresponde. */
async function mover(
  x: { servicio: Servicio; pedido: Pedido; usuario: string },
  de: string,
  cambios: Partial<Pedido>,
  gafetes: string,
  evento: string,
) {
  const { data: movido } = await x.servicio.from("pedidos").update(cambios).eq("id", x.pedido.id).eq("estado", de).select("*");
  if (!movido?.length) return null;
  // Solo los impresos siguen a producción y envío; los digitales se activan al pagarse.
  await x.servicio.from("gafetes").update({ estado: gafetes }).eq("pedido_id", x.pedido.id).eq("tipo", "impreso").neq("estado", "cancelado");
  await anotar(x.servicio, x.pedido.id, evento, {}, x.usuario);
  return movido[0];
}

/** La administradora revisó el pedido (primer pedido de la empresa o con palabras de alerta). */
export async function revisarPedido(d: FormData) {
  const x = await abrir(d);
  if (!x || x.pedido.revisado_en) return;
  await x.servicio.from("pedidos").update({ revisado_en: new Date().toISOString(), revisado_por: x.usuario }).eq("id", x.pedido.id);
  await anotar(x.servicio, x.pedido.id, "revisado", {}, x.usuario);
  // Si ya estaba pagado, sus gafetes digitales se activan en este momento.
  if (x.pedido.pagado_en && !["cancelado", "reembolsado"].includes(x.pedido.estado)) {
    await activarDigitales(x.servicio, { ...x.pedido, revisado_en: new Date().toISOString() });
  }
  refrescar(x.pedido.id);
}

/** Pasa a producción. Solo con el pago confirmado, sin disputa abierta y, si hacía falta, ya revisado. */
export async function producirPedido(d: FormData) {
  const x = await abrir(d);
  // Las compras del carrito no se producen: su contenido ya está en el saldo de la empresa.
  if (!x || x.pedido.tipo === "prepago" || x.pedido.modalidad === "digital" || x.pedido.estado !== "pagado" || x.pedido.disputa === "abierta") return;
  if (requiereRevision(x.pedido) && !x.pedido.revisado_en) return;
  await mover(x, "pagado", { estado: "en_produccion", produccion_en: new Date().toISOString() }, "en_produccion", "en_produccion");
  refrescar(x.pedido.id);
}

export async function enviarPedido(d: FormData) {
  const x = await abrir(d);
  if (!x) return;
  const paqueteria = String(d.get("paqueteria") ?? "").trim().slice(0, 60);
  const guia = String(d.get("guia") ?? "").trim().slice(0, 80);
  if (!paqueteria) return;
  const enviado = await mover(
    x,
    "en_produccion",
    { estado: "enviado", enviado_en: new Date().toISOString(), paqueteria, guia: guia || null },
    "enviado",
    "enviado",
  );
  if (enviado) await avisarEnvio(enviado);
  refrescar(x.pedido.id);
}

/**
 * Compra la guía en Envia con la paquetería y el servicio elegidos, marca el
 * pedido como enviado y le manda al cliente el número de guía con la liga de
 * rastreo. La guía se cobra del saldo de Envia.
 */
export async function generarGuiaPedido(d: FormData) {
  const x = await abrir(d);
  if (!x || x.pedido.estado !== "en_produccion") return;
  const [paqueteria, servicio] = String(d.get("tarifa") ?? "").split("|");
  const direccion = x.pedido.direccion as DireccionCopiada | null;
  const volver = `${RUTA_ADMIN}/pedidos/${x.pedido.id}`;
  if (!paqueteria || !servicio || !direccion) redirect(`${volver}?envia=${encodeURIComponent("Elige una tarifa.")}#envio`);

  const { data: empresa } = await x.servicio.from("empresas").select("nombre").eq("id", x.pedido.empresa_id).maybeSingle();
  let guia;
  try {
    guia = await generarGuia(
      { ...direccion, correo: aprobacionDe(x.pedido).correo, empresa: empresa?.nombre ?? null },
      armarSobres(x.pedido.piezas),
      Number(x.pedido.subtotal),
      paqueteria,
      servicio,
      x.pedido.folio,
    );
  } catch (e) {
    const mensaje = e instanceof ErrorEnvia ? e.message : "No se pudo generar la guía.";
    redirect(`${volver}?envia=${encodeURIComponent(mensaje.slice(0, 300))}#envio`);
  }

  await anotar(
    x.servicio,
    x.pedido.id,
    "guia_generada",
    {
      paqueteria: guia.paqueteria,
      servicio: guia.servicio,
      guias: guia.guias,
      etiqueta: guia.etiqueta,
      rastreo: guia.rastreo,
      costo: guia.costo,
      envio_id: guia.envioId,
    },
    x.usuario,
  );
  const enviado = await mover(
    x,
    "en_produccion",
    {
      estado: "enviado",
      enviado_en: new Date().toISOString(),
      paqueteria: guia.paqueteria.slice(0, 60),
      guia: guia.guias.join(", ").slice(0, 80),
    },
    "enviado",
    "enviado",
  );
  if (enviado) await avisarEnvio(enviado, guia.rastreo);
  refrescar(x.pedido.id);
}

export async function entregarPedido(d: FormData) {
  const x = await abrir(d);
  if (!x) return;
  await mover(x, "enviado", { estado: "entregado", entregado_en: new Date().toISOString() }, "activo", "entregado");
  refrescar(x.pedido.id);
}

/**
 * Cancela un pedido que no se ha cobrado: sin pago, esperando el pago o con la
 * tarjeta solo autorizada. Uno ya cobrado se devuelve desde Stripe, y el aviso
 * de Stripe lo marca aquí como reembolsado.
 */
export async function cancelarPedidoAdmin(d: FormData) {
  const x = await abrir(d);
  if (!x) return;
  const { servicio, pedido, usuario } = x;
  if (pedido.estado === "autorizado") {
    await cancelarAutorizado(servicio, pedido, usuario, "administracion");
  } else if (pedido.estado === "por_pagar" || pedido.estado === "pago_en_proceso") {
    await cerrarCobro(pedido);
    const { data: movido } = await servicio
      .from("pedidos")
      .update({ estado: "cancelado", cancelado_en: new Date().toISOString(), stripe_sesion: null, stripe_url: null })
      .eq("id", pedido.id)
      .eq("estado", pedido.estado)
      .select("id");
    if (movido?.length) {
      await servicio.from("gafetes").update({ estado: "cancelado" }).eq("pedido_id", pedido.id);
      await liberarSaldo(servicio, pedido.id);
      await anotar(servicio, pedido.id, "cancelado", { por: "administracion" }, usuario);
    }
  }
  refrescar(pedido.id);
}

export async function guardarNotas(d: FormData) {
  const x = await abrir(d);
  if (!x) return;
  const notas = String(d.get("notas") ?? "").trim().slice(0, 2000);
  await x.servicio.from("pedidos").update({ notas: notas || null }).eq("id", x.pedido.id);
  refrescar(x.pedido.id);
}
