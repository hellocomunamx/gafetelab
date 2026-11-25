import type { Metadata } from "next";
import Link from "next/link";
import { Copiar } from "@/components/admin/Copiar";
import { Confirmar } from "@/components/cuenta/Confirmar";
import { Bloque } from "@/components/cuenta/Entrada";
import { EstadoPedido } from "@/components/cuenta/EstadoPedido";
import { Formulario, claseEntrada } from "@/components/cuenta/Formulario";
import { RUTA_ADMIN } from "@/lib/admin/ruta";
import { requerirAdmin } from "@/lib/admin/sesion";
import {
  ESTADOS_FACTURABLES,
  cifra,
  conceptosSat,
  dentroDelPlazo,
  estadosFactura,
  esEstadoFactura,
  formaPagoSat,
  nombreRegimen,
  nombreUso,
} from "@/lib/facturas";
import { type FacturacionCopiada, fechaHora } from "@/lib/pedidos/reglas";
import { cancelarFactura, emitirFactura, reabrirFactura } from "./acciones";

export const metadata: Metadata = { title: "Facturas" };

const SIN_PAGAR = ["por_pagar", "pago_en_proceso", "autorizado"];
const DEVUELTOS = ["cancelado", "reembolsado"];
const FILTROS = [
  { id: "emitir", nombre: "Por emitir" },
  { id: "espera", nombre: "Esperando pago" },
  { id: "cancelar", nombre: "Por cancelar en el SAT" },
  { id: "emitidas", nombre: "Emitidas" },
  { id: "global", nombre: "Factura global" },
] as const;
type Filtro = (typeof FILTROS)[number]["id"];

const chip = (activo: boolean) =>
  `rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
    activo ? "border-tinta bg-tinta text-white" : "border-linea bg-white hover:border-tinta"
  }`;

const mes = (iso: string) => {
  const partes = new Intl.DateTimeFormat("es-MX", { year: "numeric", month: "2-digit", timeZone: "America/Hermosillo" }).formatToParts(new Date(iso));
  return `${partes.find((p) => p.type === "year")?.value}-${partes.find((p) => p.type === "month")?.value}`;
};
const nombreMes = (clave: string) =>
  new Date(`${clave}-15T12:00:00-07:00`).toLocaleDateString("es-MX", { month: "long", year: "numeric", timeZone: "America/Hermosillo" });

