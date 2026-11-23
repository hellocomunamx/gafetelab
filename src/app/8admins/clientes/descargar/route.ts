import { cargarClientes } from "@/lib/admin/clientes";
import { requerirAdmin } from "@/lib/admin/sesion";
import { descargaXlsx, hoyEnSonora } from "@/lib/admin/xlsx";

export const dynamic = "force-dynamic";

/** La base de clientes en Excel. Solo para la administradora; a los demás, "no existe". */
export async function GET() {
  const { supabase, servicio } = await requerirAdmin();
  if (!servicio) return new Response("Falta configurar SUPABASE_SECRET_KEY.", { status: 503 });
  const clientes = await cargarClientes(servicio, supabase);
  return descargaXlsx(`clientes-lagafeteria-${hoyEnSonora()}`, [
    {
      nombre: "Clientes",
      encabezados: [
        "Empresa",
        "Giro",
        "Contacto",
        "Correo",
        "Teléfono",
        "RFC",
        "Razón social",
        "Ciudad",
        "Alta",
        "Constancia",
        "Usuarios",
        "Personas activas",
        "Pedidos",
        "Pedidos pagados",
        "Gafetes comprados",
        "Ha pagado",
        "Último pedido",
      ],
      anchos: [30, 20, 26, 32, 16, 16, 34, 24, 12, 14, 10, 16, 10, 16, 18, 14, 14],
      filas: clientes.map((c) => [
        c.nombre,
        c.giro,
        c.contacto?.nombre,
        c.contacto?.correo,
        c.contacto?.telefono,
        c.rfc,
        c.razonSocial,
        c.ciudad,
        { fecha: c.alta },
        c.constancia,
        c.usuarios,
        c.activos,
        c.pedidos,
        c.pagados,
        c.gafetes,
        { dinero: c.total },
        { fecha: c.ultimoPedido },
      ]),
    },
  ]);
}
