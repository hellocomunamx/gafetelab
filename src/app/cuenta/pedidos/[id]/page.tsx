import type { Metadata } from "next";
import { etiquetaMotivo } from "@/lib/pedidos/predeterminados";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cancelarPedido, pagarPedido } from "@/app/cuenta/pedidos/acciones";
import { Confirmar } from "@/components/cuenta/Confirmar";
import { Bloque } from "@/components/cuenta/Entrada";
import { EstadoPedido } from "@/components/cuenta/EstadoPedido";
import { FacturaDelPedido } from "@/components/cuenta/FacturaDelPedido";
import { claseBoton, claseBotonSecundario } from "@/components/cuenta/clases";
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
import { articulosDe, cobrarAutorizados, conceptosDe } from "@/lib/pedidos/servidor";
import { pesos } from "@/lib/precios";
import { entregaTexto } from "@/lib/site";
import { clienteServicio } from "@/lib/supabase/publico";

export const metadata: Metadata = { title: "Pedido" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLUMNAS =
  "id, folio, tipo, modalidad, conceptos, articulos, gafetes_de_saldo, envio_de_saldo, estado, material, dos_caras, piezas, fuente, por_pieza, subtotal, envio, iva, total, direccion, facturacion, solo_transferencia, metodo, ficha_url, gracia_hasta, paqueteria, guia, pagado_en, produccion_en, enviado_en, entregado_en, cancelado_en, creado_en";
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
    supabase.from("gafetes").select("id, empleado_id, tipo, estado, motivo, razon, datos").eq("pedido_id", id).eq("empresa_id", empresa.id).limit(5000),
  ]);
  if (!pedido) notFound();

  const estado: Estado = esEstadoPedido(pedido.estado) ? pedido.estado : "por_pagar";
  const regreso = (await searchParams).pago;
  const direccion = pedido.direccion as DireccionCopiada | null;
  const facturacion = pedido.facturacion as FacturacionCopiada | null;
  const material = pedido.material ? materialPara(pedido.material as Parameters<typeof materialPara>[0]) : null;
  const soloDigital = pedido.modalidad === "digital";
  const conDigital = pedido.modalidad !== "impreso" && pedido.tipo !== "prepago";
  const digitalesActivos = (gafetes ?? []).filter((g) => g.tipo === "digital" && g.estado === "activo").length;
  // Una fila por persona: con impreso + digital, cada persona tiene dos gafetes en el pedido.
  const personas = (gafetes ?? [])
    .filter((g) => g.tipo === (soloDigital ? "digital" : "impreso"))
    .map((g) => ({ id: g.id, empleado: g.empleado_id, motivo: g.motivo, razon: g.razon, ...(g.datos as unknown as GafeteCopiado) }))
    .sort((a, b) => (a.nombre ?? "").localeCompare(b.nombre ?? "", "es"));
  const prepago = pedido.tipo === "prepago";
  const conceptos = conceptosDe(pedido);
  const articulos = articulosDe(pedido);
  const nombre = prepago ? "Compra" : "Pedido";
  // Las compras del carrito no se producen: al pagarse, su contenido queda en el saldo.
  const textoEstado: Partial<Record<Estado, string>> = prepago
    ? {
        por_pagar: "Tu compra está guardada. En cuanto se confirme el pago, tus gafetes quedan en tu saldo prepagado.",
        pagado: "¡Listo! Tus gafetes ya están en tu saldo prepagado. Úsalos cuando quieras al hacer un pedido.",
        autorizado: "Tu tarjeta ya autorizó el pago. Todavía puedes cancelar sin costo; después se hace el cargo y tus gafetes quedan en tu saldo.",
      }
    : soloDigital
      ? {
          por_pagar: "Tu pedido está guardado. Los gafetes digitales se activan en cuanto se confirme el pago.",
          autorizado: "Tu tarjeta ya autorizó el pago. Todavía puedes cancelar sin costo; después se hace el cargo y se activan tus gafetes digitales.",
          pagado: "Recibimos tu pago. Revisamos tu pedido antes de activar los gafetes digitales; normalmente tarda menos de un día hábil.",
          entregado: "Tus gafetes digitales ya están activos en el celular de cada persona.",
        }
      : {};
  // Un pedido solo digital no se produce ni se envía: se activa.
  const pasos: readonly Estado[] = soloDigital ? ["por_pagar", "pagado", "entregado"] : pasosPedido;
  const enGracia = estado === "autorizado" && sigueEnGracia(pedido.gracia_hasta);
  const cerrado = estado === "cancelado" || estado === "reembolsado";
  // Pasos ya cumplidos: hacer el pedido cuenta como el primero.
  const cumplidos = pasos.indexOf(estado === "pago_en_proceso" || estado === "autorizado" ? "por_pagar" : estado) + 1;
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
        <h1 className="text-3xl font-extrabold">
          {nombre} {pedido.folio}
        </h1>
        <EstadoPedido valor={estado} />
      </div>

      {regreso === "saldo" && estado === "pagado" ? (
        <p role="status" className="rounded-tarjeta bg-resaltador/30 p-4 text-sm">
          <strong>¡Listo! Tu pedido salió completo de tu saldo prepagado.</strong> No hay nada que pagar:{" "}
          {soloDigital ? "lo revisamos y activamos tus gafetes digitales." : "lo revisamos y lo mandamos a producción."}
        </p>
      ) : regreso === "error" ? (
        <p role="alert" className="rounded-tarjeta bg-resaltador/30 p-4 text-sm">
          <strong>Tu {nombre.toLowerCase()} quedó guardad{prepago ? "a" : "o"}, pero no pudimos abrir la página de pago.</strong> Intenta de nuevo con el botón de pagar. Si sigue
          fallando, escríbenos desde <Link href="/contacto" className="font-semibold underline underline-offset-4">contacto</Link>.
        </p>
      ) : regreso === "listo" && estado === "por_pagar" ? (
        <p role="status" className="rounded-tarjeta bg-resaltador/30 p-4 text-sm">
          <strong>Estamos confirmando tu pago.</strong> Suele tardar unos segundos. Vuelve a cargar esta página en un momento.
        </p>
      ) : null}

      <section className="rounded-tarjeta border border-linea bg-white p-5 sm:p-6">
        <p className="font-semibold">{textoEstado[estado] ?? estadosPedido[estado].texto}</p>

        {estado === "por_pagar" ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-gris">
              {pedido.solo_transferencia
                ? `Por su tamaño, ${prepago ? "esta compra" : "este pedido"} se paga por transferencia (SPEI).`
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
                <Confirmar
                  accion={cancelarPedido}
                  id={pedido.id}
                  texto={prepago ? "Cancelar compra" : "Cancelar pedido"}
                  confirmar={prepago ? "Sí, cancelar esta compra" : "Sí, cancelar este pedido"}
                >
                  {prepago ? "La compra se cancela y no se cobra nada." : "El pedido se cancela y no se cobra nada. Si usaba tu saldo, regresa a tu saldo."}
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

        {prepago && estado === "pagado" ? (
          <div className="mt-5 text-sm">
            <p className="font-semibold">Qué sigue</p>
            <ol className="mt-2 grid gap-2 sm:grid-cols-3">
              {[
                { href: "/cuenta/equipo/importar", texto: "Sube a tu equipo", detalle: "Con Excel, una por una o con la liga para que cada quien llene sus datos." },
                { href: "/cuenta/disenos/nuevo", texto: "Crea tu diseño", detalle: "O sube tus gafetes ya terminados." },
                { href: "/cuenta/pedidos/nuevo", texto: "Haz tu pedido", detalle: "Elige a quiénes; los gafetes salen de tu saldo." },
              ].map((x, i) => (
                <li key={x.href} className="rounded-tarjeta-chica border border-linea p-3">
                  <Link href={x.href} className="font-semibold text-rojo underline underline-offset-4">
                    {i + 1}. {x.texto}
                  </Link>
                  <span className="mt-1 block text-gris">{x.detalle}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
        {cerrado || prepago ? null : (
          <ol className={`mt-5 grid gap-2 text-sm ${soloDigital ? "sm:grid-cols-3" : "sm:grid-cols-5"}`}>
            {pasos.map((paso, i) => {
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
                    {paso === "por_pagar" ? "Pedido hecho" : soloDigital && paso === "entregado" ? "Activos" : estadosPedido[paso].nombre}
                  </span>
                  {fecha ? <span className="block text-xs text-gris">{fechaHora(fecha)}</span> : null}
                </li>
              );
            })}
          </ol>
        )}
        {!prepago && !soloDigital && (estado === "pagado" || estado === "en_produccion") ? (
          <p className="mt-3 text-sm text-gris">La entrega es en {entregaTexto}, contados desde que se confirmó tu pago.</p>
        ) : null}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Bloque titulo="Resumen">
          <dl className="space-y-2 text-sm">
            {prepago ? (
              articulos.map((a, i) => (
                <div key={i} className="flex justify-between gap-3">
                  <dt>
                    {a.nombre}
                    {a.detalle.map((d) => (
                      <span key={d} className="block text-gris">{d}</span>
                    ))}
                  </dt>
                  <dd className="font-semibold">{pesos(a.subtotal)}</dd>
                </div>
              ))
            ) : conceptos ? (
              conceptos.map((x) => (
                <div key={x.nombre} className="flex justify-between gap-3">
                  <dt>
                    {x.nombre}
                    <span className="block text-gris">
                      {x.cantidad.toLocaleString("es-MX")} × {x.precio ? pesos(x.precio) : "ya pagados"}
                      {x.precio && material ? ` · ${pedido.dos_caras ? "Frente y vuelta" : "Una cara"}, ${material.nombre}` : ""}
                    </span>
                  </dt>
                  <dd className="font-semibold">{pesos(x.cantidad * x.precio)}</dd>
                </div>
              ))
            ) : (
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
            )}
            {prepago || soloDigital ? null : (
              <div className="flex justify-between gap-3">
                <dt>Envío</dt>
                <dd>{Number(pedido.envio) ? pesos(Number(pedido.envio)) : pedido.envio_de_saldo ? "De tu saldo" : "Gratis"}</dd>
              </div>
            )}
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
            {prepago ? "Compra hecha" : "Pedido hecho"} el {fechaLarga(pedido.creado_en)}
            {esMetodoPago(pedido.metodo) ? `. Forma de pago: ${metodosPagoEnFrase[pedido.metodo]}` : ""}.
          </p>
        </Bloque>

        <Bloque titulo={prepago || soloDigital ? "Factura" : "Envío y factura"}>
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

      {conDigital ? (
        <Bloque titulo="Gafetes digitales">
          <p className="text-sm">
            {digitalesActivos
              ? `${digitalesActivos.toLocaleString("es-MX")} ${digitalesActivos === 1 ? "gafete digital activo" : "gafetes digitales activos"}. Cada persona lo abre en su celular con su liga personal y lo puede guardar en su pantalla de inicio.`
              : cerrado
                ? "Los gafetes digitales de este pedido no se activaron."
                : "Se activan en cuanto se confirme el pago."}
          </p>
          {digitalesActivos ? (
            <p className="mt-2 text-sm text-gris">
              A quienes tienen correo les mandamos su liga al activarse. A los demás mándasela desde{" "}
              <Link href="/cuenta/equipo/ligas" className="font-semibold text-rojo underline underline-offset-4">
                Ligas
              </Link>
              , por WhatsApp o copiándola. Si cambian sus datos, su gafete digital se actualiza solo.
            </p>
          ) : null}
        </Bloque>
      ) : null}

      {personas.length ? (
      <Bloque titulo={`${personas.length === 1 ? "1 gafete" : `${personas.length.toLocaleString("es-MX")} gafetes`} en este pedido`}>
        <ul className="max-h-80 divide-y divide-linea overflow-y-auto text-sm">
          {personas.map((p) => (
            <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-x-3 py-2">
              <Link href={`/cuenta/equipo/${p.empleado}`} className="font-semibold hover:underline">
                {p.nombre}
              </Link>
              <span className="text-gris">
                {[p.numero, etiquetaMotivo(p.motivo, p.razon)].filter(Boolean).join(" · ")}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-gris">
          {soloDigital
            ? "Usan el diseño que aprobaste en este pedido, con los datos y la foto vigentes de cada persona."
            : "Se imprimen con los datos y el diseño que tenían cuando hiciste el pedido. Los cambios posteriores no lo modifican."}
        </p>
      </Bloque>
      ) : null}
    </div>
  );
}
