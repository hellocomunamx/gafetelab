import type { Metadata } from "next";
import Link from "next/link";
import { EstadoPedido } from "@/components/cuenta/EstadoPedido";
import { claseBoton } from "@/components/cuenta/Formulario";
import { fechaLarga } from "@/lib/cuenta/constancia";
import { requerirEmpresa } from "@/lib/cuenta/sesion";
import { cobrarAutorizados } from "@/lib/pedidos/servidor";
import { pesos } from "@/lib/precios";
import { clienteServicio } from "@/lib/supabase/publico";

export const metadata: Metadata = { title: "Pedidos" };

export default async function Pedidos() {
  const { supabase, empresa, administra } = await requerirEmpresa();
  // De paso, se cobran los pedidos a los que ya se les acabaron los minutos de gracia.
  const servicio = clienteServicio();
  if (servicio) await cobrarAutorizados(servicio).catch(() => null);
  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("id, folio, estado, piezas, total, creado_en")
    .eq("empresa_id", empresa.id)
    .order("creado_en", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold">Pedidos</h1>
        {administra ? (
          <Link href="/cuenta/pedidos/nuevo" className={claseBoton}>
            Hacer un pedido
          </Link>
        ) : null}
      </div>
      {pedidos?.length ? (
        <div className="relative overflow-x-auto rounded-tarjeta border border-linea bg-white">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="bg-papel text-gris">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Pedido</th>
                <th scope="col" className="px-4 py-3 font-semibold">Fecha</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Gafetes</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Total</th>
                <th scope="col" className="px-4 py-3 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linea">
              {pedidos.map((p) => (
                <tr key={p.id}>
                  <th scope="row" className="px-4 py-3">
                    <Link href={`/cuenta/pedidos/${p.id}`} className="font-semibold text-rojo underline underline-offset-4">
                      {p.folio}
                    </Link>
                  </th>
                  <td className="px-4 py-3 whitespace-nowrap text-gris">{fechaLarga(p.creado_en)}</td>
                  <td className="px-4 py-3 text-right">{p.piezas.toLocaleString("es-MX")}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">{pesos(Number(p.total))}</td>
                  <td className="px-4 py-3">
                    <EstadoPedido valor={p.estado} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-tarjeta border border-dashed border-linea bg-white p-8 text-center">
          <p className="font-semibold">Todavía no tienes pedidos.</p>
          <p className="mt-1 text-sm text-gris">
            Cuando tu equipo y tu diseño estén listos, pide tus gafetes y credenciales desde aquí.
          </p>
        </div>
      )}
    </div>
  );
}