export default async function Facturas({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const { servicio } = await requerirAdmin();
  if (!servicio) {
    return (
      <p role="alert" className="rounded-tarjeta border border-rojo/30 bg-white p-4 text-sm">
        Falta configurar <code>SUPABASE_SECRET_KEY</code> en el servidor para ver las facturas.
      </p>
    );
  }
  const pedida = (await searchParams).ver;
  const ver: Filtro = FILTROS.find((f) => f.id === pedida)?.id ?? "emitir";

  const [{ data: facturas, error: sinTabla }, { data: pedidos }, { data: empresas }] = await Promise.all([
    servicio.from("facturas").select("*").order("solicitada_en").limit(3000),
    servicio
      .from("pedidos")
      .select("id, folio, empresa_id, estado, piezas, material, dos_caras, conceptos, por_pieza, subtotal, envio, iva, total, metodo, pagado_en, creado_en")
      .not("pagado_en", "is", null)
      .order("pagado_en", { ascending: false })
      .limit(5000),
    servicio.from("empresas").select("id, nombre").limit(5000),
  ]);
  if (sinTabla) {
    return (
      <p role="alert" className="rounded-tarjeta border border-rojo/30 bg-white p-4 text-sm">
        Falta pegar la migración de facturas (<code>20261123080000_facturas.sql</code>) en el editor SQL de Supabase.
      </p>
    );
  }
  // Los pedidos sin pagar que piden factura también se necesitan, para la pestaña «Esperando pago».
  const faltan = (facturas ?? []).map((f) => f.pedido_id).filter((id) => !(pedidos ?? []).some((p) => p.id === id));
  const { data: otros } = faltan.length
    ? await servicio
        .from("pedidos")
        .select("id, folio, empresa_id, estado, piezas, material, dos_caras, conceptos, por_pieza, subtotal, envio, iva, total, metodo, pagado_en, creado_en")
        .in("id", faltan.slice(0, 500))
    : { data: [] };
  const pedidoDe = new Map([...(pedidos ?? []), ...(otros ?? [])].map((p) => [p.id, p]));
  const nombreDe = new Map((empresas ?? []).map((e) => [e.id, e.nombre]));

  const con = (fn: (f: NonNullable<typeof facturas>[number], p: NonNullable<ReturnType<typeof pedidoDe.get>>) => boolean) =>
    (facturas ?? []).flatMap((f) => {
      const p = pedidoDe.get(f.pedido_id);
      return p && fn(f, p) ? [{ factura: f, pedido: p }] : [];
    });
  const grupos = {
    emitir: con((f, p) => f.estado === "por_emitir" && ESTADOS_FACTURABLES.includes(p.estado)),
    espera: con((f, p) => f.estado === "por_emitir" && SIN_PAGAR.includes(p.estado)),
    cancelar: con((f, p) => f.estado === "emitida" && DEVUELTOS.includes(p.estado)),
    emitidas: con((f) => f.estado !== "por_emitir").reverse(),
  };

  // Factura global: lo cobrado que no pidió factura, por mes de pago.
  const conFactura = new Set((facturas ?? []).map((f) => f.pedido_id));
  const sinFactura = (pedidos ?? []).filter((p) => ESTADOS_FACTURABLES.includes(p.estado) && !conFactura.has(p.id));
  const meses = [...new Set(sinFactura.map((p) => mes(p.pagado_en!)))].map((clave) => {
    const lista = sinFactura.filter((p) => mes(p.pagado_en!) === clave);
    const suma = (fn: (p: (typeof lista)[number]) => number) => Math.round(lista.reduce((s, p) => s + fn(p), 0) * 100) / 100;
    return {
      clave,
      lista,
      base: suma((p) => Number(p.subtotal) + Number(p.envio)),
      iva: suma((p) => Number(p.iva)),
      total: suma((p) => Number(p.total)),
      abiertos: lista.filter((p) => dentroDelPlazo(p)).length,
    };
  });
  const cuenta = (id: Filtro) => (id === "global" ? sinFactura.length : grupos[id].length);

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-extrabold">Facturas</h1>
      <p className="max-w-2xl text-gris">
        Mientras facturas a mano en el portal del SAT: copia cada dato con su botón, emite la factura allá y luego súbela aquí. La empresa la
        recibe por correo y la puede descargar desde su pedido.
      </p>
      <nav aria-label="Filtrar facturas" className="flex flex-wrap gap-2">
        {FILTROS.map((x) => (
          <Link key={x.id} href={`${RUTA_ADMIN}/facturas?ver=${x.id}`} aria-current={ver === x.id ? "page" : undefined} className={chip(ver === x.id)}>
            {x.nombre} ({cuenta(x.id)})
          </Link>
        ))}
      </nav>

      {ver === "global" ? (
        meses.length ? (
          <div className="space-y-5">
            <p className="max-w-2xl text-sm text-gris">
              Pedidos cobrados que no pidieron factura. Van en la factura global a «Público en general» (RFC XAXX010101000) de cada mes. El mes
              en curso todavía puede cambiar: sus pedidos pueden pedir factura hasta el último día.
            </p>
            {meses.map((m) => (
              <Bloque key={m.clave} titulo={nombreMes(m.clave)}>
                <dl className="grid gap-x-6 sm:grid-cols-3">
                  <Copiar etiqueta="Importe antes de IVA" valor={cifra(m.base)} />
                  <Copiar etiqueta="IVA 16 %" valor={cifra(m.iva)} />
                  <Copiar etiqueta="Total" valor={cifra(m.total)} />
                </dl>
                <p className="mt-3 text-sm">
                  {m.lista.length === 1 ? "1 pedido" : `${m.lista.length} pedidos`}:{" "}
                  {m.lista.map((p, i) => (
                    <span key={p.id}>
                      {i ? ", " : ""}
                      <Link href={`${RUTA_ADMIN}/pedidos/${p.id}`} className="underline underline-offset-4">
                        {p.folio}
                      </Link>
                    </span>
                  ))}
                  .
                </p>
                {m.abiertos ? (
                  <p className="mt-2 text-sm text-gris">
                    {m.abiertos === 1 ? "1 pedido todavía puede pedir factura." : `${m.abiertos} pedidos todavía pueden pedir factura.`}
                  </p>
                ) : null}
              </Bloque>
            ))}
          </div>
        ) : (
          <Vacio texto="No hay pedidos cobrados sin factura." />
        )
      ) : grupos[ver].length ? (
        <div className="space-y-5">
          {grupos[ver].map(({ factura, pedido }) => (
            <TarjetaFactura key={factura.pedido_id} factura={factura} pedido={pedido} empresa={nombreDe.get(pedido.empresa_id) ?? "Empresa"} />
          ))}
        </div>
      ) : (
        <Vacio
          texto={
            {
              emitir: "No hay facturas por emitir.",
              espera: "Ningún pedido sin pagar pidió factura.",
              cancelar: "No hay facturas por cancelar.",
              emitidas: "Todavía no hay facturas emitidas.",
            }[ver]
          }
        />
      )}
    </div>
  );
}

