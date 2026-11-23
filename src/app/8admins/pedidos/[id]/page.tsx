import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Confirmar } from "@/components/cuenta/Confirmar";
import { Bloque } from "@/components/cuenta/Entrada";
import { EstadoPedido } from "@/components/cuenta/EstadoPedido";
import { claseBoton, claseBotonSecundario, claseEntrada } from "@/components/cuenta/Formulario";
import { FacturaAdmin } from "@/components/admin/FacturaAdmin";
import { RUTA_ADMIN } from "@/lib/admin/ruta";
import { requerirAdmin } from "@/lib/admin/sesion";
import { eventosFactura } from "@/lib/facturas";
import { materialPara } from "@/lib/materiales";
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
import { aprobacionDe, cobrarAutorizados } from "@/lib/pedidos/servidor";
import { pesos } from "@/lib/precios";
import { cancelarPedidoAdmin, entregarPedido, enviarPedido, guardarNotas, producirPedido, revisarPedido } from "../acciones";

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
  enviado: "Se envió",
  entregado: "Se entregó",
  cancelado: "Se canceló",
  reembolsado: "Se devolvió el pago completo",
  reembolso_parcial: "Se devolvió una parte del pago",
  disputa_abierta: "El banco abrió una disputa",
  disputa_cerrada: "Se cerró la disputa",
};
const PAGADOS = ["pagado", "en_produccion", "enviado", "entregado"];

export default async function Pedido({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { servicio } = await requerirAdmin();
  if (!servicio) notFound();
  await cobrarAutorizados(servicio, id).catch(() => null);

  const { data: pedido } = await servicio.from("pedidos").select("*").eq("id", id).maybeSingle();
  if (!pedido) notFound();
  const [{ data: empresa }, { data: gafetes }, { data: eventos }] = await Promise.all([
    servicio.from("empresas").select("id, nombre").eq("id", pedido.empresa_id).maybeSingle(),
    servicio.from("gafetes").select("id, motivo, datos").eq("pedido_id", id).limit(5000),
    servicio.from("pedido_eventos").select("id, tipo, detalle, creado_en").eq("pedido_id", id).order("creado_en").limit(500),
  ]);

  const aprobacion = aprobacionDe(pedido);
  const direccion = pedido.direccion as DireccionCopiada | null;
  const facturacion = pedido.facturacion as FacturacionCopiada | null;
  const material = pedido.material ? materialPara(pedido.material) : null;
  const personas = (gafetes ?? [])
    .map((g) => ({ id: g.id, motivo: g.motivo, ...(g.datos as unknown as GafeteCopiado) }))
    .sort((a, b) => (a.nombre ?? "").localeCompare(b.nombre ?? "", "es"));
  const faltaRevisar = requiereRevision(pedido) && !pedido.revisado_en;
  const pagado = PAGADOS.includes(pedido.estado);
  const sinCobrar = ["por_pagar", "pago_en_proceso", "autorizado"].includes(pedido.estado);
  const oculto = <input type="hidden" name="id" value={pedido.id} />;

  return (
    <div className="space-y-5">
      <p className="text-sm">
        <Link href={`${RUTA_ADMIN}/pedidos`} className="underline">Pedidos</Link> / {pedido.folio}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-extrabold">Pedido {pedido.folio}</h1>
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
        · {pedido.piezas.toLocaleString("es-MX")} {pedido.piezas === 1 ? "gafete" : "gafetes"} ·{" "}
        {pesos(Number(pedido.total))} con IVA
      </p>

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
      {pedido.primer_pedido && pagado ? (
        <p className="rounded-tarjeta bg-resaltador/30 p-4 text-sm">
          <strong>Es el primer pedido de esta empresa.</strong> Revisa que los gafetes correspondan a la empresa de su constancia antes de
          producir.
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
        {pedido.estado === "pagado" ? (
          <div className="flex flex-wrap items-center gap-3">
            {faltaRevisar ? (
              <form action={revisarPedido}>
                {oculto}
                <button type="submit" className={claseBoton}>Ya lo revisé, se puede producir</button>
              </form>
            ) : pedido.disputa === "abierta" ? null : (
              <form action={producirPedido}>
                {oculto}
                <button type="submit" className={claseBoton}>Pasar a producción</button>
              </form>
            )}
            <Link href={`${RUTA_ADMIN}/imprimir/${pedido.empresa_id}?pedido=${pedido.id}`} className={claseBotonSecundario}>
              PDF de impresión
            </Link>
          </div>
        ) : null}
        {pedido.estado === "en_produccion" ? (
          <div className="space-y-4">
            <Link href={`${RUTA_ADMIN}/imprimir/${pedido.empresa_id}?pedido=${pedido.id}`} className={claseBotonSecundario}>
              PDF de impresión
            </Link>
            <form action={enviarPedido} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
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
          </div>
        ) : null}
        {pedido.estado === "enviado" ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm">
              Va por <strong>{pedido.paqueteria}</strong>
              {pedido.guia ? `, guía ${pedido.guia}` : ""}.
            </p>
            <form action={entregarPedido}>
              {oculto}
              <button type="submit" className={claseBoton}>Marcar como entregado</button>
            </form>
          </div>
        ) : null}
        {pedido.estado === "entregado" ? <p className="text-sm">Pedido entregado. No queda nada por hacer.</p> : null}
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
            <div className="flex justify-between gap-3">
              <dt>
                {pedido.piezas.toLocaleString("es-MX")} × {pesos(Number(pedido.por_pieza))}
                <span className="block text-gris">
                  {pedido.dos_caras ? "Frente y vuelta" : "Una cara"}
                  {material ? `, ${material.nombre}` : ""}
                  {pedido.fuente === "listos" ? ", gafetes que la empresa subió ya terminados" : ""}
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
          La empresa marcó la casilla «Revisé la vista previa de mis gafetes y credenciales, los datos son correctos y apruebo que se
          impriman tal como se ven». Su constancia fiscal aprobada y la guía de envío completan la evidencia.
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

      <Bloque titulo={`${personas.length === 1 ? "1 gafete" : `${personas.length.toLocaleString("es-MX")} gafetes`}`}>
        <ul className="max-h-80 divide-y divide-linea overflow-y-auto text-sm">
          {personas.map((p) => (
            <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-x-3 py-2">
              <span className="font-semibold">{p.nombre}</span>
              <span className="text-gris">
                {[p.numero, p.valores?.puesto, p.motivo === "reposicion" ? "Reposición" : null].filter(Boolean).join(" · ")}
              </span>
            </li>
          ))}
        </ul>
      </Bloque>
    </div>
  );
}
