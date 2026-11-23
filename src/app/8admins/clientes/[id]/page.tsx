import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bloque } from "@/components/cuenta/Entrada";
import { EstadoPedido } from "@/components/cuenta/EstadoPedido";
import { cobrado, cuentas, fechaCorta, nombreConstancia } from "@/lib/admin/clientes";
import { RUTA_ADMIN } from "@/lib/admin/ruta";
import { requerirAdmin } from "@/lib/admin/sesion";
import { roles } from "@/lib/cuenta/roles";
import type { Rol } from "@/lib/cuenta/sesion";
import { esMetodoPago, fechaHora, metodosPago } from "@/lib/pedidos/reglas";
import { pesos } from "@/lib/precios";

export const metadata: Metadata = { title: "Cliente" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const esRol = (v: string): v is Rol => v in roles;

function Dato({ nombre, children }: { nombre: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-gris">{nombre}</dt>
      <dd className="font-semibold">{children}</dd>
    </div>
  );
}

export default async function Cliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { servicio } = await requerirAdmin();
  if (!servicio) notFound();

  const { data: empresa } = await servicio.from("empresas").select("id, nombre, giro, creado_en").eq("id", id).maybeSingle();
  if (!empresa) notFound();
  const [miembros, fiscales, direcciones, constancia, activos, disenos, listos, pedidos, personas] = await Promise.all([
    servicio.from("miembros").select("usuario_id, rol, creado_en").eq("empresa_id", id).order("creado_en"),
    servicio.from("datos_fiscales").select("id, rfc, razon_social, regimen_fiscal, cp_fiscal, correo, predeterminado").eq("empresa_id", id).order("predeterminado", { ascending: false }),
    servicio.from("direcciones").select("id, alias, destinatario, calle, colonia, ciudad, estado, cp, telefono, predeterminada").eq("empresa_id", id).order("predeterminada", { ascending: false }),
    servicio.from("constancias").select("estado, fecha_emision, creado_en").eq("empresa_id", id).order("creado_en", { ascending: false }).limit(1).maybeSingle(),
    servicio.from("empleados").select("id", { count: "exact", head: true }).eq("empresa_id", id).eq("estatus", "activo"),
    servicio.from("disenos").select("id", { count: "exact", head: true }).eq("empresa_id", id),
    servicio.from("gafetes_listos").select("id", { count: "exact", head: true }).eq("empresa_id", id),
    servicio
      .from("pedidos")
      .select("id, folio, estado, piezas, total, metodo, creado_en, pagado_en")
      .eq("empresa_id", id)
      .order("creado_en", { ascending: false })
      .limit(500),
    cuentas(servicio),
  ]);
  const usuarios = miembros.data ?? [];
  const { data: perfiles } = usuarios.length
    ? await servicio.from("perfiles").select("id, nombre, telefono, publicidad").in("id", usuarios.map((m) => m.usuario_id))
    : { data: [] };
  const perfilDe = new Map((perfiles ?? []).map((p) => [p.id, p]));

  const lista = pedidos.data ?? [];
  const pagados = lista.filter(cobrado);
  const total = pagados.reduce((s, p) => s + Number(p.total), 0);
  const gafetes = pagados.reduce((s, p) => s + p.piezas, 0);
  const paraImprimir = (disenos.count ?? 0) + (listos.count ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div>
        <Link href={`${RUTA_ADMIN}/clientes`} className="text-sm underline">
          Todos los clientes
        </Link>
        <h1 className="mt-2 text-3xl font-extrabold">{empresa.nombre}</h1>
        <p className="mt-1 text-gris">
          {empresa.giro ? `${empresa.giro} · ` : ""}Cliente desde el {fechaCorta(empresa.creado_en)}
        </p>
      </div>

      <Bloque>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
          <Dato nombre="Ha pagado">{pagados.length ? pesos(total) : "Nada todavía"}</Dato>
          <Dato nombre="Pedidos pagados">{pagados.length.toLocaleString("es-MX")}</Dato>
          <Dato nombre="Gafetes comprados">{gafetes.toLocaleString("es-MX")}</Dato>
          <Dato nombre="Pedido promedio">{pagados.length ? pesos(total / pagados.length) : "Sin pedidos"}</Dato>
          <Dato nombre="Personas activas">{(activos.count ?? 0).toLocaleString("es-MX")}</Dato>
          <Dato nombre="Constancia">{nombreConstancia(constancia.data?.estado)}</Dato>
        </dl>
        {paraImprimir ? (
          <p className="mt-4 text-sm">
            <Link href={`${RUTA_ADMIN}/imprimir/${empresa.id}`} className="font-semibold text-rojo underline underline-offset-4">
              Abrir el PDF de impresión de esta empresa
            </Link>
          </p>
        ) : null}
      </Bloque>

      <Bloque titulo="Pedidos">
        {lista.length ? (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="text-gris">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-semibold">Pedido</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Hecho</th>
                  <th scope="col" className="py-2 pr-4 text-right font-semibold">Gafetes</th>
                  <th scope="col" className="py-2 pr-4 text-right font-semibold">Total</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Pago</th>
                  <th scope="col" className="py-2 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-linea">
                {lista.map((p) => (
                  <tr key={p.id}>
                    <th scope="row" className="py-2.5 pr-4">
                      <Link href={`${RUTA_ADMIN}/pedidos/${p.id}`} className="font-semibold text-rojo underline underline-offset-4">
                        {p.folio}
                      </Link>
                    </th>
                    <td className="py-2.5 pr-4 whitespace-nowrap text-gris">{fechaHora(p.creado_en)}</td>
                    <td className="py-2.5 pr-4 text-right">{p.piezas.toLocaleString("es-MX")}</td>
                    <td className="py-2.5 pr-4 text-right whitespace-nowrap">{pesos(Number(p.total))}</td>
                    <td className="py-2.5 pr-4 whitespace-nowrap">{esMetodoPago(p.metodo) ? metodosPago[p.metodo] : "Sin elegir"}</td>
                    <td className="py-2.5">
                      <EstadoPedido valor={p.estado} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gris">Esta empresa todavía no hace ningún pedido.</p>
        )}
      </Bloque>

      <Bloque titulo="Usuarios de la cuenta">
        {usuarios.length ? (
          <ul className="divide-y divide-linea">
            {usuarios.map((m) => {
              const cuenta = personas.get(m.usuario_id);
              const perfil = perfilDe.get(m.usuario_id);
              return (
                <li key={m.usuario_id} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{perfil?.nombre || "Sin nombre"}</p>
                    <p className="text-sm break-all">
                      {cuenta?.correo ? (
                        <a href={`mailto:${cuenta.correo}`} className="underline">
                          {cuenta.correo}
                        </a>
                      ) : (
                        "Sin correo"
                      )}
                      {perfil?.telefono ? ` · ${perfil.telefono}` : ""}
                    </p>
                  </div>
                  <p className="text-sm text-gris">
                    {esRol(m.rol) ? roles[m.rol].nombre : m.rol}
                    {cuenta?.ultimoAcceso ? ` · Entró por última vez el ${fechaCorta(cuenta.ultimoAcceso)}` : " · Nunca ha entrado"}
                    {perfil?.publicidad ? " · Acepta publicidad" : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-gris">La cuenta no tiene usuarios.</p>
        )}
      </Bloque>

      <div className="grid gap-6 lg:grid-cols-2">
        <Bloque titulo="Datos de facturación">
          {fiscales.data?.length ? (
            <ul className="space-y-3 text-sm">
              {fiscales.data.map((f) => (
                <li key={f.id}>
                  <p className="font-semibold">
                    {f.razon_social} · {f.rfc}
                  </p>
                  <p className="text-gris">
                    Régimen {f.regimen_fiscal} · C.P. {f.cp_fiscal} · {f.correo}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gris">No ha capturado datos de facturación.</p>
          )}
        </Bloque>
        <Bloque titulo="Direcciones de envío">
          {direcciones.data?.length ? (
            <ul className="space-y-3 text-sm">
              {direcciones.data.map((d) => (
                <li key={d.id}>
                  <p className="font-semibold">
                    {d.alias ? `${d.alias} · ` : ""}
                    {d.destinatario}
                  </p>
                  <p className="text-gris">
                    {d.calle}, {d.colonia}, {d.ciudad}, {d.estado}, C.P. {d.cp} · {d.telefono}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gris">No ha capturado direcciones de envío.</p>
          )}
        </Bloque>
      </div>
    </div>
  );
}
