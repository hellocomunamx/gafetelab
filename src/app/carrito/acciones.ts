"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { type ArticuloCarrito, carritoMaximoArticulos, cotizarCarrito, limpiarArticulo } from "@/lib/carrito";
import { miAceptacion, requerirEmpresa } from "@/lib/cuenta/sesion";
import { type AprobacionPedido, type FacturacionCopiada, pedidosAbiertosMaximo, soloTransferencia } from "@/lib/pedidos/reglas";
import { abrirCobro, anotar } from "@/lib/pedidos/servidor";
import { stripeActivo } from "@/lib/stripe";
import { clienteServicio } from "@/lib/supabase/publico";
import type { Json } from "@/lib/supabase/tipos";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type EntradaCompra = {
  articulos: unknown[];
  /** Id de los datos de facturación, o null si no necesita factura. */
  facturacion: string | null;
};

/**
 * Cobra lo que hay en el carrito. Se guarda como una compra (pedido de tipo
 * prepago) y, al confirmarse el pago, su contenido queda en el saldo de la
 * empresa. El precio se vuelve a calcular aquí: lo que manda el navegador solo
 * dice qué se eligió.
 */
export async function comprarCarrito(entrada: EntradaCompra): Promise<{ url?: string; pedido?: string; error?: string }> {
  const { supabase, usuario, empresa, administra } = await requerirEmpresa();
  if (!administra) return { error: "Solo quien es dueño o administrador de la empresa puede comprar." };
  const servicio = clienteServicio();
  if (!servicio || !stripeActivo()) return { error: "El pago en línea se activa muy pronto. Escríbenos y lo resolvemos." };

  const lista = Array.isArray(entrada?.articulos) ? entrada.articulos.slice(0, carritoMaximoArticulos + 1) : [];
  const articulos = lista.map(limpiarArticulo).filter((a): a is ArticuloCarrito => Boolean(a));
  if (!articulos.length) return { error: "Tu carrito está vacío." };
  if (articulos.length !== lista.length) return { error: "Algo de tu carrito ya no está disponible. Vuelve a cargar la página." };
  const c = cotizarCarrito(articulos);
  if (c.problema) return { error: c.problema };

  const [{ data: fiscales }, { count: abiertos }, aceptacion] = await Promise.all([
    entrada.facturacion && UUID.test(entrada.facturacion)
      ? supabase.from("datos_fiscales").select("*").eq("id", entrada.facturacion).eq("empresa_id", empresa.id).maybeSingle()
      : Promise.resolve({ data: null }),
    servicio.from("pedidos").select("id", { count: "exact", head: true }).eq("empresa_id", empresa.id).eq("estado", "por_pagar"),
    miAceptacion(),
  ]);
  if (entrada.facturacion && !fiscales) return { error: "Esos datos de facturación ya no existen. Vuelve a cargar la página." };
  if ((abiertos ?? 0) >= pedidosAbiertosMaximo) {
    return { error: "Tienes varios pedidos o compras sin pagar. Paga o cancela alguno en Pedidos antes de seguir." };
  }

  const h = await headers();
  const aprobacion: AprobacionPedido = {
    vista_previa: false,
    terminos_version: aceptacion.aceptacion?.terminos_version ?? null,
    aviso_version: aceptacion.aceptacion?.aviso_version ?? null,
    correo: usuario.email ?? null,
    ip: h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    navegador: h.get("user-agent")?.slice(0, 300) ?? null,
    en: new Date().toISOString(),
  };
  const copiaFiscal: FacturacionCopiada | null = fiscales
    ? {
        rfc: fiscales.rfc,
        razon_social: fiscales.razon_social,
        regimen_fiscal: fiscales.regimen_fiscal,
        cp_fiscal: fiscales.cp_fiscal,
        uso_cfdi: fiscales.uso_cfdi,
        correo: fiscales.correo,
      }
    : null;

  const { data: pedido, error } = await servicio
    .from("pedidos")
    .insert({
      empresa_id: empresa.id,
      creado_por: usuario.id,
      tipo: "prepago",
      modalidad: "impreso",
      fuente: "carrito",
      piezas: c.piezas,
      por_pieza: Math.round((c.subtotal / c.piezas) * 100) / 100,
      subtotal: c.subtotal,
      envio: 0,
      iva: c.iva,
      total: c.total,
      conceptos: c.articulos.map((a) => ({ nombre: a.nombre, cantidad: 1, precio: a.subtotal })) as unknown as Json,
      articulos: c.articulos.map(({ nombre, detalle, subtotal, saldos }) => ({ nombre, detalle, subtotal, saldos })) as unknown as Json,
      facturacion: copiaFiscal as unknown as Json,
      aprobacion: aprobacion as unknown as NonNullable<Json>,
      solo_transferencia: soloTransferencia(c.piezas, c.total),
    })
    .select("*")
    .single();
  if (error || !pedido) return { error: "No pudimos guardar tu compra. Intenta de nuevo." };
  await anotar(servicio, pedido.id, "creado", { tipo: "prepago", piezas: c.piezas, envios: c.envios, total: c.total }, usuario.id);
  revalidatePath("/cuenta", "layout");

  try {
    return { url: await abrirCobro(servicio, pedido, empresa, usuario.email ?? null) };
  } catch {
    // La compra quedó guardada: se puede pagar desde su página.
    return { pedido: pedido.id };
  }
}
