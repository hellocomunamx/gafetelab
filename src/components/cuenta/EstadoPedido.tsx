import { type EstadoPedido as Estado, esEstadoPedido, estadosPedido } from "@/lib/pedidos/reglas";

const COLORES: Record<Estado, string> = {
  por_pagar: "bg-resaltador/50",
  pago_en_proceso: "bg-resaltador/50",
  autorizado: "bg-resaltador/50",
  pagado: "bg-[#d9f2e6] text-[#0a5c3b]",
  en_produccion: "bg-[#dfe6ff] text-[#22307a]",
  enviado: "bg-[#dfe6ff] text-[#22307a]",
  entregado: "bg-[#d9f2e6] text-[#0a5c3b]",
  cancelado: "bg-papel text-gris",
  reembolsado: "bg-papel text-gris",
};

/** Etiqueta de color con el estado de un pedido. */
export function EstadoPedido({ valor }: { valor: string }) {
  const estado = esEstadoPedido(valor) ? valor : "por_pagar";
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${COLORES[estado]}`}>
      {estadosPedido[estado].nombre}
    </span>
  );
}
