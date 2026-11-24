import type { Metadata } from "next";
import { etiquetaMotivo } from "@/lib/pedidos/predeterminados";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Confirmar } from "@/components/cuenta/Confirmar";
import { Bloque } from "@/components/cuenta/Entrada";
import { EstadoPedido } from "@/components/cuenta/EstadoPedido";
import { claseBoton, claseBotonSecundario, claseEntrada } from "@/components/cuenta/clases";
import { FacturaAdmin } from "@/components/admin/FacturaAdmin";
import { RUTA_ADMIN } from "@/lib/admin/ruta";
import { requerirAdmin } from "@/lib/admin/sesion";
import { nombreMetodo } from "@/lib/cuenta/constancia";
import { eventosFactura } from "@/lib/facturas";
import { materialPara } from "@/lib/materiales";
import { nombreColor } from "@/lib/eventos";
import {
  type DireccionCopiada,
  type FacturacionCopiada,
  fechaHora,
  type GafeteCopiado,
  esMetodoPago,
  metodosPagoEnFrase,
  pago,
  requiereRevision,
  sigueEnGracia,
} from "@/lib/pedidos/reglas";
import { aprobacionDe, cobrarAutorizados, articulosDe, conceptosDe } from "@/lib/pedidos/servidor";
import { type Modalidad, nombreModalidad, pesos } from "@/lib/precios";
import { EnvioEnvia } from "./EnvioEnvia";
import { avisarListoPedido, cancelarPedidoAdmin, entregarPedido, enviarPedido, guardarNotas, producirPedido, revisarPedido } from "../acciones";

