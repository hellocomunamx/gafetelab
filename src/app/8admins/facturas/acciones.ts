"use server";

import { revalidatePath } from "next/cache";
import { RUTA_ADMIN } from "@/lib/admin/ruta";
import { requerirAdmin } from "@/lib/admin/sesion";
import type { Resultado } from "@/lib/cuenta/tipos";
import { correoActivo, enviarCorreo } from "@/lib/correo";
import { diferenciasXml, facturaArchivoMaximo, leerXmlCfdi } from "@/lib/facturas";
import type { FacturacionCopiada } from "@/lib/pedidos/reglas";
import { anotar } from "@/lib/pedidos/servidor";
import { site, urlAbsoluta } from "@/lib/site";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const refrescar = (pedidoId: string) => {
  revalidatePath(`${RUTA_ADMIN}/facturas`);
  revalidatePath(`${RUTA_ADMIN}/pedidos/${pedidoId}`);
  revalidatePath(`/cuenta/pedidos/${pedidoId}`);
};

const archivoDe = (d: FormData, nombre: string): File | null => {
  const f = d.get(nombre);
  return f instanceof File && f.size > 0 ? f : null;
};

const base64 = (datos: ArrayBuffer) => {
  const bytes = new Uint8Array(datos);
  let texto = "";
  for (let i = 0; i < bytes.length; i += 0x8000) texto += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(texto);
};

/**
 * Marca la factura como emitida en el SAT. Guarda el PDF y el XML, si vienen,
 * para que la empresa los descargue, y se los manda por correo si se pide.
 * El XML se revisa contra el pedido: RFC, total y folio fiscal.
 */
export async function emitirFactura(_previo: Resultado, d: FormData): Promise<Resultado> {
  const { servicio, usuario } = await requerirAdmin();
  if (!servicio) return { error: "Falta configurar SUPABASE_SECRET_KEY en el servidor." };
  const id = String(d.get("id") ?? "");
  if (!UUID.test(id)) return { error: "No encontré ese pedido." };

  const [{ data: factura }, { data: pedido }] = await Promise.all([
    servicio.from("facturas").select("*").eq("pedido_id", id).maybeSingle(),
    servicio.from("pedidos").select("id, folio, empresa_id, total").eq("id", id).maybeSingle(),
  ]);
  if (!factura || !pedido) return { error: "No encontré esa factura." };
  if (factura.estado !== "por_emitir") return { error: "Esta factura ya no está por emitir. Recarga la página." };
  const datos = factura.datos as unknown as FacturacionCopiada;

  const pdf = archivoDe(d, "pdf");
  const xml = archivoDe(d, "xml");
  for (const f of [pdf, xml]) {
    if (f && f.size > facturaArchivoMaximo) return { error: `«${f.name}» pesa más de 2 MB.` };
  }
  const pdfDatos = pdf ? await pdf.arrayBuffer() : null;
  if (pdfDatos && new TextDecoder().decode(pdfDatos.slice(0, 5)) !== "%PDF-") return { error: "El archivo PDF no parece un PDF." };
  const xmlTexto = xml ? await xml.text() : null;
  if (xmlTexto && !/<(?:[\w-]+:)?Comprobante\b/i.test(xmlTexto)) return { error: "El XML no parece una factura (CFDI)." };

  let folio = String(d.get("folio_fiscal") ?? "").trim().toUpperCase() || null;
  if (xmlTexto) {
    const lectura = leerXmlCfdi(xmlTexto);
    const avisos = diferenciasXml(lectura, datos, Number(pedido.total));
    if (avisos.length && d.get("confirmar") !== "si") {
      return { error: `${avisos.join(" ")} Si así está bien, marca «Sí, así está bien» y vuelve a guardar.` };
    }
    folio = folio ?? lectura.folioFiscal;
  }
  if (folio && !UUID.test(folio)) return { error: "El folio fiscal debe tener la forma XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX." };

  const carpeta = `${pedido.empresa_id}/${pedido.id}`;
  const subidas: { pdf_ruta?: string; xml_ruta?: string } = {};
  if (pdfDatos) {
    const ruta = `${carpeta}.pdf`;
    const { error } = await servicio.storage.from("facturas").upload(ruta, pdfDatos, { contentType: "application/pdf", upsert: true });
    if (error) return { error: "No se pudo guardar el PDF. Intenta de nuevo." };
    subidas.pdf_ruta = ruta;
  }
  if (xmlTexto) {
    const ruta = `${carpeta}.xml`;
    const { error } = await servicio.storage.from("facturas").upload(ruta, new Blob([xmlTexto], { type: "application/xml" }), {
      contentType: "application/xml",
      upsert: true,
    });
    if (error) return { error: "No se pudo guardar el XML. Intenta de nuevo." };
    subidas.xml_ruta = ruta;
  }

  const { data: movida } = await servicio
    .from("facturas")
    .update({ estado: "emitida", folio_fiscal: folio, emitida_en: new Date().toISOString(), emitida_por: usuario.id, ...subidas })
    .eq("pedido_id", id)
    .eq("estado", "por_emitir")
    .select("pedido_id");
  if (!movida?.length) return { error: "Esta factura ya no está por emitir. Recarga la página." };
  await anotar(servicio, id, "factura_emitida", { folio_fiscal: folio }, usuario.id);

  let enviada = false;
  if (d.get("enviar") === "si" && correoActivo() && (pdfDatos || xmlTexto)) {
    const liga = urlAbsoluta(`/cuenta/pedidos/${id}`);
    const texto = [
      "¡Hola!",
      "",
      `Te mandamos la factura de tu pedido ${pedido.folio}, a nombre de ${datos.razon_social} (${datos.rfc}).`,
      folio ? `Folio fiscal: ${folio}` : "",
      "",
      `También la puedes descargar cuando quieras desde tu pedido: ${liga}`,
      "",
      `Gracias por tu compra. El equipo de ${site.nombre}`,
    ]
      .filter((l, i, todas) => l || todas[i - 1])
      .join("\n");
    const nombre = `Factura ${pedido.folio}`;
    const { error } = await enviarCorreo({
      para: datos.correo,
      asunto: `Tu factura del pedido ${pedido.folio}`,
      texto,
      html: texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>"),
      adjuntos: [
        ...(pdfDatos ? [{ nombre: `${nombre}.pdf`, contenido: base64(pdfDatos) }] : []),
        ...(xmlTexto ? [{ nombre: `${nombre}.xml`, contenido: base64(new TextEncoder().encode(xmlTexto).buffer as ArrayBuffer) }] : []),
      ],
    }).catch(() => ({ error: true }));
    if (!error) {
      enviada = true;
      await servicio.from("facturas").update({ enviada_en: new Date().toISOString() }).eq("pedido_id", id);
      await anotar(servicio, id, "factura_enviada", { correo: datos.correo }, usuario.id);
    }
  }

  refrescar(id);
  return {
    ok: enviada
      ? `Factura de ${pedido.folio} emitida y enviada a ${datos.correo}.`
      : `Factura de ${pedido.folio} emitida.${d.get("enviar") === "si" ? " No se pudo mandar el correo; la empresa la puede descargar desde su pedido." : ""}`,
  };
}

