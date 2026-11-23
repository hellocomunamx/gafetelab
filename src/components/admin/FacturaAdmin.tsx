import Link from "next/link";
import { RUTA_ADMIN } from "@/lib/admin/ruta";
import { requerirAdmin } from "@/lib/admin/sesion";
import { estadosFactura, esEstadoFactura } from "@/lib/facturas";
import { fechaHora } from "@/lib/pedidos/reglas";

/** Aviso en el detalle del pedido: en qué va su factura y liga para atenderla. */
export async function FacturaAdmin({ pedidoId }: { pedidoId: string }) {
  const { servicio } = await requerirAdmin();
  if (!servicio) return null;
  const { data: factura } = await servicio
    .from("facturas")
    .select("estado, folio_fiscal, emitida_en, solicitada_en")
    .eq("pedido_id", pedidoId)
    .maybeSingle();
  if (!factura) return null;
  const estado = esEstadoFactura(factura.estado) ? estadosFactura[factura.estado] : factura.estado;
  const ver = factura.estado === "por_emitir" ? "emitir" : "emitidas";
  return (
    <p className="rounded-tarjeta border border-linea bg-white p-4 text-sm">
      <strong>Factura: {estado.toLowerCase()}.</strong>{" "}
      {factura.estado === "por_emitir"
        ? `La pidieron el ${fechaHora(factura.solicitada_en)}.`
        : factura.emitida_en
          ? `Emitida el ${fechaHora(factura.emitida_en)}${factura.folio_fiscal ? `, folio fiscal ${factura.folio_fiscal}` : ""}.`
          : ""}{" "}
      <Link href={`${RUTA_ADMIN}/facturas?ver=${ver}`} className="font-semibold text-rojo underline underline-offset-4">
        {factura.estado === "por_emitir" ? "Ver datos para el SAT" : "Ver en facturas"}
      </Link>
    </p>
  );
}
