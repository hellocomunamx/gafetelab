import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Bloque } from "@/components/cuenta/Entrada";
import { COLUMNAS_FINANZAS, aPedidoFinanzas, esPeriodo, periodos, rangoDe, resumir } from "@/lib/admin/finanzas";
import { todas } from "@/lib/admin/paginas";
import { RUTA_ADMIN } from "@/lib/admin/ruta";
import { requerirAdmin } from "@/lib/admin/sesion";
import { pago } from "@/lib/pedidos/reglas";
import { cobrarAutorizados } from "@/lib/pedidos/servidor";
import { pesos } from "@/lib/precios";

export const metadata: Metadata = { title: "Finanzas" };

const chip = (activo: boolean) =>
  `rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
    activo ? "border-tinta bg-tinta text-white" : "border-linea bg-white hover:border-tinta"
  }`;
const numero = (n: number) => n.toLocaleString("es-MX");
const pedidosEnFrase = (n: number) => (n === 1 ? "1 pedido" : `${numero(n)} pedidos`);

/** Un número de cabecera: etiqueta, valor y una línea de contexto. */
function Cifra({ nombre, valor, nota, grande = false }: { nombre: string; valor: string; nota?: ReactNode; grande?: boolean }) {
  return (
    <div className="rounded-tarjeta border border-linea bg-white p-4 sm:p-5">
      <p className="text-sm text-gris">{nombre}</p>
      <p className={`mt-1 font-semibold ${grande ? "text-4xl sm:text-5xl" : "text-2xl"}`}>{valor}</p>
      {nota ? <p className="mt-1 text-sm text-gris">{nota}</p> : null}
    </div>
  );
}

/** Barra horizontal de una sola serie: el largo es la parte del máximo. */
function Barra({ parte }: { parte: number }) {
  const ancho = Math.max(0, Math.min(1, parte)) * 100;
  return (
    <span aria-hidden="true" className="block h-2 w-full">
      {ancho > 0 ? <span className="block h-2 min-w-1 rounded-r-full bg-tinta" style={{ width: `${ancho}%` }} /> : null}
    </span>
  );
}

