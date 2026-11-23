import { NextResponse } from "next/server";
import { requerirEmpresa } from "@/lib/cuenta/sesion";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Descarga el PDF o el XML de la factura de un pedido, con una liga firmada que dura un minuto. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string; archivo: string }> }) {
  const { id, archivo } = await params;
  if (!UUID.test(id) || (archivo !== "pdf" && archivo !== "xml")) return new NextResponse("No encontrado", { status: 404 });
  const { supabase, empresa } = await requerirEmpresa();
  const { data: factura } = await supabase
    .from("facturas")
    .select("estado, pdf_ruta, xml_ruta")
    .eq("pedido_id", id)
    .eq("empresa_id", empresa.id)
    .maybeSingle();
  const ruta = archivo === "pdf" ? factura?.pdf_ruta : factura?.xml_ruta;
  if (!factura || factura.estado !== "emitida" || !ruta) return new NextResponse("No encontrado", { status: 404 });
  const { data } = await supabase.storage.from("facturas").createSignedUrl(ruta, 60, { download: true });
  if (!data?.signedUrl) return new NextResponse("No encontrado", { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