function Vacio({ texto }: { texto: string }) {
  return <p className="rounded-tarjeta border border-dashed border-linea bg-white p-8 text-center font-semibold">{texto}</p>;
}

type FilaFactura = {
  pedido_id: string;
  estado: string;
  datos: unknown;
  solicitada_en: string;
  folio_fiscal: string | null;
  pdf_ruta: string | null;
  xml_ruta: string | null;
  emitida_en: string | null;
  enviada_en: string | null;
  cancelada_en: string | null;
};
type FilaPedido = Parameters<typeof conceptosSat>[0] & { id: string; estado: string; pagado_en: string | null; creado_en: string };

function TarjetaFactura({ factura, pedido, empresa }: { factura: FilaFactura; pedido: FilaPedido; empresa: string }) {
  const datos = factura.datos as FacturacionCopiada;
  const forma = formaPagoSat(pedido.metodo);
  const conceptos = conceptosSat(pedido);
  const porEmitir = factura.estado === "por_emitir";
  const pagado = ESTADOS_FACTURABLES.includes(pedido.estado);

  return (
    <section className="rounded-tarjeta border border-linea bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold">
          <Link href={`${RUTA_ADMIN}/pedidos/${pedido.id}`} className="text-rojo underline underline-offset-4">
            {pedido.folio}
          </Link>{" "}
          · {empresa}
        </h2>
        <div className="flex items-center gap-2 text-sm">
          <EstadoPedido valor={pedido.estado} />
          <span className="rounded-full bg-papel px-2.5 py-0.5 text-xs font-semibold">
            Factura {esEstadoFactura(factura.estado) ? estadosFactura[factura.estado].toLowerCase() : factura.estado}
          </span>
        </div>
      </div>
      <p className="mt-1 text-sm text-gris">
        Pedida el {fechaHora(factura.solicitada_en)}
        {pedido.pagado_en ? ` · pagado el ${fechaHora(pedido.pagado_en)}` : " · todavía sin pagar"}
        {factura.emitida_en ? ` · emitida el ${fechaHora(factura.emitida_en)}` : ""}
        {factura.enviada_en ? " · enviada por correo" : ""}
        {factura.cancelada_en ? ` · cancelada el ${fechaHora(factura.cancelada_en)}` : ""}
      </p>

      {porEmitir ? (
        <>
          <div className="mt-4 grid gap-5 lg:grid-cols-2">
            <div>
              <h3 className="font-titulos font-bold">Cliente (receptor)</h3>
              <dl className="divide-y divide-linea text-sm">
                <Copiar etiqueta="RFC" valor={datos.rfc} />
                <Copiar etiqueta="Nombre o razón social" valor={datos.razon_social} ayuda="Exacto como en su constancia, sin el régimen de capital (S.A. de C.V.)." />
                <Copiar etiqueta="Régimen fiscal" valor={datos.regimen_fiscal} ayuda={nombreRegimen(datos.regimen_fiscal)} />
                <Copiar etiqueta="Código postal fiscal" valor={datos.cp_fiscal} />
                <Copiar etiqueta="Uso del CFDI" valor={datos.uso_cfdi} ayuda={nombreUso(datos.uso_cfdi)} />
                <Copiar etiqueta="Correo para mandarla" valor={datos.correo} />
              </dl>
            </div>
            <div>
              <h3 className="font-titulos font-bold">Comprobante</h3>
              <dl className="divide-y divide-linea text-sm">
                <Copiar etiqueta="Forma de pago" valor={forma.clave} ayuda={[forma.nombre, forma.nota].filter(Boolean).join(". ")} />
                <Copiar etiqueta="Método de pago" valor="PUE" ayuda="Pago en una sola exhibición" />
                <Copiar etiqueta="Moneda" valor="MXN" />
                <Copiar etiqueta="Exportación" valor="01" ayuda="No aplica" />
              </dl>
            </div>
          </div>

          <h3 className="mt-5 font-titulos font-bold">Conceptos</h3>
          <div className="mt-1 space-y-3">
            {conceptos.map((c) => (
              <dl key={c.descripcion} className="grid gap-x-6 rounded-tarjeta-chica bg-papel px-4 py-2 text-sm sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Copiar etiqueta="Descripción" valor={c.descripcion} />
                </div>
                <Copiar etiqueta="Cantidad" valor={String(c.cantidad)} />
                <Copiar etiqueta="Unidad" valor={c.unidad.split(" ")[0]} ayuda={c.unidad.split(" ").slice(1).join(" ")} />
                <Copiar etiqueta="Valor unitario (sin IVA)" valor={cifra(c.valorUnitario)} />
                <Copiar etiqueta="Importe (sin IVA)" valor={cifra(c.importe)} ayuda="Objeto de impuesto 02 (sí objeto). Traslado de IVA 16 %." />
              </dl>
            ))}
          </div>
          <dl className="mt-3 grid gap-x-6 text-sm sm:grid-cols-3">
            <Copiar etiqueta="Subtotal" valor={cifra(Number(pedido.subtotal) + Number(pedido.envio))} />
            <Copiar etiqueta="IVA 16 %" valor={cifra(Number(pedido.iva))} />
            <Copiar etiqueta="Total" valor={cifra(Number(pedido.total))} />
          </dl>

          {pagado ? (
            <Formulario accion={emitirFactura} boton="Marcar como emitida" className="mt-5 rounded-tarjeta-chica border border-linea p-4">
              <input type="hidden" name="id" value={pedido.id} />
              <p className="font-titulos font-bold">Ya la emití en el SAT</p>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold">PDF de la factura</span>
                  <input type="file" name="pdf" accept="application/pdf,.pdf" className={claseEntrada} />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold">XML timbrado</span>
                  <input type="file" name="xml" accept=".xml,application/xml,text/xml" className={claseEntrada} />
                  <span className="mt-1 block text-xs text-gris">Con el XML se lee el folio fiscal y se revisa que RFC y total cuadren.</span>
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-sm font-semibold">Folio fiscal (UUID), si no subes el XML</span>
                  <input name="folio_fiscal" maxLength={36} placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX" className={claseEntrada} />
                </label>
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input type="checkbox" name="enviar" value="si" defaultChecked />
                Mandársela por correo a {datos.correo}
              </label>
              <label className="mt-1 flex items-center gap-2 text-sm">
                <input type="checkbox" name="confirmar" value="si" />
                Sí, así está bien (solo si te avisa que algo no cuadra)
              </label>
            </Formulario>
          ) : (
            <p className="mt-4 text-sm text-gris">Emítela cuando el pedido esté pagado.</p>
          )}
        </>
      ) : (
        <div className="mt-3 space-y-2 text-sm">
          <p>
            {datos.razon_social} · {datos.rfc} · uso {datos.uso_cfdi}
            {factura.folio_fiscal ? <span className="block text-gris">Folio fiscal: {factura.folio_fiscal}</span> : null}
            <span className="block text-gris">
              {[factura.pdf_ruta ? "PDF" : null, factura.xml_ruta ? "XML" : null].filter(Boolean).join(" y ") || "Sin archivos"} guardado
              {factura.pdf_ruta && factura.xml_ruta ? "s" : ""}.
            </span>
          </p>
          {factura.estado === "emitida" ? (
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {DEVUELTOS.includes(pedido.estado) ? (
                <Confirmar accion={cancelarFactura} id={pedido.id} texto="Ya la cancelé en el SAT" confirmar="Marcar como cancelada">
                  El pedido se {pedido.estado === "reembolsado" ? "devolvió" : "canceló"}. Cancela la factura en el portal del SAT y luego márcala aquí.
                </Confirmar>
              ) : null}
              <Confirmar accion={reabrirFactura} id={pedido.id} texto="Regresar a «por emitir»" confirmar="Sí, regresarla">
                Por si la marcaste por error. Se borran el PDF y el XML guardados; la empresa ya no los verá.
              </Confirmar>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
