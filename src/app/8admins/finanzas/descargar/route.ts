import { COLUMNAS_FINANZAS, aPedidoFinanzas, esPeriodo, periodos, rangoDe, resumir } from "@/lib/admin/finanzas";
import { todas } from "@/lib/admin/paginas";
import { requerirAdmin } from "@/lib/admin/sesion";
import { descargaXlsx, hoyEnSonora } from "@/lib/admin/xlsx";
import { type FacturacionCopiada, esEstadoPedido, esMetodoPago, estadosPedido, metodosPago } from "@/lib/pedidos/reglas";

export const dynamic = "force-dynamic";

const DISPUTAS: Record<string, string> = { abierta: "Abierta", ganada: "Ganada", perdida: "Perdida" };

/**
 * Las finanzas en Excel: los pedidos del periodo, el resumen mes por mes y el
 * reparto por forma de pago. Solo para la administradora; a los demás, "no existe".
 */
export async function GET(solicitud: Request) {
  const { servicio } = await requerirAdmin();
  if (!servicio) return new Response("Falta configurar SUPABASE_SECRET_KEY.", { status: 503 });

  const pedido = new URL(solicitud.url).searchParams.get("periodo");
  const periodo = esPeriodo(pedido) ? pedido : "mes";
  const rango = rangoDe(periodo);
  const [pedidos, eventos, { data: empresas }] = await Promise.all([
    todas((desde, hasta) =>
      servicio
        .from("pedidos")
        .select(`${COLUMNAS_FINANZAS}, por_pieza, facturacion, paqueteria, guia`)
        .order("creado_en", { ascending: false })
        .order("id")
        .range(desde, hasta),
    ),
    todas((desde, hasta) =>
      servicio
        .from("pedido_eventos")
        .select("pedido_id, tipo, detalle, creado_en")
        .in("tipo", ["reembolsado", "reembolso_parcial", "cancelado"])
        .order("id")
        .range(desde, hasta),
    ),
    servicio.from("empresas").select("id, nombre").limit(5000),
  ]);
  const r = resumir(pedidos.map(aPedidoFinanzas), eventos, rango);
  const nombreDe = new Map((empresas ?? []).map((e) => [e.id, e.nombre]));

  // Entran los pedidos hechos, pagados, cancelados o devueltos dentro del periodo.
  const enRango = (iso: string | null | undefined) => {
    if (!iso) return false;
    const ms = new Date(iso).getTime();
    return (rango.desde === null || ms >= rango.desde) && (rango.hasta === null || ms < rango.hasta);
  };
  const delPeriodo = pedidos.filter(
    (p) => enRango(p.creado_en) || enRango(p.pagado_en) || enRango(p.cancelado_en) || enRango(r.devueltoPorPedido.get(p.id)?.en),
  );
  const nombrePeriodo = periodos.find((p) => p.id === periodo)!.nombre;

  return descargaXlsx(`finanzas-lagafeteria-${periodo}-${hoyEnSonora()}`, [
    {
      nombre: `Pedidos (${nombrePeriodo.toLowerCase()})`,
      encabezados: [
        "Pedido",
        "Empresa",
        "RFC",
        "Razón social",
        "Hecho",
        "Pagado",
        "Estado",
        "Forma de pago",
        "Gafetes",
        "Por pieza",
        "Subtotal",
        "Envío",
        "IVA",
        "Total",
        "Devuelto",
        "Disputa",
        "Cancelado",
        "Paquetería",
        "Guía",
      ],
      anchos: [12, 30, 16, 34, 18, 18, 18, 22, 10, 12, 14, 12, 12, 14, 12, 12, 18, 16, 22],
      filas: delPeriodo.map((p) => {
        const fiscal = p.facturacion as FacturacionCopiada | null;
        return [
          p.folio,
          nombreDe.get(p.empresa_id) ?? "",
          fiscal?.rfc,
          fiscal?.razon_social,
          { fechaHora: p.creado_en },
          { fechaHora: p.pagado_en },
          esEstadoPedido(p.estado) ? estadosPedido[p.estado].nombre : p.estado,
          esMetodoPago(p.metodo) ? metodosPago[p.metodo] : "",
          p.piezas,
          { dinero: Number(p.por_pieza) },
          { dinero: Number(p.subtotal) },
          { dinero: Number(p.envio) },
          { dinero: Number(p.iva) },
          { dinero: Number(p.total) },
          { dinero: r.devueltoPorPedido.get(p.id)?.monto ?? 0 },
          p.disputa ? (DISPUTAS[p.disputa] ?? p.disputa) : "",
          { fechaHora: p.cancelado_en },
          p.paqueteria,
          p.guia,
        ];
      }),
    },
    {
      nombre: "Mes por mes",
      encabezados: ["Mes", "Cobrado", "Pedidos pagados", "Gafetes", "Devuelto", "Pedidos cancelados"],
      anchos: [20, 16, 16, 12, 14, 20],
      filas: r.meses.map((m) => [m.nombre, { dinero: m.cobrado }, m.pedidos, m.piezas, { dinero: m.devuelto }, m.cancelados]),
    },
    {
      nombre: "Por forma de pago",
      encabezados: ["Forma de pago", "Pedidos", "Cobrado", "Parte del total (%)"],
      anchos: [24, 12, 16, 20],
      filas: r.metodos.map((m) => [m.nombre, m.pedidos, { dinero: m.total }, Math.round(m.parte * 1000) / 10]),
    },
  ]);
}
