import type { Metadata } from "next";
import Link from "next/link";
import { EstadoPedido } from "@/components/cuenta/EstadoPedido";
import { claseBoton } from "@/components/cuenta/Formulario";
import { fechaLarga } from "@/lib/cuenta/constancia";
import { requerirEmpresa } from "@/lib/cuenta/sesion";
import { resumenSaldo } from "@/lib/pedidos/saldo";
import { cobrarAutorizados, saldoDe } from "@/lib/pedidos/servidor";
import { pesos } from "@/lib/precios";
import { clienteServicio } from "@/lib/supabase/publico";

export const metadata: Metadata = { title: "Pedidos" };

export default async function Pedidos() {
  const { supabase, empresa, administra } = await requerirEmpresa();
  // De paso, se cobran los pedidos a los que ya se les acabaron los minutos de gracia.
  const servicio = clienteServicio();
  if (servicio) await cobrarAutorizados(servicio).catch(() => null);
  const [{ data: pedidos }, saldos] = await Promise.all([
    supabase
      .from("pedidos")
      .select("id, folio, tipo, estado, piezas, total, creado_en")
      .eq("empresa_id", empresa.id)
      .order("creado_en", { ascending: false })
      .limit(200),
    saldoDe(supabase, empresa.id),
  ]);
  const enSaldo = resumenSaldo(saldos);
  const vence = saldos.find((s) => s.concepto === "gafetes")?.venceEn;

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
      {enSaldo.gafetes || enSaldo.envios || enSaldo.digitales ? (
        <section className="rounded-tarjeta border border-linea bg-white p-5 sm:p-6">
          <h2 className="text-xl font-extrabold">Tu saldo prepagado</h2>
          <p className="mt-2 font-titulos text-3xl font-extrabold">
            {enSaldo.gafetes.toLocaleString("es-MX")} {enSaldo.gafetes === 1 ? "gafete" : "gafetes"}
            <span className="ml-2 text-lg font-semibold text-gris">
              y {enSaldo.envios} {enSaldo.envios === 1 ? "envío" : "envíos"}
              {enSaldo.digitales ? `, más ${enSaldo.digitales.toLocaleString("es-MX")} ${enSaldo.digitales === 1 ? "gafete digital" : "gafetes digitales"}` : ""}
            </span>
          </p>
          <p className="mt-1 text-sm text-gris">
            Se usan primero cada vez que haces un pedido.{vence ? ` Los que vencen antes, el ${fechaLarga(vence)}.` : ""}
          </p>
          {administra ? (
            <Link href="/cuenta/pedidos/nuevo" className={`${claseBoton} mt-4`}>
              Usar mi saldo
            </Link>
          ) : null}
        </section>
      ) : null}
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
                    {p.tipo === "prepago" ? <span className="ml-2 text-xs text-gris">Compra prepagada</span> : null}
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
            Cuando tu equipo y tu diseño estén listos, pide tus gafetes y credenciales desde aquí. ¿Quieres dejarlos pagados?{" "}
            <Link href="/precios#paquetes" className="font-semibold text-rojo underline underline-offset-4">
              Ver paquetes prepagados
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
