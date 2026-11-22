import type { Metadata } from "next";
import Link from "next/link";
import { Bloque } from "@/components/cuenta/Entrada";
import { EstadoPedido } from "@/components/cuenta/EstadoPedido";
import { cargarClientes, cuentas, fechaCorta, haceCuanto, pasoPendiente } from "@/lib/admin/clientes";
import { RUTA_ADMIN } from "@/lib/admin/ruta";
import { requerirAdmin } from "@/lib/admin/sesion";
import { pesos } from "@/lib/precios";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Abandonos" };

const escribir = (correo: string, asunto: string) => `mailto:${correo}?subject=${encodeURIComponent(asunto)}`;
const liga = "font-semibold text-rojo underline underline-offset-4";

export default async function Abandonos() {
  const { supabase, servicio } = await requerirAdmin();
  if (!servicio) {
    return (
      <p role="alert" className="rounded-tarjeta border border-rojo/30 bg-white p-4 text-sm">
        Falta configurar <code>SUPABASE_SECRET_KEY</code> en el servidor para ver los abandonos.
      </p>
    );
  }
  const [clientes, { data: pedidos }, { data: miembros }, { data: perfiles }] = await Promise.all([
    cargarClientes(servicio, supabase),
    servicio
      .from("pedidos")
      .select("id, folio, empresa_id, creado_por, estado, piezas, total, creado_en")
      .in("estado", ["por_pagar", "pago_en_proceso"])
      .order("creado_en", { ascending: false })
      .limit(500),
    servicio.from("miembros").select("usuario_id").limit(20000),
    servicio.from("perfiles").select("id, nombre").limit(20000),
  ]);
  const clienteDe = new Map(clientes.map((c) => [c.id, c]));
  const sinPagar = pedidos ?? [];
  const totalSinPagar = sinPagar.reduce((s, p) => s + Number(p.total), 0);

  const aMedias = clientes
    .map((c) => ({ c, paso: pasoPendiente(c) }))
    .filter((x): x is { c: (typeof clientes)[number]; paso: NonNullable<ReturnType<typeof pasoPendiente>> } => x.paso !== null && x.paso.orden > 1)
    .sort((a, b) => a.paso.orden - b.paso.orden || b.c.alta.localeCompare(a.c.alta));

  // Personas que abrieron su cuenta y nunca registraron ni se unieron a una empresa.
  const personas = await cuentas(servicio);
  const conEmpresa = new Set((miembros ?? []).map((m) => m.usuario_id));
  const nombreDe = new Map((perfiles ?? []).map((p) => [p.id, p.nombre]));
  const sinEmpresa = [...personas.values()]
    .filter((p) => !conEmpresa.has(p.id) && p.correo)
    .sort((a, b) => b.creada.localeCompare(a.creada));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">Abandonos</h1>
        <p className="mt-1 text-gris">Quién empezó y no terminó, para que les escribas a tiempo.</p>
      </div>

      <Bloque titulo={sinPagar.length ? `Pedidos sin pagar: ${sinPagar.length} (${pesos(totalSinPagar)})` : "Pedidos sin pagar"}>
        {sinPagar.length ? (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="text-gris">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-semibold">Pedido</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Empresa</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Lo hizo</th>
                  <th scope="col" className="py-2 pr-4 text-right font-semibold">Total</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Estado</th>
                  <th scope="col" className="py-2 font-semibold">Contacto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-linea">
                {sinPagar.map((p) => {
                  const cliente = clienteDe.get(p.empresa_id);
                  const correo = (p.creado_por && personas.get(p.creado_por)?.correo) || cliente?.contacto?.correo || "";
                  return (
                    <tr key={p.id}>
                      <th scope="row" className="py-2.5 pr-4">
                        <Link href={`${RUTA_ADMIN}/pedidos/${p.id}`} className={liga}>
                          {p.folio}
                        </Link>
                      </th>
                      <td className="py-2.5 pr-4">
                        <Link href={`${RUTA_ADMIN}/clientes/${p.empresa_id}`} className="underline underline-offset-4">
                          {cliente?.nombre ?? "Empresa"}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-4 whitespace-nowrap text-gris">{haceCuanto(p.creado_en)}</td>
                      <td className="py-2.5 pr-4 text-right whitespace-nowrap tabular-nums">{pesos(Number(p.total))}</td>
                      <td className="py-2.5 pr-4">
                        <EstadoPedido valor={p.estado} />
                      </td>
                      <td className="py-2.5 break-all">
                        {correo ? (
                          <a href={escribir(correo, `Tu pedido ${p.folio} en ${site.nombre}`)} className="underline underline-offset-4">
                            {correo}
                          </a>
                        ) : (
                          <span className="text-gris">Sin correo</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gris">Ningún pedido está esperando pago.</p>
        )}
      </Bloque>

      <Bloque titulo={aMedias.length ? `Empresas a medio camino: ${aMedias.length}` : "Empresas a medio camino"}>
        {aMedias.length ? (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="text-gris">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-semibold">Empresa</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">En qué se quedó</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Alta</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Entró por última vez</th>
                  <th scope="col" className="py-2 font-semibold">Contacto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-linea">
                {aMedias.map(({ c, paso }) => (
                  <tr key={c.id}>
                    <th scope="row" className="py-2.5 pr-4">
                      <Link href={`${RUTA_ADMIN}/clientes/${c.id}`} className={liga}>
                        {c.nombre}
                      </Link>
                    </th>
                    <td className="py-2.5 pr-4">
                      {paso.orden === 2 ? (
                        <Link href={RUTA_ADMIN} className="underline underline-offset-4">
                          {paso.falta}
                        </Link>
                      ) : (
                        paso.falta
                      )}
                    </td>
                    <td className="py-2.5 pr-4 whitespace-nowrap text-gris">{fechaCorta(c.alta)}</td>
                    <td className="py-2.5 pr-4 whitespace-nowrap text-gris">{c.ultimoAcceso ? haceCuanto(c.ultimoAcceso) : "Nunca"}</td>
                    <td className="py-2.5 break-all">
                      {c.contacto?.correo ? (
                        <a href={escribir(c.contacto.correo, `Tu cuenta de ${c.nombre} en ${site.nombre}`)} className="underline underline-offset-4">
                          {c.contacto.correo}
                        </a>
                      ) : (
                        <span className="text-gris">Sin correo</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gris">Todas las empresas registradas ya compraron o tienen un pedido en curso.</p>
        )}
      </Bloque>

      <Bloque titulo={sinEmpresa.length ? `Cuentas sin empresa: ${sinEmpresa.length}` : "Cuentas sin empresa"}>
        {sinEmpresa.length ? (
          <ul className="divide-y divide-linea text-sm">
            {sinEmpresa.slice(0, 200).map((p) => (
              <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-2.5">
                <span className="min-w-0 break-all">
                  {nombreDe.get(p.id) ? `${nombreDe.get(p.id)} · ` : ""}
                  <a href={escribir(p.correo, `Tu cuenta en ${site.nombre}`)} className="underline underline-offset-4">
                    {p.correo}
                  </a>
                </span>
                <span className="text-gris">
                  Abrió su cuenta el {fechaCorta(p.creada)} · {p.ultimoAcceso ? `entró ${haceCuanto(p.ultimoAcceso)}` : "nunca ha entrado"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gris">Todas las personas con cuenta ya están en una empresa.</p>
        )}
        <p className="mt-3 text-sm text-gris">
          Son personas que abrieron su cuenta y no registraron su empresa. Si las invitaron a una, aparecen aquí hasta que acepten.
        </p>
      </Bloque>
    </div>
  );
}