export default async function Finanzas({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const { servicio } = await requerirAdmin();
  if (!servicio) {
    return (
      <p role="alert" className="rounded-tarjeta border border-rojo/30 bg-white p-4 text-sm">
        Falta configurar <code>SUPABASE_SECRET_KEY</code> en el servidor para ver las finanzas.
      </p>
    );
  }
  // Antes de sumar, se cobran los pedidos a los que ya se les acabaron los minutos de gracia.
  await cobrarAutorizados(servicio).catch(() => null);

  const f = await searchParams;
  const periodo = esPeriodo(f.periodo) ? f.periodo : "mes";
  const [pedidos, eventos, { data: empresas }] = await Promise.all([
    todas((desde, hasta) =>
      servicio.from("pedidos").select(COLUMNAS_FINANZAS).order("creado_en", { ascending: false }).order("id").range(desde, hasta),
    ),
    todas((desde, hasta) =>
      servicio
        .from("pedido_eventos")
        .select("pedido_id, tipo, detalle, creado_en")
        .in("tipo", ["reembolsado", "reembolso_parcial", "cancelado"])
        .order("id")
        .range(desde, hasta),
    ),
    servicio.from("empresas").select("id, nombre").limit(5000),
  ]);
  const r = resumir(pedidos.map(aPedidoFinanzas), eventos, rangoDe(periodo));
  const nombreDe = new Map((empresas ?? []).map((e) => [e.id, e.nombre]));
  const frasePeriodo = periodos.find((p) => p.id === periodo)!.frase;
  const maximoMes = Math.max(...r.meses.map((m) => m.cobrado), 0);
  const porCobrar = r.porCobrar.autorizado.total + r.porCobrar.enProceso.total;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold">Finanzas</h1>
        {pedidos.length ? (
          <a
            href={`${RUTA_ADMIN}/finanzas/descargar?periodo=${periodo}`}
            className="rounded-full border border-tinta px-4 py-2 text-sm font-semibold hover:bg-white"
          >
            Descargar en Excel
          </a>
        ) : null}
      </div>
      <nav aria-label="Periodo" className="flex flex-wrap gap-2">
        {periodos.map((p) => (
          <Link
            key={p.id}
            href={`${RUTA_ADMIN}/finanzas${p.id === "mes" ? "" : `?periodo=${p.id}`}`}
            aria-current={p.id === periodo ? "page" : undefined}
            className={chip(p.id === periodo)}
          >
            {p.nombre}
          </Link>
        ))}
      </nav>

      <section aria-label="Resumen del periodo" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <Cifra
            grande
            nombre="Cobrado"
            valor={pesos(r.cobrado.total)}
            nota={`${pedidosEnFrase(r.cobrado.pedidos)} · ${numero(r.cobrado.piezas)} gafetes · con IVA y envío`}
          />
        </div>
        <Cifra nombre="Antes de IVA" valor={pesos(r.cobrado.antesDeIva)} nota={`IVA: ${pesos(r.cobrado.iva)}`} />
        <Cifra nombre="Pedido promedio" valor={r.cobrado.pedidos ? pesos(r.ticket) : "Sin pedidos"} nota={`Envíos cobrados: ${pesos(r.cobrado.envio)}`} />
        <Cifra
          nombre="Devuelto"
          valor={pesos(r.devuelto.total)}
          nota={r.devuelto.pedidos ? pedidosEnFrase(r.devuelto.pedidos) : "Ninguna devolución"}
        />
        <Cifra nombre="Te queda" valor={pesos(r.neto)} nota="Cobrado menos devuelto" />
        <Cifra
          nombre="Cancelados"
          valor={numero(r.cancelados.pedidos)}
          nota={
            r.cancelados.pedidos
              ? `${pesos(r.cancelados.total)} · ${numero(r.cancelados.enGracia)} en los ${pago.minutosDeGracia} minutos de gracia`
              : "Ningún pedido cancelado"
          }
        />
        <Cifra
          nombre="Por cobrar hoy"
          valor={pesos(porCobrar)}
          nota={
            <Link href={`${RUTA_ADMIN}/pedidos?ver=sin_pagar`} className="underline">
              Ver pedidos sin pagar
            </Link>
          }
        />
      </section>
      <p className="text-sm text-gris">
        Las cifras de arriba son {frasePeriodo}, por fecha de pago, y son lo que pagaron tus clientes: no descuentan la
        comisión de Stripe. «Por cobrar hoy» no depende del periodo.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <Bloque titulo="Por forma de pago">
          {r.metodos.length ? (
            <table className="w-full text-left text-sm">
              <thead className="text-gris">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-semibold">Forma de pago</th>
                  <th scope="col" className="py-2 pr-4 text-right font-semibold">Pedidos</th>
                  <th scope="col" className="py-2 pr-4 text-right font-semibold">Cobrado</th>
                  <th scope="col" className="py-2 text-right font-semibold">Parte</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-linea">
                {r.metodos.map((m) => (
                  <tr key={m.id}>
                    <th scope="row" className="py-2.5 pr-4 font-semibold">
                      {m.nombre}
                      <span className="mt-1.5 block">
                        <Barra parte={m.parte} />
                      </span>
                    </th>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{numero(m.pedidos)}</td>
                    <td className="py-2.5 pr-4 text-right whitespace-nowrap tabular-nums">{pesos(m.total)}</td>
                    <td className="py-2.5 text-right tabular-nums">{Math.round(m.parte * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gris">Ningún pedido pagado en este periodo.</p>
          )}
        </Bloque>

        <Bloque titulo="Por cobrar y disputas, hoy">
          <table className="w-full text-left text-sm">
            <thead className="text-gris">
              <tr>
                <th scope="col" className="py-2 pr-4 font-semibold">Situación</th>
                <th scope="col" className="py-2 pr-4 text-right font-semibold">Pedidos</th>
                <th scope="col" className="py-2 text-right font-semibold">Importe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linea">
              {[
                { nombre: `Tarjeta autorizada, en sus ${pago.minutosDeGracia} minutos de gracia`, c: r.porCobrar.autorizado },
                { nombre: "Esperando el pago en OXXO o por SPEI", c: r.porCobrar.enProceso },
                { nombre: "Pedidos que no han empezado a pagar", c: r.porCobrar.sinPagar },
                { nombre: "Disputas abiertas", c: r.disputas.abiertas },
                { nombre: "Disputas ganadas", c: r.disputas.ganadas },
                { nombre: "Disputas perdidas", c: r.disputas.perdidas },
              ].map((x) => (
                <tr key={x.nombre}>
                  <th scope="row" className="py-2.5 pr-4 font-normal">{x.nombre}</th>
                  <td className="py-2.5 pr-4 text-right tabular-nums">{numero(x.c.pedidos)}</td>
                  <td className="py-2.5 text-right whitespace-nowrap tabular-nums">{pesos(x.c.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Bloque>
      </div>

      <Bloque titulo="Mes por mes">
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="text-gris">
              <tr>
                <th scope="col" className="py-2 pr-4 font-semibold">Mes</th>
                <th scope="col" className="w-2/5 py-2 pr-4 font-semibold">Cobrado</th>
                <th scope="col" className="py-2 pr-4 text-right font-semibold">Pedidos</th>
                <th scope="col" className="py-2 pr-4 text-right font-semibold">Gafetes</th>
                <th scope="col" className="py-2 pr-4 text-right font-semibold">Devuelto</th>
                <th scope="col" className="py-2 text-right font-semibold">Cancelados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linea">
              {r.meses.map((m) => (
                <tr key={m.clave}>
                  <th scope="row" className="py-2.5 pr-4 font-semibold whitespace-nowrap">{m.nombre}</th>
                  <td className="py-2.5 pr-4">
                    <span className="flex items-center gap-3">
                      <span className="w-24 shrink-0 text-right whitespace-nowrap tabular-nums">{pesos(m.cobrado)}</span>
                      <Barra parte={maximoMes ? m.cobrado / maximoMes : 0} />
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">{numero(m.pedidos)}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">{numero(m.piezas)}</td>
                  <td className="py-2.5 pr-4 text-right whitespace-nowrap tabular-nums">{pesos(m.devuelto)}</td>
                  <td className="py-2.5 text-right tabular-nums">{numero(m.cancelados)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Bloque>

      <Bloque titulo="Quién más compró">
        {r.mejores.length ? (
          <ol className="divide-y divide-linea text-sm">
            {r.mejores.map((m) => (
              <li key={m.empresa_id} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-2.5">
                <Link href={`${RUTA_ADMIN}/clientes/${m.empresa_id}`} className="font-semibold text-rojo underline underline-offset-4">
                  {nombreDe.get(m.empresa_id) ?? "Empresa"}
                </Link>
                <span className="text-gris">
                  {pedidosEnFrase(m.pedidos)} · <span className="font-semibold text-tinta">{pesos(m.total)}</span>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-gris">Ningún pedido pagado en este periodo.</p>
        )}
      </Bloque>
    </div>
  );
}
