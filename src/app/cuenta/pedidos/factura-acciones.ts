"use server";

import { revalidatePath } from "next/cache";
import { RUTA_ADMIN } from "@/lib/admin/ruta";
import { usosCfdi } from "@/lib/cuenta/catalogos";
import { requerirEmpresa } from "@/lib/cuenta/sesion";
import type { Resultado } from "@/lib/cuenta/tipos";
import { correoActivo, enviarCorreo } from "@/lib/correo";
import { dentroDelPlazo } from "@/lib/facturas";
import type { FacturacionCopiada } from "@/lib/pedidos/reglas";
import { anotar } from "@/lib/pedidos/servidor";
import { site, urlAbsoluta } from "@/lib/site";
import { clienteServicio } from "@/lib/supabase/publico";
import type { Json } from "@/lib/supabase/tipos";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * La empresa pide factura de un pedido ya hecho, o cambia los datos de una que
 * todavía no se emite. El disparador de la base de datos pone al día la factura.
 */
export async function pedirFactura(_previo: Resultado, d: FormData): Promise<Resultado> {
  const { supabase, usuario, empresa, administra } = await requerirEmpresa();
  if (!administra) return { error: "Solo quien es dueño o administrador de la empresa puede pedir la factura." };
  const servicio = clienteServicio();
  if (!servicio) return { error: "No pudimos guardar tu solicitud. Escríbenos y lo resolvemos." };

  const id = String(d.get("id") ?? "");
  const datosId = String(d.get("datos") ?? "");
  const uso = String(d.get("uso_cfdi") ?? "");
  if (!UUID.test(id)) return { error: "No encontramos ese pedido." };
  if (!UUID.test(datosId)) return { error: "Elige a nombre de quién facturamos." };
  if (!usosCfdi.some((u) => u.clave === uso)) return { error: "Elige el uso del CFDI." };

  const [{ data: pedido }, { data: fiscales }, { data: factura }] = await Promise.all([
    servicio.from("pedidos").select("id, folio, empresa_id, estado, facturacion, pagado_en, creado_en").eq("id", id).eq("empresa_id", empresa.id).maybeSingle(),
    supabase.from("datos_fiscales").select("*").eq("id", datosId).eq("empresa_id", empresa.id).maybeSingle(),
    servicio.from("facturas").select("estado").eq("pedido_id", id).maybeSingle(),
  ]);
  if (!pedido) return { error: "No encontramos ese pedido." };
  if (pedido.estado === "cancelado" || pedido.estado === "reembolsado") return { error: "Este pedido se canceló, así que no lleva factura." };
  if (factura && factura.estado !== "por_emitir") return { error: "Esta factura ya se emitió y no se puede cambiar." };
  if (!dentroDelPlazo(pedido)) {
    return { error: `Pasaron más de ${site.plazoFacturaDias} días desde tu pedido. Escríbenos a ${site.correo} y vemos cómo ayudarte.` };
  }
  if (!fiscales) return { error: "Esos datos de facturación ya no existen. Vuelve a cargar la página." };

  const copia: FacturacionCopiada = {
    rfc: fiscales.rfc,
    razon_social: fiscales.razon_social,
    regimen_fiscal: fiscales.regimen_fiscal,
    cp_fiscal: fiscales.cp_fiscal,
    uso_cfdi: uso,
    correo: fiscales.correo,
  };
  const { error } = await servicio.from("pedidos").update({ facturacion: copia as unknown as Json }).eq("id", id);
  if (error) return { error: "No pudimos guardar tu solicitud. Intenta de nuevo." };
  const cambio = Boolean(pedido.facturacion);
  await anotar(servicio, id, cambio ? "factura_cambiada" : "factura_pedida", { rfc: copia.rfc, uso_cfdi: uso }, usuario.id);

  if (correoActivo()) {
    const liga = urlAbsoluta(`${RUTA_ADMIN}/facturas`);
    const texto = [
      `${empresa.nombre} ${cambio ? "cambió los datos de la factura" : "pidió factura"} del pedido ${pedido.folio}.`,
      `${copia.razon_social} · ${copia.rfc} · uso ${uso}`,
      "",
      `Facturas por emitir: ${liga}`,
    ].join("\n");
    await enviarCorreo({
      para: site.correo,
      asunto: `${cambio ? "Cambio de factura" : "Factura pedida"}: ${pedido.folio}`,
      texto,
      html: texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>"),
    }).catch(() => null);
  }

  revalidatePath(`/cuenta/pedidos/${id}`);
  revalidatePath(`${RUTA_ADMIN}/facturas`);
  return { ok: cambio ? "Listo, actualizamos los datos de tu factura." : "Listo. Te mandamos la factura por correo en cuanto la emitamos." };
}