/** Por si se marcó por error: la regresa a «por emitir» y borra sus archivos. */
export async function reabrirFactura(d: FormData) {
  const { servicio, usuario } = await requerirAdmin();
  const id = String(d.get("id") ?? "");
  if (!servicio || !UUID.test(id)) return;
  const { data: factura } = await servicio.from("facturas").select("pdf_ruta, xml_ruta").eq("pedido_id", id).eq("estado", "emitida").maybeSingle();
  if (!factura) return;
  await servicio
    .from("facturas")
    .update({ estado: "por_emitir", folio_fiscal: null, pdf_ruta: null, xml_ruta: null, emitida_en: null, emitida_por: null, enviada_en: null })
    .eq("pedido_id", id);
  const rutas = [factura.pdf_ruta, factura.xml_ruta].filter((r): r is string => Boolean(r));
  if (rutas.length) await servicio.storage.from("facturas").remove(rutas);
  await anotar(servicio, id, "factura_reabierta", {}, usuario.id);
  refrescar(id);
}

/** Después de cancelarla en el portal del SAT (por ejemplo, por una devolución). */
export async function cancelarFactura(d: FormData) {
  const { servicio, usuario } = await requerirAdmin();
  const id = String(d.get("id") ?? "");
  if (!servicio || !UUID.test(id)) return;
  const { data: movida } = await servicio
    .from("facturas")
    .update({ estado: "cancelada", cancelada_en: new Date().toISOString() })
    .eq("pedido_id", id)
    .eq("estado", "emitida")
    .select("pedido_id");
  if (movida?.length) await anotar(servicio, id, "factura_cancelada", {}, usuario.id);
  refrescar(id);
}
