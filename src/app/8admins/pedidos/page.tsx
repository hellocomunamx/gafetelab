import type { Metadata } from "next";
import Link from "next/link";
import { EstadoPedido } from "@/components/cuenta/EstadoPedido";
import { RUTA_ADMIN } from "@/lib/admin/ruta";
import { requerirAdmin } from "@/lib/admin/sesion";
import { esMetodoPago, fechaHora, metodosPago, requiereRevision } from "@/lib/pedidos/reglas";
import { cobrarAutorizados } from "@/lib/pedidos/servidor";
import { pesos } from "@/lib/precios";

export const metadata: Metadata = { title: "Pedidos" };

const FILTROS: { id: string; nombre: string; estados: string[] }[] = [
  { id: "atender", nombre: "Por atender", estados: ["pagado"] },
  { id: "produccion", nombre: "En producción", estados: ["en_produccion"] },
  { id: "enviados", nombre: "Enviados", estados: ["enviado"] },
  { id: "sin_pagar", nombre: "Sin pagar", estados: ["por_pagar", "pago_en_proceso", "autorizado"] },
  { id: "cerrados", nombre: "Cerrados", estados: ["entregado", "cancelado", "reembolsado"] },
];
const chip = (activo: boolean) =>
  `rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
    activo ? "border-tinta bg-tinta text-white" : "border-linea bg-white hover:border-tinta"
  }`;
const marca = "mt-1 block w-fit rounded-full bg-resaltador/40 px-2.5 py-0.5 text-xs font-semibold";

export default async function Pedidos({ searchParams }: { searchParams: Promise<{ ver?: string; q?: string }> }) {
  const { servicio } = await requerirAdmin();
  if (!servicio) {
    return (
      <p role="alert" className="rounded-tarjeta border border-rojo/30 bg-white p-4 text-sm">
        Falta configurar <code>SUPABASE_SECRET_KEY</code> en el servidor para ver los pedidos.
      </p>
    );
  }
  // Al abrir el panel se cobran los pedidos a los que ya se les acabaron los minutos de gracia.
  await cobrarAutorizados(servicio).catch(() => null);

  const f = await searchParams;
  const filtro = FILTROS.find((x) => x.id === f.ver);
  const q = (f.q ?? "").trim().slice(0, 60);
  const [{ data: todos }, { data: empresas }] = await Promise.all([
    servicio
      .from("pedidos")
      .select("id, folio, empresa_id, estado, piezas, total, metodo, primer_pedido, alertas, revisado_en, disputa, creado_en, pagado_en")
      .order("creado_en", { ascending: false })
      .limit(2000),
    servicio.from("empresas").select("id, nombre").limit(5000),
  ]);
  const nombreDe = new Map((empresas ?? []).map((e) => [e.id, e.nombre]));
  const cuenta = (estados: string[]) => (todos ?? []).filter((p) => estados.includes(p.estado)).length;
  const buscado = q.toLowerCase();
  const pedidos = (todos ?? []).filter(
    (p) =>
      (!filtro || filtro.estados.includes(p.estado)) &&
      (!buscado || p.folio.toLowerCase().includes(buscado) || (nombreDe.get(p.empresa_id) ?? "").toLowerCase().includes(buscado)),
  );
  const liga = (ver?: string) => {
    const sp = new URLSearchParams();
    if (ver) sp.set("ver", ver);
    if (q) sp.set("q", q);
    const cola = sp.toString();
    return `${RUTA_ADMIN}/pedidos${cola ? `?${cola}` : ""}`;
  };

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-extrabold">Pedidos</h1>
      <nav aria-label="Filtrar pedidos" className="flex flex-wrap gap-2">
        <Link href={liga()} aria-current={filtro ? undefined : "page"} className={chip(!filtro)}>
          Todos ({(todos ?? []).length})
        </Link>
        {FILTROS.map((x) => (
          <Link key={x.id} href={liga(x.id)} aria-current={filtro?.id === x.id ? "page" : undefined} className={chip(filtro?.id === x.id)}>
            {x.nombre} ({cuenta(x.estados)})
          </Link>
        ))}
      </nav>
      <form className="flex max-w-md gap-2">
        {filtro ? <input type="hidden" name="ver" value={filtro.id} /> : null}
        <label className="flex-1">
          <span className="sr-only">Buscar por folio o empresa</span>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Folio o empresa"
            className="w-full rounded-tarjeta-chica border border-linea bg-white px-3.5 py-2"
          />
        </label>
        <button type="submit" className="rounded-full border border-tinta px-4 py-2 text-sm font-semibold hover:bg-white">
          Buscar
        </button>
      </form>

      {pedidos.length ? (
        <div className="relative overflow-x-auto rounded-tarjeta border border-linea bg-white">
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead className="bg-papel text-gris">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Pedido</th>
                <th scope="col" className="px-4 py-3 font-semibold">Empresa</th>
                <th scope="col" className="px-4 py-3 font-semibold">Hecho</th>
                <th scope="col" className="px-4 py-3 font-semibold">Pagado</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Gafetes</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Total</th>
                <th scope="col" className="px-4 py-3 font-semibold">Pago</th>
                <th scope="col" className="px-4 py-3 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linea">
              {pedidos.map((p) => (
                <tr key={p.id}>
                  <th scope="row" className="px-4 py-3">
                    <Link href={`${RUTA_ADMIN}/pedidos/${p.id}`} className="font-semibold text-rojo underline underline-offset-4">
                      {p.folio}
                    </Link>
                    {p.disputa === "abierta" ? <span className={marca}>Disputa abierta</span> : null}
                    {p.estado === "pagado" && requiereRevision(p) && !p.revisado_en ? <span className={marca}>Revisar antes de producir</span> : null}
                  </th>
                  <td className="px-4 py-3">{nombreDe.get(p.empresa_id) ?? "Empresa"}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gris">{fechaHora(p.creado_en)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gris">{p.pagado_en ? fechaHora(p.pagado_en) : "No"}</td>
                  <td className="px-4 py-3 text-right">{p.piezas.toLocaleString("es-MX")}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">{pesos(Number(p.total))}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {esMetodoPago(p.metodo) ? metodosPago[p.metodo] : "Sin elegir"}
                  </td>
                  <td className="px-4 py-3">
                    <EstadoPedido valor={p.estado} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-tarjeta border border-dashed border-linea bg-white p-8 text-center font-semibold">
          {todos?.length ? "Ningún pedido coincide con ese filtro." : "Todavía no hay pedidos."}
        </p>
      )}
    </div>
  );
}
