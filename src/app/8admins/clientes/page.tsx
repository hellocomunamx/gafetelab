import type { Metadata } from "next";
import Link from "next/link";
import { cargarClientes, fechaCorta } from "@/lib/admin/clientes";
import { RUTA_ADMIN } from "@/lib/admin/ruta";
import { requerirAdmin } from "@/lib/admin/sesion";
import { pesos } from "@/lib/precios";

export const metadata: Metadata = { title: "Clientes" };

const FILTROS = [
  { id: "compraron", nombre: "Ya compraron" },
  { id: "sin_comprar", nombre: "Sin comprar todavía" },
] as const;
const chip = (activo: boolean) =>
  `rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
    activo ? "border-tinta bg-tinta text-white" : "border-linea bg-white hover:border-tinta"
  }`;

export default async function Clientes({ searchParams }: { searchParams: Promise<{ ver?: string; q?: string }> }) {
  const { supabase, servicio } = await requerirAdmin();
  if (!servicio) {
    return (
      <p role="alert" className="rounded-tarjeta border border-rojo/30 bg-white p-4 text-sm">
        Falta configurar <code>SUPABASE_SECRET_KEY</code> en el servidor para ver a los clientes.
      </p>
    );
  }
  const f = await searchParams;
  const filtro = FILTROS.find((x) => x.id === f.ver)?.id;
  const q = (f.q ?? "").trim().slice(0, 60);
  const todos = await cargarClientes(servicio, supabase);
  const buscado = q.toLowerCase();
  const clientes = todos.filter(
    (c) =>
      (!filtro || (filtro === "compraron" ? c.pagados > 0 : c.pagados === 0)) &&
      (!buscado ||
        [c.nombre, c.contacto?.nombre, c.contacto?.correo, c.rfc, c.razonSocial].some((t) => t?.toLowerCase().includes(buscado))),
  );
  const compraron = todos.filter((c) => c.pagados > 0).length;
  const liga = (ver?: string) => {
    const sp = new URLSearchParams();
    if (ver) sp.set("ver", ver);
    if (q) sp.set("q", q);
    const cola = sp.toString();
    return `${RUTA_ADMIN}/clientes${cola ? `?${cola}` : ""}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold">Clientes</h1>
        {todos.length ? (
          <a
            href={`${RUTA_ADMIN}/clientes/descargar`}
            className="rounded-full border border-tinta px-4 py-2 text-sm font-semibold hover:bg-white"
          >
            Descargar en Excel
          </a>
        ) : null}
      </div>
      <nav aria-label="Filtrar clientes" className="flex flex-wrap gap-2">
        <Link href={liga()} aria-current={filtro ? undefined : "page"} className={chip(!filtro)}>
          Todos ({todos.length})
        </Link>
        <Link href={liga("compraron")} aria-current={filtro === "compraron" ? "page" : undefined} className={chip(filtro === "compraron")}>
          Ya compraron ({compraron})
        </Link>
        <Link href={liga("sin_comprar")} aria-current={filtro === "sin_comprar" ? "page" : undefined} className={chip(filtro === "sin_comprar")}>
          Sin comprar todavía ({todos.length - compraron})
        </Link>
      </nav>
      <form className="flex max-w-md gap-2">
        {filtro ? <input type="hidden" name="ver" value={filtro} /> : null}
        <label className="flex-1">
          <span className="sr-only">Buscar por empresa, contacto, correo o RFC</span>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Empresa, contacto, correo o RFC"
            className="w-full rounded-tarjeta-chica border border-linea bg-white px-3.5 py-2"
          />
        </label>
        <button type="submit" className="rounded-full border border-tinta px-4 py-2 text-sm font-semibold hover:bg-white">
          Buscar
        </button>
      </form>

      {clientes.length ? (
        <div className="relative overflow-x-auto rounded-tarjeta border border-linea bg-white">
          <table className="w-full min-w-[60rem] text-left text-sm">
            <thead className="bg-papel text-gris">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Empresa</th>
                <th scope="col" className="px-4 py-3 font-semibold">Contacto</th>
                <th scope="col" className="px-4 py-3 font-semibold">Alta</th>
                <th scope="col" className="px-4 py-3 font-semibold">Constancia</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Personas</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Pedidos pagados</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Ha pagado</th>
                <th scope="col" className="px-4 py-3 font-semibold">Último pedido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linea">
              {clientes.map((c) => (
                <tr key={c.id}>
                  <th scope="row" className="px-4 py-3">
                    <Link href={`${RUTA_ADMIN}/clientes/${c.id}`} className="font-semibold text-rojo underline underline-offset-4">
                      {c.nombre}
                    </Link>
                    {c.rfc ? <span className="block text-xs font-normal text-gris">{c.rfc}</span> : null}
                  </th>
                  <td className="px-4 py-3">
                    {c.contacto ? (
                      <>
                        {c.contacto.nombre ? <span className="block">{c.contacto.nombre}</span> : null}
                        <span className="block break-all text-gris">{c.contacto.correo || "Sin correo"}</span>
                      </>
                    ) : (
                      <span className="text-gris">Sin usuarios</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gris">{fechaCorta(c.alta)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{c.constancia}</td>
                  <td className="px-4 py-3 text-right">{c.activos.toLocaleString("es-MX")}</td>
                  <td className="px-4 py-3 text-right">{c.pagados.toLocaleString("es-MX")}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">{c.pagados ? pesos(c.total) : "Nada"}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gris">{c.ultimoPedido ? fechaCorta(c.ultimoPedido) : "Ninguno"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-tarjeta border border-dashed border-linea bg-white p-8 text-center font-semibold">
          {todos.length ? "Ningún cliente coincide con esa búsqueda." : "Todavía no hay empresas registradas."}
        </p>
      )}
    </div>
  );
}
