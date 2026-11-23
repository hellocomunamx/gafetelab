"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useMemo, useState, useTransition } from "react";
import { crearPedido } from "@/app/cuenta/pedidos/acciones";
import { claseBoton, claseEntrada } from "@/components/cuenta/Formulario";
import type { MaterialId } from "@/lib/materiales";
import { pago, pedidoMaximoPiezas, soloTransferencia } from "@/lib/pedidos/reglas";
import { cotizarConSaldo, resumenSaldo, type SaldoDisponible } from "@/lib/pedidos/saldo";
import { envioGratisTexto, notaIva, pesos } from "@/lib/precios";
import { entregaTexto, site } from "@/lib/site";

export type FuenteVista = {
  id: string;
  tipo: "diseno" | "listos";
  nombre: string;
  /** Con un diseño: si lleva vuelta. Con gafetes listos depende de a quién se elija. */
  dosCaras: boolean;
  /** Por persona: lo que le falta a su gafete y si trae vuelta. Quien no aparece no tiene gafete en esta opción. */
  gafetes: Record<string, { faltan: string[]; vuelta: boolean }>;
  /** Dónde se ve la vista previa de todo el equipo. */
  vista: string;
};

type Opcion = { id: string; titulo: string; texto: string };
type Persona = { id: string; nombre: string; numero: string | null; puesto: string | null };

const VISIBLES = 200;
const chip = (activo: boolean) =>
  `rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
    activo ? "border-tinta bg-tinta text-white" : "border-linea bg-white hover:border-tinta"
  }`;
const tarjeta = (activo: boolean) =>
  `block w-full rounded-tarjeta-chica border p-3 text-left text-sm transition-colors ${
    activo ? "border-tinta bg-papel ring-1 ring-tinta" : "border-linea bg-white hover:border-tinta"
  }`;
const liga = "font-semibold text-rojo underline underline-offset-4";
const sinAcentos = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function Paso({ numero, titulo, children }: { numero: number; titulo: string; children: ReactNode }) {
  return (
    <section className="rounded-tarjeta border border-linea bg-white p-5 sm:p-6">
      <h2 className="mb-4 text-xl font-extrabold">
        {numero}. {titulo}
      </h2>
      {children}
    </section>
  );
}

/**
 * Pedido paso a paso: qué se imprime, para quiénes, en qué material, a dónde
 * va y a nombre de quién se factura. El precio que se ve aquí es informativo:
 * el servidor lo vuelve a calcular antes de cobrar.
 */
