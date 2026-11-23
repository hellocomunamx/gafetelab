import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cancelarPedido, pagarPedido } from "@/app/cuenta/pedidos/acciones";
import { Confirmar } from "@/components/cuenta/Confirmar";
import { Bloque } from "@/components/cuenta/Entrada";
import { EstadoPedido } from "@/components/cuenta/EstadoPedido";
import { FacturaDelPedido } from "@/components/cuenta/FacturaDelPedido";
import { claseBoton, claseBotonSecundario } from "@/components/cuenta/Formulario";
import { fechaLarga } from "@/lib/cuenta/constancia";
import { requerirEmpresa } from "@/lib/cuenta/sesion";
import { materialPara } from "@/lib/materiales";
import {
  type DireccionCopiada,
  type EstadoPedido as Estado,
  esEstadoPedido,
  estadosPedido,
  type FacturacionCopiada,
  fechaHora,
  type GafeteCopiado,
  esMetodoPago,
  metodosPagoEnFrase,
  pago,
  pasosPedido,
  sigueEnGracia,
} from "@/lib/pedidos/reglas";
import { cobrarAutorizados } from "@/lib/pedidos/servidor";
import { pesos } from "@/lib/precios";
import { entregaTexto } from "@/lib/site";
import { clienteServicio } from "@/lib/supabase/publico";