export const metadata: Metadata = { title: "Pedido" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Cómo se lee cada anotación de la bitácora. */
const EVENTOS: Record<string, string> = {
  creado: "La empresa hizo el pedido",
  cobro_abierto: "Se abrió la página de pago",
  pago_en_proceso: "Se generó la ficha o los datos de transferencia",
  autorizado: "La tarjeta autorizó el pago; empezaron los minutos de gracia",
  pagado: "Stripe confirmó el pago",
  pago_tras_cancelar: "Llegó el pago de un pedido que estaba cancelado",
  pago_no_llego: "La ficha venció o la transferencia no llegó",
  pago_rechazado: "El banco rechazó un intento de pago",
  autorizacion_vencida: "La autorización de la tarjeta se venció sin cobrarse",
  cobro_fallido: "No se pudo hacer el cargo a la tarjeta",
  importe_distinto: "Stripe avisó de un pago por un importe distinto al del pedido",
  revisado: "Revisaste el pedido",
  en_produccion: "Pasó a producción",
  listo: "Se avisó al cliente que está listo para enviarse",
  guia_generada: "Se generó la guía en Envia",
  enviado: "Se envió",
  entregado: "Se entregó",
  cancelado: "Se canceló",
  reembolsado: "Se devolvió el pago completo",
  reembolso_parcial: "Se devolvió una parte del pago",
  disputa_abierta: "El banco abrió una disputa",
  disputa_cerrada: "Se cerró la disputa",
  saldo_creado: "Los gafetes de la compra quedaron en el saldo de la empresa",
  saldo_liberado: "El saldo que usaba el pedido regresó a la empresa",
  digitales_activos: "Se activaron los gafetes digitales",
};
const PAGADOS = ["pagado", "en_produccion", "enviado", "entregado"];

export default async function Pedido({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cotizar?: string; envia?: string }>;
}) {
  const { id } = await params;
  const { cotizar, envia } = await searchParams;
  if (!UUID.test(id)) notFound();
  const { servicio } = await requerirAdmin();
  if (!servicio) notFound();
  await cobrarAutorizados(servicio, id).catch(() => null);

  const { data: pedido } = await servicio.from("pedidos").select("*").eq("id", id).maybeSingle();
  if (!pedido) notFound();
  const [{ data: empresa }, { data: gafetes }, { data: eventos }, { data: verificada }, { count: retenidos }] = await Promise.all([
    servicio.from("empresas").select("id, nombre").eq("id", pedido.empresa_id).maybeSingle(),
    servicio.from("gafetes").select("id, tipo, motivo, razon, datos").eq("pedido_id", id).limit(5000),
    servicio.from("pedido_eventos").select("id, tipo, detalle, creado_en").eq("pedido_id", id).order("creado_en").limit(500),
    servicio
      .from("constancias")
      .select("metodo, negocio, estado")
      .eq("empresa_id", pedido.empresa_id)
      .order("creado_en", { ascending: false })
      .limit(1)
      .maybeSingle(),
    servicio
      .from("revision_archivos")
      .select("id", { count: "exact", head: true })
      .eq("empresa_id", pedido.empresa_id)
      .eq("estado", "retenido"),
  ]);

  const aprobacion = aprobacionDe(pedido);
  const direccion = pedido.direccion as DireccionCopiada | null;
  const facturacion = pedido.facturacion as FacturacionCopiada | null;
  const material = pedido.material ? materialPara(pedido.material) : null;
  const soloDigital = pedido.modalidad === "digital";
  // Una fila por persona: con impreso + digital, cada persona tiene dos gafetes en el pedido.
  const personas = (gafetes ?? [])
    .filter((g) => g.tipo === (soloDigital ? "digital" : "impreso"))
    .map((g) => ({ id: g.id, motivo: g.motivo, razon: g.razon, ...(g.datos as unknown as GafeteCopiado) }))
    .sort((a, b) => (a.nombre ?? "").localeCompare(b.nombre ?? "", "es"));
  const prepago = pedido.tipo === "prepago";
  const conceptos = conceptosDe(pedido);
  const articulos = articulosDe(pedido);
  const faltaRevisar = requiereRevision(pedido) && !pedido.revisado_en;
  const pagado = PAGADOS.includes(pedido.estado);
  const sinCobrar = ["por_pagar", "pago_en_proceso", "autorizado"].includes(pedido.estado);
  const oculto = <input type="hidden" name="id" value={pedido.id} />;
  const avisadoListo = (eventos ?? []).some((e) => e.tipo === "listo");
  const guiaEnvia = [...(eventos ?? [])].reverse().find((e) => e.tipo === "guia_generada")?.detalle as
    | { etiqueta?: string | null; rastreo?: string | null; costo?: number }
    | undefined;

  return (
    <div className="space-y-5">
      <p className="text-sm">
        <Link href={`${RUTA_ADMIN}/pedidos`} className="underline">Pedidos</Link> / {pedido.folio}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-extrabold">
          {prepago ? "Compra prepagada" : "Pedido"} {pedido.folio}
        </h1>
        <EstadoPedido valor={pedido.estado} />
      </div>
      <p className="text-gris">
        {empresa ? (
          <Link href={`${RUTA_ADMIN}/clientes/${empresa.id}`} className="underline underline-offset-4">
            {empresa.nombre}
          </Link>
        ) : (
          "Empresa"
        )}{" "}
        · {pedido.piezas.toLocaleString("es-MX")} {pedido.piezas === 1 ? "gafete" : "gafetes"}
        {prepago ? "" : ` · ${nombreModalidad(pedido.modalidad as Modalidad)}`} ·{" "}
        {pesos(Number(pedido.total))} con IVA
      </p>
      {retenidos ? (
        <p role="alert" className="rounded-tarjeta border border-rojo/30 bg-white p-4 text-sm">
          Esta empresa tiene {retenidos === 1 ? "1 archivo retenido" : `${retenidos} archivos retenidos`} por la revisión
          automática. Decide en{" "}
          <Link href={`${RUTA_ADMIN}/archivos`} className="font-semibold underline underline-offset-4">
            Archivos
          </Link>{" "}
          antes de imprimir.
        </p>
      ) : null}

      {pedido.disputa === "abierta" ? (
        <p role="alert" className="rounded-tarjeta border border-rojo/30 bg-white p-4 text-sm">
          <strong>Este pago tiene una disputa abierta.</strong> Respóndela en Stripe antes de su fecha límite, con la evidencia de abajo. No
          se puede pasar a producción mientras siga abierta.
        </p>
      ) : null}
      {pedido.alertas.length ? (
        <p role="alert" className="rounded-tarjeta bg-resaltador/30 p-4 text-sm">
          <strong>Revisa antes de producir.</strong> Aquí se menciona: {pedido.alertas.join(", ")}. Confirma que la empresa tiene derecho a
          usar esos nombres.
        </p>
      ) : null}
      {verificada?.estado === "retirada" && ["pagado", "en_produccion"].includes(pedido.estado) ? (
        <p role="alert" className="rounded-tarjeta border border-rojo/40 bg-white p-4 text-sm">
          <strong className="text-rojo-oscuro">Le quitaste la verificación a esta empresa.</strong> Este pedido ya estaba
          pagado: decide si se produce, se cancela o se devuelve antes de seguir.
        </p>
      ) : null}
      {pedido.primer_pedido && pagado ? (
        <p className="rounded-tarjeta bg-resaltador/30 p-4 text-sm">
          <strong>Es el primer pedido de esta empresa.</strong> Revisa que los gafetes correspondan a la empresa que verificó
          {verificada ? ` (${nombreMetodo(verificada.metodo).toLowerCase()}${verificada.negocio ? `: «${verificada.negocio}»` : ""})` : ""} antes
          de producir.
        </p>
      ) : null}

      <Bloque titulo="Qué sigue">
        {pedido.estado === "por_pagar" ? <p className="text-sm">La empresa todavía no paga. No se produce nada hasta que Stripe confirme el pago.</p> : null}
        {pedido.estado === "pago_en_proceso" ? (
          <p className="text-sm">
            La empresa ya tiene su ficha de OXXO o sus datos de transferencia, pero el dinero no ha llegado. No se produce hasta que Stripe
            confirme el pago.
          </p>
        ) : null}
        {pedido.estado === "autorizado" && pedido.gracia_hasta ? (
          <p className="text-sm">
            {sigueEnGracia(pedido.gracia_hasta)
              ? `La tarjeta ya autorizó el pago. La empresa puede cancelar sin costo hasta el ${fechaHora(pedido.gracia_hasta)}; después se hace el cargo (${pago.minutosDeGracia} minutos de gracia).`
              : "Ya pasaron los minutos de gracia y el cargo no se ha podido hacer. Vuelve a cargar la página; si sigue igual, revisa el pago en Stripe."}
          </p>
        ) : null}
        {prepago && pedido.estado === "pagado" ? (
          <p className="text-sm">
            Compra del carrito pagada: sus gafetes y envíos ya están en el saldo de la empresa. No hay nada que producir; se imprimen
            cuando la empresa haga un pedido con su equipo y su diseño.
          </p>
        ) : pedido.estado === "pagado" ? (
          <div className="flex flex-wrap items-center gap-3">
            {faltaRevisar ? (
              <form action={revisarPedido}>
                {oculto}
                <button type="submit" className={claseBoton}>
                  {soloDigital ? "Ya lo revisé, activar los gafetes digitales" : "Ya lo revisé, se puede producir"}
                </button>
              </form>
            ) : pedido.disputa === "abierta" || soloDigital ? null : (
              <form action={producirPedido}>
                {oculto}
                <button type="submit" className={claseBoton}>Pasar a producción</button>
              </form>
            )}
            {soloDigital ? null : (
              <Link href={`${RUTA_ADMIN}/imprimir/${pedido.empresa_id}?pedido=${pedido.id}`} className={claseBotonSecundario}>
                PDF de impresión
              </Link>
            )}
          </div>
        ) : null}
        {pedido.estado === "pagado" && pedido.modalidad === "ambos" && faltaRevisar ? (
          <p className="mt-3 text-sm text-gris">Al marcarlo como revisado también se activan sus gafetes digitales.</p>
        ) : null}
        {pedido.estado === "en_produccion" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Link href={`${RUTA_ADMIN}/imprimir/${pedido.empresa_id}?pedido=${pedido.id}`} className={claseBotonSecundario}>
                PDF de impresión
              </Link>
              {avisadoListo ? (
                <span className="text-sm text-gris">Ya le avisaste al cliente que está listo para enviarse.</span>
              ) : (
                <form action={avisarListoPedido}>
                  {oculto}
                  <button type="submit" className={claseBotonSecundario}>Avisar que está listo para enviarse</button>
                </form>
              )}
            </div>
            <EnvioEnvia
              pedido={pedido}
              empresa={empresa?.nombre ?? null}
              correo={aprobacion.correo ?? null}
              cotizar={cotizar === "1"}
              error={envia ? envia.slice(0, 300) : null}
            />
            <details className="text-sm">
              <summary className="cursor-pointer font-semibold underline underline-offset-4">¿Lo mandaste por fuera de Envia?</summary>
              <form action={enviarPedido} className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                {oculto}
                <label className="block">
                  <span className="text-sm font-semibold">Paquetería</span>
                  <input name="paqueteria" required maxLength={60} placeholder="Por ejemplo: Estafeta" className={claseEntrada} />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold">Número de guía</span>
                  <input name="guia" maxLength={80} className={claseEntrada} />
                </label>
                <button type="submit" className={claseBoton}>Marcar como enviado</button>
              </form>
            </details>
          </div>
        ) : null}
        {pedido.estado === "enviado" ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm">
              Va por <strong>{pedido.paqueteria}</strong>
              {pedido.guia ? `, guía ${pedido.guia}` : ""}.
              {guiaEnvia?.costo ? ` La guía costó ${pesos(Number(guiaEnvia.costo))}.` : ""}
            </p>
            {guiaEnvia?.etiqueta ? (
              <a href={guiaEnvia.etiqueta} target="_blank" rel="noreferrer" className={claseBotonSecundario}>
                Imprimir etiqueta
              </a>
            ) : null}
            {guiaEnvia?.rastreo ? (
              <a href={guiaEnvia.rastreo} target="_blank" rel="noreferrer" className="text-sm underline underline-offset-4">
                Rastreo
              </a>
            ) : null}
            <form action={entregarPedido}>
              {oculto}
              <button type="submit" className={claseBoton}>Marcar como entregado</button>
            </form>
          </div>
        ) : null}
        {pedido.estado === "entregado" ? (
          <p className="text-sm">{soloDigital ? "Gafetes digitales activos. No queda nada por hacer." : "Pedido entregado. No queda nada por hacer."}</p>
        ) : null}
        {pedido.estado === "cancelado" ? <p className="text-sm">Pedido cancelado, sin cobro.</p> : null}
        {pedido.estado === "reembolsado" ? <p className="text-sm">Se devolvió el pago completo desde Stripe.</p> : null}

        {sinCobrar ? (
          <div className="mt-4">
            <Confirmar accion={cancelarPedidoAdmin} id={pedido.id} texto="Cancelar este pedido" confirmar="Sí, cancelarlo">
              {pedido.estado === "autorizado"
                ? "Se suelta la autorización de la tarjeta, sin cargo ni comisión."
                : "Se cierra su página de pago. Si la empresa ya pagó una ficha de OXXO o mandó una transferencia, el dinero llegará de todos modos y te avisaremos."}
            </Confirmar>
          </div>
        ) : pagado ? (
          <p className="mt-4 text-sm text-gris">
            Para devolver el pago, hazlo desde Stripe. Al devolverlo completo, el pedido se marca solo como reembolsado.
          </p>
        ) : null}
      </Bloque>

      <div className="grid gap-5 lg:grid-cols-2">
        <Bloque titulo="Pedido">
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
            ) : (
              <>
                {(conceptos ?? [{ nombre: "Gafetes impresos", cantidad: pedido.piezas, precio: Number(pedido.por_pieza) }]).map((x) => (
                  <div key={x.nombre} className="flex justify-between gap-3">
                    <dt>
                      {x.nombre}
                      <span className="block text-gris">
                        {x.cantidad.toLocaleString("es-MX")} × {x.precio ? pesos(x.precio) : "del saldo prepagado"}
                      </span>
                    </dt>
                    <dd className="font-semibold">{pesos(x.cantidad * x.precio)}</dd>
                  </div>
                ))}
                <p className="text-gris">
                  {soloDigital ? "Solo digital" : pedido.dos_caras ? "Frente y vuelta" : "Una cara"}
                  {material ? `, ${material.nombre}` : ""}
                  {pedido.fuente === "listos" ? ", gafetes que la empresa subió ya terminados" : ""}
                  {(pedido.diseno as { reglas?: Record<string, { nombre: string }> } | null)?.reglas
                    ? `, diseños por reglas (${Object.values((pedido.diseno as { reglas: Record<string, { nombre: string }> }).reglas)
                        .map((d) => d.nombre)
                        .join(", ")})`
                    : ""}
                </p>
                {Array.isArray(pedido.cordones) && pedido.cordones.length ? (
                  <div>
                    <p className="font-semibold">Cordones por color</p>
                    <ul className="mt-1 flex flex-wrap gap-2">
                      {(pedido.cordones as { categoria: string; color: string; piezas: number }[]).map((x) => (
                        <li key={x.categoria} className="inline-flex items-center gap-2 rounded-full border border-linea px-3 py-1">
                          <span aria-hidden className="size-3.5 rounded-full ring-1 ring-linea" style={{ background: x.color }} />
                          {x.piezas.toLocaleString("es-MX")} {nombreColor(x.color).toLocaleLowerCase("es-MX")} ({x.categoria})
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            )}
            {soloDigital ? null : (
              <div className="flex justify-between gap-3">
                <dt>Envío</dt>
                <dd>{Number(pedido.envio) ? pesos(Number(pedido.envio)) : pedido.envio_de_saldo ? "Del saldo prepagado" : prepago ? "Incluido arriba" : "Gratis"}</dd>
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
            Forma de pago:{" "}
            {esMetodoPago(pedido.metodo) ? metodosPagoEnFrase[pedido.metodo] : "sin elegir"}
            {pedido.solo_transferencia ? " (por su tamaño, solo se puede pagar por transferencia)" : ""}.
            {pedido.stripe_pago ? ` Pago en Stripe: ${pedido.stripe_pago}.` : ""}
          </p>
        </Bloque>

        <Bloque titulo="Envío y factura">
          {direccion ? (
            <p className="text-sm">
              <strong>{direccion.destinatario}</strong> · {direccion.telefono}
              <span className="block">
                {direccion.calle}, {direccion.colonia}, {direccion.ciudad}, {direccion.estado}, C.P. {direccion.cp}
              </span>
              {direccion.referencias ? <span className="block text-gris">{direccion.referencias}</span> : null}
            </p>
          ) : null}
          {facturacion ? (
            <p className="mt-3 text-sm">
              <strong>Factura:</strong> {facturacion.razon_social} · {facturacion.rfc}
              <span className="block text-gris">
                Régimen {facturacion.regimen_fiscal} · C.P. {facturacion.cp_fiscal} · Uso {facturacion.uso_cfdi} · {facturacion.correo}
              </span>
            </p>
          ) : (
            <p className="mt-3 text-sm">No pidió factura.</p>
          )}
        </Bloque>
      </div>

      <FacturaAdmin pedidoId={pedido.id} />

      <Bloque titulo="Evidencia para una disputa">
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-gris">Aprobó la vista previa y pidió</dt>
            <dd className="font-semibold">{fechaHora(aprobacion.en)}</dd>
          </div>
          <div>
            <dt className="text-gris">Cuenta que hizo el pedido</dt>
            <dd className="font-semibold">{aprobacion.correo ?? "Sin correo"}</dd>
          </div>
          <div>
            <dt className="text-gris">Términos y aviso de privacidad aceptados</dt>
            <dd className="font-semibold">
              Términos {aprobacion.terminos_version ?? "sin registro"} · Aviso {aprobacion.aviso_version ?? "sin registro"}
            </dd>
          </div>
          <div>
            <dt className="text-gris">Dirección IP</dt>
            <dd className="font-semibold">{aprobacion.ip ?? "Sin registro"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-gris">Navegador</dt>
            <dd className="break-words">{aprobacion.navegador ?? "Sin registro"}</dd>
          </div>
        </dl>
        <p className="mt-3 text-sm text-gris">
          {prepago
            ? "Compra hecha desde el carrito con una cuenta que aceptó los términos vigentes. No lleva vista previa: los gafetes se aprueban al pedirlos."
            : null}
          {prepago ? null : "La empresa marcó la casilla «Revisé la vista previa de mis gafetes y credenciales, los datos son correctos y apruebo que se impriman tal como se ven». Su verificación aprobada, la carta de responsabilidad que aceptó y la guía de envío completan la evidencia."}
        </p>
      </Bloque>

      <div className="grid gap-5 lg:grid-cols-2">
        <Bloque titulo="Bitácora">
          <ol className="space-y-2 text-sm">
            {(eventos ?? []).map((e) => (
              <li key={e.id} className="flex flex-wrap justify-between gap-x-3">
                <span>{EVENTOS[e.tipo] ?? eventosFactura[e.tipo] ?? e.tipo}</span>
                <span className="text-gris">{fechaHora(e.creado_en)}</span>
              </li>
            ))}
          </ol>
        </Bloque>

        <Bloque titulo="Notas internas">
          <form action={guardarNotas} className="space-y-3">
            {oculto}
            <label className="block">
              <span className="sr-only">Notas internas</span>
              <textarea name="notas" rows={5} maxLength={2000} defaultValue={pedido.notas ?? ""} className={claseEntrada} />
            </label>
            <button type="submit" className={claseBotonSecundario}>Guardar notas</button>
          </form>
          <p className="mt-2 text-sm text-gris">Solo las ves tú. La empresa no las ve.</p>
        </Bloque>
      </div>

      {personas.length ? (
      <Bloque titulo={`${personas.length === 1 ? "1 gafete" : `${personas.length.toLocaleString("es-MX")} gafetes`}`}>
        <ul className="max-h-80 divide-y divide-linea overflow-y-auto text-sm">
          {personas.map((p) => (
            <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-x-3 py-2">
              <span className="font-semibold">{p.nombre}</span>
              <span className="text-gris">
                {[p.numero, p.valores?.puesto, etiquetaMotivo(p.motivo, p.razon)].filter(Boolean).join(" · ")}
              </span>
            </li>
          ))}
        </ul>
      </Bloque>
      ) : null}
    </div>
  );
}
