"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useMemo, useState, useTransition } from "react";
import { crearPedido } from "@/app/cuenta/pedidos/acciones";
import { claseBoton, claseEntrada } from "@/components/cuenta/Formulario";
import type { MaterialId } from "@/lib/materiales";
import { razones as nombresRazon, type Razon } from "@/lib/pedidos/predeterminados";
import { pago, pedidoMaximoPiezas, soloTransferencia } from "@/lib/pedidos/reglas";
import { cotizarPedido, llevaDigital, llevaImpreso } from "@/lib/pedidos/digital";
import { resumenSaldo, type SaldoDisponible } from "@/lib/pedidos/saldo";
import { envioGratisTexto, type Modalidad, modalidades, notaIva, pesos, precioCordon, precioDigital } from "@/lib/precios";
import { type Categoria, cordonesDe, fechaEvento, hoyIso, nombreColor } from "@/lib/eventos";
import { entregaTexto, site } from "@/lib/site";

export type FuenteVista = {
  id: string;
  tipo: "diseno" | "listos" | "reglas";
  nombre: string;
  /** Con un diseño: si lleva vuelta. Con reglas o gafetes listos depende de a quién se elija. */
  dosCaras: boolean;
  /**
   * Por persona: lo que le falta a su gafete, si trae vuelta y, con reglas, el
   * nombre del diseño que le toca. Quien no aparece no tiene gafete en esta opción.
   */
  gafetes: Record<string, { faltan: string[]; vuelta: boolean; diseno?: string }>;
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
  conDigital,
  inicial,
  evento = null,
}: {
  fuentes: FuenteVista[];
  muestras: Record<string, ReactNode>;
  personas: Persona[];
  materiales: { id: MaterialId; nombre: string; extra: number; resumen: string }[];
  direcciones: Opcion[];
  fiscales: Opcion[];
  /** Saldo prepagado de la empresa: se usa primero. */
  saldos: SaldoDisponible[];
  /** Personas que ya tienen su gafete digital: no se les vuelve a cobrar. */
  conDigital: string[];
  /** Si el proyecto es un evento: sus categorías, la de cada persona y sus fechas. */
  evento?: { categorias: Categoria[]; categoriaDe: Record<string, string>; limite: string; inicio: string } | null;
  /** Con qué arranca el pedido: los predeterminados del negocio y, si viene de una reposición o del pedido abierto, a quiénes. */
  inicial: {
    fuente: string | null;
    material: MaterialId | null;
    sinFactura: boolean;
    personas: string[] | null;
    razones: Record<string, Razon>;
    origen: "reposicion" | "abierto" | null;
  };
}) {
  const router = useRouter();
  const yaDigital = useMemo(() => new Set(conDigital), [conDigital]);
  const [modalidad, setModalidad] = useState<Modalidad>("impreso");
  const impreso = llevaImpreso(modalidad);
  const digital = llevaDigital(modalidad);
  /** Quien ya tiene su gafete digital no entra a un pedido que lleva digital. */
  const bloqueada = (id: string, m: Modalidad = modalidad) => llevaDigital(m) && yaDigital.has(id);
  const preseleccion = inicial.personas ? new Set(inicial.personas) : null;
  const completas = (f: FuenteVista) =>
    personas
      .filter((p) => f.gafetes[p.id] && !f.gafetes[p.id].faltan.length && !bloqueada(p.id) && (!preseleccion || preseleccion.has(p.id)))
      .map((p) => p.id);

  const primera = fuentes.find((f) => f.id === inicial.fuente) ?? fuentes[0];
  const [fuenteId, setFuenteId] = useState(primera.id);
  const fuente = fuentes.find((f) => f.id === fuenteId) ?? fuentes[0];
  const [elegidas, setElegidas] = useState(() => new Set(completas(primera).slice(0, pedidoMaximoPiezas)));
  const [busqueda, setBusqueda] = useState("");
  const [material, setMaterial] = useState<MaterialId>(
    materiales.find((m) => m.id === inicial.material)?.id ?? materiales[0].id,
  );
  const [direccion, setDireccion] = useState(direcciones[0]?.id ?? "");
  const [facturacion, setFacturacion] = useState(inicial.sinFactura ? "" : (fiscales[0]?.id ?? ""));
  const [aprobado, setAprobado] = useState(false);
  // En un evento el cordón va marcado de entrada: es lo que casi todos piden.
  const [cordon, setCordon] = useState(Boolean(evento));
  const [error, setError] = useState("");
  const [enviando, iniciar] = useTransition();

  const enOpcion = useMemo(() => personas.filter((p) => fuente.gafetes[p.id]), [personas, fuente]);
  const incompletas = enOpcion.filter((p) => fuente.gafetes[p.id].faltan.length).length;
  const filtradas = useMemo(() => {
    const q = sinAcentos(busqueda.trim());
    return q ? enOpcion.filter((p) => sinAcentos(`${p.nombre} ${p.numero ?? ""} ${p.puesto ?? ""}`).includes(q)) : enOpcion;
  }, [enOpcion, busqueda]);

  const piezas = elegidas.size;
  const dosCaras = impreso && (fuente.tipo === "diseno" ? fuente.dosCaras : [...elegidas].some((id) => fuente.gafetes[id]?.vuelta));
  const conCordon = Boolean(evento) && impreso && cordon;
  const c = cotizarPedido(Math.max(1, piezas), { modalidad, dosCaras, material, cordon: conCordon }, saldos);
  const cordones = evento && conCordon ? cordonesDe([...elegidas].map((id) => evento.categoriaDe[id]), evento.categorias) : [];
  const enSaldo = resumenSaldo(saldos);
  const porTransferencia = soloTransferencia(piezas, c.total);

  function cambiarModalidad(m: Modalidad) {
    setModalidad(m);
    if (llevaDigital(m)) setElegidas((previas) => new Set([...previas].filter((id) => !yaDigital.has(id))));
    setAprobado(false);
  }
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
    if (impreso && !direccion) return setError("Elige a dónde enviamos tu pedido.");
    if (!aprobado) return setError("Confirma que revisaste la vista previa de tus gafetes.");
    iniciar(async () => {
      const r = await crearPedido({
        fuente: fuente.id,
        modalidad,
        personas: [...elegidas],
        material,
        direccion,
        facturacion: facturacion || null,
        aprobado,
        cordon: conCordon,
        razones: Object.fromEntries([...elegidas].flatMap((id) => (inicial.razones[id] ? [[id, inicial.razones[id]]] : []))),
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
        <Paso numero={1} titulo="¿Impreso, digital o los dos?">
          <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label="Modalidad">
            {modalidades.map((m) => (
              <button key={m.id} type="button" aria-pressed={m.id === modalidad} onClick={() => cambiarModalidad(m.id)} className={tarjeta(m.id === modalidad)}>
                <span className="block font-semibold">{m.nombre}</span>
                <span className="block text-gris">{m.resumen}</span>
              </button>
            ))}
          </div>
          {digital ? (
            <p className="mt-3 text-sm text-gris">
              El gafete digital cuesta {pesos(precioDigital)} por persona, {notaIva}, en un solo pago. Al confirmarse el pago, cada quien lo abre
              en su celular con su liga personal y lo puede guardar en su pantalla de inicio. Si cambian sus datos, se actualiza solo.
            </p>
          ) : null}
        </Paso>

        <Paso numero={2} titulo={impreso ? "¿Qué imprimimos?" : "¿Cómo se ve?"}>
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
          {fuente.tipo === "reglas" ? (
            <p className="mt-3 text-sm text-gris">
              Cada persona lleva el diseño que le toca según tus{" "}
              <Link href="/cuenta/disenos/reglas" className="underline underline-offset-4">reglas</Link>.
              {dosCaras && [...elegidas].some((id) => !fuente.gafetes[id]?.vuelta)
                ? " Como al menos uno de los diseños lleva vuelta, el pedido se cotiza por frente y vuelta."
                : ""}
            </p>
          ) : null}
          <p className="mt-3 text-sm">
            <Link href={fuente.vista} className={liga}>
              Ver la vista previa de todo el equipo
            </Link>
          </p>
        </Paso>

        <Paso numero={3} titulo="¿Para quiénes?">
          {inicial.origen ? (
            <p className="mb-4 rounded-tarjeta-chica bg-papel p-3 text-sm">
              {inicial.origen === "abierto"
                ? "Ya elegimos a quienes van en tu pedido abierto. Puedes quitar a alguien antes de pagar."
                : "Ya elegimos a quien le vas a reponer su gafete. Sus datos y su foto son los que tienes guardados."}{" "}
              <Link href="/cuenta/pedidos/nuevo" className={liga}>
                Mejor elegir de todo mi equipo
              </Link>
            </p>
          ) : null}
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
              const tieneDigital = bloqueada(p.id);
              return (
                <li key={p.id} className="flex items-start gap-3 px-3 py-2.5">
                  <input
                    id={`persona-${p.id}`}
                    type="checkbox"
                    checked={elegidas.has(p.id)}
                    disabled={faltan.length > 0 || tieneDigital}
                    onChange={() => alternar(p.id)}
                    className="mt-1 size-4 accent-rojo"
                  />
                  <label htmlFor={`persona-${p.id}`} className="min-w-0 flex-1 text-sm">
                    <span className="font-semibold">{p.nombre || "Sin nombre"}</span>
                    <span className="block text-gris">
                      {[p.numero, p.puesto, fuente.gafetes[p.id].diseno ? `Diseño: ${fuente.gafetes[p.id].diseno}` : null]
                        .filter(Boolean)
                        .join(" · ") || "Sin número ni puesto"}
                    </span>
                    {tieneDigital ? <span className="block font-medium text-[#0a7d4f]">Ya tiene su gafete digital.</span> : null}
                    {inicial.razones[p.id] && inicial.razones[p.id] !== "alta" ? (
                      <span className="mt-0.5 inline-block rounded-full bg-resaltador/50 px-2 py-0.5 text-xs font-semibold">
                        Reposición: {nombresRazon[inicial.razones[p.id]].nombre.toLowerCase()}
                      </span>
                    ) : null}
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

        {impreso ? (
          <Paso numero={4} titulo="¿En qué material?">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Material">
              {materiales.map((m) => (
                <button key={m.id} type="button" aria-pressed={m.id === material} onClick={() => setMaterial(m.id)} className={chip(m.id === material)}>
                  {m.nombre}
                  {m.extra ? ` (+${pesos(m.extra)})` : ""}
                </button>
              ))}
            </div>
            <p className="mt-3 text-sm text-gris">{materiales.find((m) => m.id === material)?.resumen}</p>
            {evento ? (
              <div className="mt-5 border-t border-linea pt-4">
                <label className="flex items-start gap-3">
                  <input type="checkbox" checked={cordon} onChange={(e) => setCordon(e.target.checked)} className="mt-1 size-4 accent-rojo" />
                  <span>
                    <span className="font-semibold">Agregar cordón con broche (+{pesos(precioCordon)} por pieza)</span>
                    <span className="block text-sm text-gris">Uno por gafete, del color de la categoría de cada persona.</span>
                  </span>
                </label>
                {cordones.length ? (
                  <ul className="mt-3 flex flex-wrap gap-2 text-sm">
                    {cordones.map((x) => (
                      <li key={x.categoria} className="inline-flex items-center gap-2 rounded-full border border-linea px-3 py-1">
                        <span aria-hidden className="size-3.5 rounded-full ring-1 ring-linea" style={{ background: x.color }} />
                        {x.piezas.toLocaleString("es-MX")} {nombreColor(x.color).toLocaleLowerCase("es-MX")} · {x.categoria}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </Paso>
        ) : null}

        {impreso ? (
          <Paso numero={5} titulo="¿A dónde lo enviamos?">
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
        ) : null}

        <Paso numero={impreso ? 6 : 4} titulo="¿A nombre de quién facturamos?">
          <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Datos de facturación">
            {fiscales.map((f) => (
              <button key={f.id} type="button" aria-pressed={f.id === facturacion} onClick={() => setFacturacion(f.id)} className={tarjeta(f.id === facturacion)}>
                <span className="block font-semibold">{f.titulo}</span>
                <span className="block text-gris">{f.texto}</span>
              </button>
            ))}
            <button type="button" aria-pressed={!facturacion} onClick={() => setFacturacion("")} className={tarjeta(!facturacion)}>
              <span className="block font-semibold">No necesito factura</span>
              <span className="block text-gris">Puedes pedirla después, {site.plazoFactura}.</span>
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
        {piezas ? <p className="text-sm text-gris">{modalidades.find((m) => m.id === modalidad)?.nombre}</p> : null}
        {(impreso && (enSaldo.gafetes || enSaldo.envios)) || (digital && enSaldo.digitales) ? (
          <p className="mt-2 text-sm text-gris">
            Tienes{" "}
            {[
              impreso && enSaldo.gafetes ? `${enSaldo.gafetes.toLocaleString("es-MX")} ${enSaldo.gafetes === 1 ? "gafete impreso" : "gafetes impresos"}` : null,
              impreso && enSaldo.envios ? `${enSaldo.envios} ${enSaldo.envios === 1 ? "envío" : "envíos"}` : null,
              digital && enSaldo.digitales ? `${enSaldo.digitales.toLocaleString("es-MX")} ${enSaldo.digitales === 1 ? "gafete digital" : "gafetes digitales"}` : null,
            ]
              .filter(Boolean)
              .join(", ")
              .replace(/, ([^,]*)$/, " y $1")}{" "}
            prepagados. Se usan primero. Los impresos solo cubren gafetes iguales a los que compraste
            (mismas caras y mismo material); lo distinto, como frente y vuelta, otro material o cordón,
            se cobra aparte, a precio normal.
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
            {impreso ? (
              <div className="flex justify-between gap-3 border-t border-linea pt-2">
                <dt>Envío a todo México</dt>
                <dd>{c.envioDeSaldo ? "De tu saldo" : c.envioGratis ? "Gratis" : pesos(c.envio)}</dd>
              </div>
            ) : null}
            <div className={`flex justify-between gap-3 ${impreso ? "" : "border-t border-linea pt-2"}`}>
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
          {evento && impreso && evento.limite < hoyIso()
            ? `Ojo: pasó la fecha límite para pedir (${fechaEvento(evento.limite)}). Con envío estándar podría no llegar antes del ${fechaEvento(evento.inicio)}; escríbenos antes de pagar. `
            : evento && impreso
              ? `Pidiendo hoy, tus gafetes llegan antes del evento (${fechaEvento(evento.inicio)}). `
              : ""}
          {impreso
            ? `Empezamos a producir cuando se confirma tu pago; la entrega es en ${entregaTexto}.${digital ? " Los gafetes digitales se activan al confirmarse el pago." : ""}`
            : "Los gafetes digitales se activan al confirmarse el pago, sin envío."}
        </p>

        <label className="mt-4 flex items-start gap-3 text-sm">
          <input type="checkbox" checked={aprobado} onChange={(e) => setAprobado(e.target.checked)} className="mt-1 size-4 accent-rojo" />
          <span>
            Revisé la vista previa de mis gafetes y credenciales, los datos son correctos y apruebo que se{" "}
            {impreso ? (digital ? "impriman y se activen en digital" : "impriman") : "activen en digital"} tal como se ven.
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