export const metadata: Metadata = { title: "Pedido" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLUMNAS =
  "id, folio, estado, material, dos_caras, piezas, fuente, por_pieza, subtotal, envio, iva, total, direccion, facturacion, solo_transferencia, metodo, ficha_url, gracia_hasta, paqueteria, guia, pagado_en, produccion_en, enviado_en, entregado_en, cancelado_en, creado_en";
const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit", timeZone: "America/Hermosillo" });

export default async function Pedido({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pago?: string }>;
}) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase, empresa, administra } = await requerirEmpresa();
  // Si ya se le acabaron los minutos de gracia, se cobra antes de mostrarlo.
  const servicio = clienteServicio();
  if (servicio) await cobrarAutorizados(servicio, id).catch(() => null);

  const [{ data: pedido }, { data: gafetes }] = await Promise.all([
    supabase.from("pedidos").select(COLUMNAS).eq("id", id).eq("empresa_id", empresa.id).maybeSingle(),
    supabase.from("gafetes").select("id, empleado_id, motivo, datos").eq("pedido_id", id).eq("empresa_id", empresa.id).limit(5000),
  ]);
  if (!pedido) notFound();

  const estado: Estado = esEstadoPedido(pedido.estado) ? pedido.estado : "por_pagar";
  const regreso = (await searchParams).pago;
  const direccion = pedido.direccion as DireccionCopiada | null;
  const facturacion = pedido.facturacion as FacturacionCopiada | null;
  const material = pedido.material ? materialPara(pedido.material as Parameters<typeof materialPara>[0]) : null;
  const personas = (gafetes ?? [])
    .map((g) => ({ id: g.id, empleado: g.empleado_id, motivo: g.motivo, ...(g.datos as unknown as GafeteCopiado) }))
    .sort((a, b) => (a.nombre ?? "").localeCompare(b.nombre ?? "", "es"));
  const enGracia = estado === "autorizado" && sigueEnGracia(pedido.gracia_hasta);
  const cerrado = estado === "cancelado" || estado === "reembolsado";
  // Pasos ya cumplidos: hacer el pedido cuenta como el primero.
  const cumplidos = pasosPedido.indexOf(estado === "pago_en_proceso" || estado === "autorizado" ? "por_pagar" : estado) + 1;
  const fechas: Partial<Record<Estado, string | null>> = {
    por_pagar: pedido.creado_en,
    pagado: pedido.pagado_en,
    en_produccion: pedido.produccion_en,
    enviado: pedido.enviado_en,
    entregado: pedido.entregado_en,
  };

  return (
    <div className="space-y-5">
      <p className="text-sm">
        <Link href="/cuenta/pedidos" className="underline">Pedidos</Link> / {pedido.folio}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-extrabold">Pedido {pedido.folio}</h1>
        <EstadoPedido valor={estado} />
      </div>

      {regreso === "error" ? (
        <p role="alert" className="rounded-tarjeta bg-resaltador/30 p-4 text-sm">
          <strong>Tu pedido quedó guardado, pero no pudimos abrir la página de pago.</strong> Intenta de nuevo con el botón de pagar. Si sigue
          fallando, escríbenos desde <Link href="/contacto" className="font-semibold underline underline-offset-4">contacto</Link>.
        </p>
      ) : regreso === "listo" && estado === "por_pagar" ? (
        <p role="status" className="rounded-tarjeta bg-resaltador/30 p-4 text-sm">
          <strong>Estamos confirmando tu pago.</strong> Suele tardar unos segundos. Vuelve a cargar esta página en un momento.
        </p>
      ) : null}

      <section className="rounded-tarjeta border border-linea bg-white p-5 sm:p-6">
        <p className="font-semibold">{estadosPedido[estado].texto}</p>

        {estado === "por_pagar" ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-gris">
              {pedido.solo_transferencia
                ? "Por su tamaño, este pedido se paga por transferencia (SPEI)."
                : `Puedes pagar con tarjeta, en efectivo en OXXO o por transferencia (SPEI). Con tarjeta tienes ${pago.minutosDeGracia} minutos para cancelar sin costo.`}
            </p>
            {administra ? (
              <div className="flex flex-wrap items-center gap-4">
                <form action={pagarPedido}>
                  <input type="hidden" name="id" value={pedido.id} />
                  <button type="submit" className={claseBoton}>
                    Pagar {pesos(Number(pedido.total))}
                  </button>
                </form>
                <Confirmar accion={cancelarPedido} id={pedido.id} texto="Cancelar pedido" confirmar="Sí, cancelar este pedido">
                  El pedido se cancela y no se cobra nada.
                </Confirmar>
              </div>
            ) : (
              <p className="text-sm text-gris">Lo paga quien es dueño o administrador de la empresa.</p>
            )}
          </div>
        ) : null}

        {estado === "pago_en_proceso" ? (
          <div className="mt-4 space-y-3 text-sm">
            <p className="text-gris">
              {pedido.metodo === "oxxo"
                ? `Paga tu ficha en cualquier OXXO. Vence a los ${pago.diasFichaOxxo} días; el pago se refleja en unas horas.`
                : "Haz la transferencia con la CLABE y la referencia que te dimos. Normalmente se refleja en minutos."}
            </p>
            {pedido.ficha_url ? (
              <a href={pedido.ficha_url} target="_blank" rel="noopener" className={claseBotonSecundario}>
                {pedido.metodo === "oxxo" ? "Ver mi ficha de OXXO" : "Ver los datos de la transferencia"}
              </a>
            ) : null}
          </div>
        ) : null}

        {estado === "autorizado" && pedido.gracia_hasta ? (
          <div className="mt-4 space-y-3 text-sm">
            {enGracia ? (
              <>
                <p className="text-gris">
                  Tienes hasta las {hora(pedido.gracia_hasta)} para cancelar sin costo. Después se hace el cargo a tu tarjeta y empezamos a
                  producir.
                </p>
                {administra ? (
                  <Confirmar accion={cancelarPedido} id={pedido.id} texto="Cancelar pedido" confirmar="Sí, cancelar este pedido">
                    Se libera el cargo de tu tarjeta y no se cobra nada.
                  </Confirmar>
                ) : null}
              </>
            ) : (
              <p className="text-gris">Estamos haciendo el cargo a tu tarjeta. Vuelve a cargar esta página en un momento.</p>
            )}
          </div>
        ) : null}

        {estado === "enviado" || estado === "entregado" ? (
          <p className="mt-3 text-sm">
            {pedido.paqueteria || pedido.guia ? (
              <>
                Va por <strong>{pedido.paqueteria ?? "paquetería"}</strong>
                {pedido.guia ? (
                  <>
                    , con la guía <strong>{pedido.guia}</strong>
                  </>
                ) : null}
                .
              </>
            ) : null}
          </p>
        ) : null}

        {cerrado ? null : (
          <ol className="mt-5 grid gap-2 text-sm sm:grid-cols-5">
            {pasosPedido.map((paso, i) => {
              const hecho = i < cumplidos;
              const actual = i === cumplidos;
              const fecha = hecho ? fechas[paso] : null;
              return (
                <li
                  key={paso}
                  aria-current={actual ? "step" : undefined}
                  className={`rounded-tarjeta-chica border p-3 ${hecho ? "border-tinta bg-papel" : actual ? "border-rojo" : "border-linea text-gris"}`}
                >
                  <span className="block font-semibold">
                    <span aria-hidden className="mr-1.5">{hecho ? "✓" : "○"}</span>
                    {paso === "por_pagar" ? "Pedido hecho" : estadosPedido[paso].nombre}
                  </span>
                  {fecha ? <span className="block text-xs text-gris">{fechaHora(fecha)}</span> : null}
                </li>
              );
            })}
          </ol>
        )}
        {estado === "pagado" || estado === "en_produccion" ? (
          <p className="mt-3 text-sm text-gris">La entrega es en {entregaTexto}, contados desde que se confirmó tu pago.</p>
        ) : null}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Bloque titulo="Resumen">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt>
                {pedido.piezas.toLocaleString("es-MX")} {pedido.piezas === 1 ? "gafete" : "gafetes"} × {pesos(Number(pedido.por_pieza))}
                <span className="block text-gris">
                  {pedido.dos_caras ? "Frente y vuelta" : "Una cara"}
                  {material ? `, ${material.nombre}` : ""}
                </span>
              </dt>
              <dd className="font-semibold">{pesos(Number(pedido.subtotal))}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Envío</dt>
              <dd>{Number(pedido.envio) ? pesos(Number(pedido.envio)) : "Gratis"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>IVA</dt>
              <dd>{pesos(Number(pedido.iva))}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-t border-linea pt-2">
              <dt className="font-semibold">Total</dt>
              <dd className="font-titulos text-2xl font-extrabold">{pesos(Number(pedido.total))}</dd>
            </div>
          </dl>
          <p className="mt-3 text-sm text-gris">
            Pedido hecho el {fechaLarga(pedido.creado_en)}
            {esMetodoPago(pedido.metodo) ? `. Forma de pago: ${metodosPagoEnFrase[pedido.metodo]}` : ""}.
          </p>
        </Bloque>

        <Bloque titulo="Envío y factura">
          {direccion ? (
            <p className="text-sm">
              <strong>{direccion.destinatario}</strong> · {direccion.telefono}
              <span className="block text-gris">
                {direccion.calle}, {direccion.colonia}, {direccion.ciudad}, {direccion.estado}, C.P. {direccion.cp}
              </span>
              {direccion.referencias ? <span className="block text-gris">{direccion.referencias}</span> : null}
            </p>
          ) : null}
          <FacturaDelPedido pedido={pedido} datos={facturacion} />
        </Bloque>
      </div>

      <Bloque titulo={`${personas.length === 1 ? "1 gafete" : `${personas.length.toLocaleString("es-MX")} gafetes`} en este pedido`}>
        <ul className="max-h-80 divide-y divide-linea overflow-y-auto text-sm">
          {personas.map((p) => (
            <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-x-3 py-2">
              <Link href={`/cuenta/equipo/${p.empleado}`} className="font-semibold hover:underline">
                {p.nombre}
              </Link>
              <span className="text-gris">
                {[p.numero, p.motivo === "reposicion" ? "Reposición" : null].filter(Boolean).join(" · ")}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-gris">
          Se imprimen con los datos y el diseño que tenían cuando hiciste el pedido. Los cambios posteriores no lo modifican.
        </p>
      </Bloque>
    </div>
  );
}