export function NuevoPedido({
  fuentes,
  muestras,
  personas,
  materiales,
  direcciones,
  fiscales,
  saldos,
}: {
  fuentes: FuenteVista[];
  muestras: Record<string, ReactNode>;
  personas: Persona[];
  materiales: { id: MaterialId; nombre: string; extra: number; resumen: string }[];
  direcciones: Opcion[];
  fiscales: Opcion[];
  /** Saldo prepagado de la empresa: se usa primero. */
  saldos: SaldoDisponible[];
}) {
  const router = useRouter();
  const completas = (f: FuenteVista) => personas.filter((p) => f.gafetes[p.id] && !f.gafetes[p.id].faltan.length).map((p) => p.id);

  const [fuenteId, setFuenteId] = useState(fuentes[0].id);
  const fuente = fuentes.find((f) => f.id === fuenteId) ?? fuentes[0];
  const [elegidas, setElegidas] = useState(() => new Set(completas(fuentes[0]).slice(0, pedidoMaximoPiezas)));
  const [busqueda, setBusqueda] = useState("");
  const [material, setMaterial] = useState<MaterialId>(materiales[0].id);
  const [direccion, setDireccion] = useState(direcciones[0]?.id ?? "");
  const [facturacion, setFacturacion] = useState(fiscales[0]?.id ?? "");
  const [aprobado, setAprobado] = useState(false);
  const [error, setError] = useState("");
  const [enviando, iniciar] = useTransition();

  const enOpcion = useMemo(() => personas.filter((p) => fuente.gafetes[p.id]), [personas, fuente]);
  const incompletas = enOpcion.filter((p) => fuente.gafetes[p.id].faltan.length).length;
  const filtradas = useMemo(() => {
    const q = sinAcentos(busqueda.trim());
    return q ? enOpcion.filter((p) => sinAcentos(`${p.nombre} ${p.numero ?? ""} ${p.puesto ?? ""}`).includes(q)) : enOpcion;
  }, [enOpcion, busqueda]);

  const piezas = elegidas.size;
  const dosCaras = fuente.tipo === "diseno" ? fuente.dosCaras : [...elegidas].some((id) => fuente.gafetes[id]?.vuelta);
  const c = cotizarConSaldo(Math.max(1, piezas), { dosCaras, material }, saldos);
  const enSaldo = resumenSaldo(saldos);
  const porTransferencia = soloTransferencia(piezas, c.total);

  function cambiarFuente(id: string) {
    const nueva = fuentes.find((f) => f.id === id);
    if (!nueva) return;
    setFuenteId(id);
    setElegidas(new Set(completas(nueva).slice(0, pedidoMaximoPiezas)));
    setBusqueda("");
    setAprobado(false);
  }
  function alternar(id: string) {
    setElegidas((previas) => {
      const nuevas = new Set(previas);
      if (nuevas.has(id)) nuevas.delete(id);
      else if (nuevas.size < pedidoMaximoPiezas) nuevas.add(id);
      return nuevas;
    });
  }

  function pedir() {
    setError("");
    if (!piezas) return setError("Elige al menos a una persona.");
    if (!direccion) return setError("Elige a dónde enviamos tu pedido.");
    if (!aprobado) return setError("Confirma que revisaste la vista previa de tus gafetes.");
    iniciar(async () => {
      const r = await crearPedido({
        fuente: fuente.id,
        personas: [...elegidas],
        material,
        direccion,
        facturacion: facturacion || null,
        aprobado,
      });
      if (r.url) window.location.assign(r.url);
      else if (r.pedido && r.pagado) router.push(`/cuenta/pedidos/${r.pedido}?pago=saldo`);
      else if (r.pedido) router.push(`/cuenta/pedidos/${r.pedido}?pago=error`);
      else setError(r.error ?? "No pudimos guardar tu pedido. Intenta de nuevo.");
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr] lg:items-start">
      <div className="min-w-0 space-y-5">
        <Paso numero={1} titulo="¿Qué imprimimos?">
          {fuentes.length > 1 ? (
            <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Diseño del pedido">
              {fuentes.map((f) => (
                <button key={f.id} type="button" aria-pressed={f.id === fuente.id} onClick={() => cambiarFuente(f.id)} className={chip(f.id === fuente.id)}>
                  {f.nombre}
                </button>
              ))}
            </div>
          ) : (
            <p className="mb-4 font-semibold">{fuente.nombre}</p>
          )}
          {muestras[fuente.id] ?? null}
          <p className="mt-3 text-sm">
            <Link href={fuente.vista} className={liga}>
              Ver la vista previa de todo el equipo
            </Link>
          </p>
        </Paso>

        <Paso numero={2} titulo="¿Para quiénes?">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <label className="block min-w-0 flex-1">
              <span className="text-sm font-semibold">Buscar</span>
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Nombre, número o puesto"
                className={claseEntrada}
              />
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setElegidas(new Set(completas(fuente).slice(0, pedidoMaximoPiezas)))} className={chip(false)}>
                Elegir a todos
              </button>
              <button type="button" onClick={() => setElegidas(new Set())} className={chip(false)}>
                Quitar a todos
              </button>
            </div>
          </div>
          <p className="mt-3 text-sm text-gris" aria-live="polite">
            {piezas.toLocaleString("es-MX")} de {enOpcion.length.toLocaleString("es-MX")} {enOpcion.length === 1 ? "persona elegida" : "personas elegidas"}.
            {incompletas
              ? ` ${incompletas === 1 ? "A 1 le falta" : `A ${incompletas} les falta`} algo en su gafete y no se puede pedir hasta completarlo.`
              : ""}
          </p>
          <ul className="mt-3 max-h-[26rem] divide-y divide-linea overflow-y-auto rounded-tarjeta-chica border border-linea">
            {filtradas.slice(0, VISIBLES).map((p) => {
              const faltan = fuente.gafetes[p.id].faltan;
              return (
                <li key={p.id} className="flex items-start gap-3 px-3 py-2.5">
                  <input
                    id={`persona-${p.id}`}
                    type="checkbox"
                    checked={elegidas.has(p.id)}
                    disabled={faltan.length > 0}
                    onChange={() => alternar(p.id)}
                    className="mt-1 size-4 accent-rojo"
                  />
                  <label htmlFor={`persona-${p.id}`} className="min-w-0 flex-1 text-sm">
                    <span className="font-semibold">{p.nombre}</span>
                    <span className="block text-gris">{[p.numero, p.puesto].filter(Boolean).join(" · ") || "Sin número ni puesto"}</span>
                    {faltan.length ? (
                      <span className="block font-medium text-rojo-oscuro">
                        Le falta: {faltan.join(", ").toLowerCase()}.{" "}
                        <Link href={`/cuenta/equipo/${p.id}`} className="underline underline-offset-4">
                          Completar
                        </Link>
                      </span>
                    ) : null}
                  </label>
                </li>
              );
            })}
            {filtradas.length ? null : <li className="px-3 py-6 text-center text-sm text-gris">Nadie coincide con tu búsqueda.</li>}
          </ul>
          {filtradas.length > VISIBLES ? (
            <p className="mt-2 text-sm text-gris">
              Se muestran {VISIBLES} de {filtradas.length.toLocaleString("es-MX")}. Usa el buscador para encontrar a alguien más.
            </p>
          ) : null}
        </Paso>

        <Paso numero={3} titulo="¿En qué material?">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Material">
            {materiales.map((m) => (
              <button key={m.id} type="button" aria-pressed={m.id === material} onClick={() => setMaterial(m.id)} className={chip(m.id === material)}>
                {m.nombre}
                {m.extra ? ` (+${pesos(m.extra)})` : ""}
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-gris">{materiales.find((m) => m.id === material)?.resumen}</p>
        </Paso>

        <Paso numero={4} titulo="¿A dónde lo enviamos?">
          {direcciones.length ? (
            <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Dirección de envío">
              {direcciones.map((d) => (
                <button key={d.id} type="button" aria-pressed={d.id === direccion} onClick={() => setDireccion(d.id)} className={tarjeta(d.id === direccion)}>
                  <span className="block font-semibold">{d.titulo}</span>
                  <span className="block text-gris">{d.texto}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-tarjeta-chica bg-resaltador/30 p-4 text-sm">Todavía no guardas una dirección de envío.</p>
          )}
          <p className="mt-3 text-sm">
            <Link href="/cuenta/datos" className={liga}>
              {direcciones.length ? "Agregar otra dirección" : "Agregar mi dirección"}
            </Link>
          </p>
        </Paso>

        <Paso numero={5} titulo="¿A nombre de quién facturamos?">
          <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Datos de facturación">
            {fiscales.map((f) => (
              <button key={f.id} type="button" aria-pressed={f.id === facturacion} onClick={() => setFacturacion(f.id)} className={tarjeta(f.id === facturacion)}>
                <span className="block font-semibold">{f.titulo}</span>
                <span className="block text-gris">{f.texto}</span>
              </button>
            ))}
            <button type="button" aria-pressed={!facturacion} onClick={() => setFacturacion("")} className={tarjeta(!facturacion)}>
              <span className="block font-semibold">No necesito factura</span>
              <span className="block text-gris">Puedes pedirla hasta {site.plazoFacturaDias} días después del pedido.</span>
            </button>
          </div>
          <p className="mt-3 text-sm">
            <Link href="/cuenta/datos#facturacion" className={liga}>
              Agregar datos de facturación
            </Link>
          </p>
        </Paso>
      </div>

      <aside className="rounded-tarjeta border border-linea bg-white p-5 sm:p-6 lg:sticky lg:top-4" aria-live="polite">
        <p className="text-sm font-semibold tracking-wide text-gris uppercase">Tu pedido</p>
        <p className="mt-1 font-titulos text-3xl font-extrabold">
          {piezas.toLocaleString("es-MX")} {piezas === 1 ? "gafete" : "gafetes"}
        </p>
        {enSaldo.gafetes || enSaldo.envios ? (
          <p className="mt-2 text-sm text-gris">
            Tienes {enSaldo.gafetes.toLocaleString("es-MX")} {enSaldo.gafetes === 1 ? "gafete" : "gafetes"} y {enSaldo.envios}{" "}
            {enSaldo.envios === 1 ? "envío" : "envíos"} prepagados. Se usan primero.
          </p>
        ) : null}
        {piezas ? (
          <dl className="mt-4 space-y-2 text-sm">
            {c.conceptos.map((x) => (
              <div key={x.nombre} className="flex justify-between gap-3">
                <dt>
                  {x.nombre}
                  <span className="block text-gris">
                    {x.cantidad.toLocaleString("es-MX")} × {x.precio ? pesos(x.precio) : "ya pagados"}
                  </span>
                </dt>
                <dd className="font-semibold">{pesos(x.cantidad * x.precio)}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-3 border-t border-linea pt-2">
              <dt>Envío a todo México</dt>
              <dd>{c.envioDeSaldo ? "De tu saldo" : c.envioGratis ? "Gratis" : pesos(c.envio)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>IVA</dt>
              <dd>{pesos(c.iva)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-t border-linea pt-2">
              <dt className="font-semibold">Total</dt>
              <dd className="font-titulos text-2xl font-extrabold">{pesos(c.total)}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-3 text-sm text-gris">Elige a quiénes les hacemos gafete para ver tu total. Precios {notaIva}.</p>
        )}
        {piezas && c.faltaParaEnvioGratis > 0 ? (
          <p className="mt-3 text-sm text-gris">
            {envioGratisTexto}: te faltan {pesos(c.faltaParaEnvioGratis)} antes de IVA.
          </p>
        ) : null}

        <p className="mt-4 rounded-tarjeta-chica bg-papel p-3 text-sm">
          {piezas && c.total === 0
            ? "Todo sale de tu saldo prepagado: no hay nada que pagar."
            : porTransferencia
            ? "Por su tamaño, este pedido se paga por transferencia (SPEI). Al continuar te damos la CLABE y la referencia."
            : `Pagas con tarjeta, en efectivo en OXXO o por transferencia (SPEI). Con tarjeta tienes ${pago.minutosDeGracia} minutos para cancelar sin costo.`}{" "}
          Empezamos a producir cuando se confirma tu pago; la entrega es en {entregaTexto}.
        </p>

        <label className="mt-4 flex items-start gap-3 text-sm">
          <input type="checkbox" checked={aprobado} onChange={(e) => setAprobado(e.target.checked)} className="mt-1 size-4 accent-rojo" />
          <span>
            Revisé la vista previa de mis gafetes y credenciales, los datos son correctos y apruebo que se impriman tal como se ven.
          </span>
        </label>

        <button type="button" onClick={pedir} disabled={enviando || !piezas} className={`${claseBoton} mt-4 w-full`}>
          {enviando ? "Preparando tu pedido…" : piezas && c.total === 0 ? "Hacer mi pedido con mi saldo" : "Continuar al pago"}
        </button>
        {error ? (
          <p role="alert" className="mt-3 text-sm font-medium text-rojo-oscuro">
            {error}
          </p>
        ) : null}
        <p className="mt-3 text-xs text-gris">El pago se hace en la página segura de Stripe. Nosotros no vemos ni guardamos los datos de tu tarjeta.</p>
      </aside>
    </div>
  );
}
