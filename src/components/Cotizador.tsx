"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { registrarConversion } from "@/lib/anuncios";
import { leerOrigen } from "@/lib/origen";
import { carritoMaximoPiezas } from "@/lib/carrito";
import { condiciones, nombreArchivo, nuevoFolio, renglones, totales } from "@/lib/cotizacion";
import { grosorTexto, type MaterialId, materiales } from "@/lib/materiales";
import {
  cotizar,
  extraDosCaras,
  envio,
  type Modalidad,
  modalidades,
  paqueteVigenciaMeses,
  paquetes,
  pesos,
  precioPaquete,
  tramos,
  textoEnvios,
  textoEnviosIncluidos,
} from "@/lib/precios";
import { entregaTexto } from "@/lib/site";
import { ArmaPaquete } from "./ArmaPaquete";
import { BotonAgregar } from "./carrito/BotonAgregar";
import { IncluyePaquete } from "./IncluyePaquete";
import { MuestraMaterial } from "./MuestraMaterial";
import { VistaGafete } from "./VistaGafete";

type Estado = { tipo: "inactivo" | "enviando" | "listo" | "error"; mensaje?: string };

const hoy = () => new Date().toISOString().slice(0, 10);

const CANTIDAD_MAXIMA = 100000;

/**
 * Cotizador completo: precio por pieza, envío, IVA, total y entrega a la vista.
 * La cotización se puede descargar en PDF o recibir por correo.
 */
export function Cotizador() {
  // Lo que está escrito en el campo, que puede quedar vacío mientras la persona teclea.
  const [piezas, setPiezas] = useState("30");
  const cantidad = Math.min(CANTIDAD_MAXIMA, Math.max(1, Number.parseInt(piezas, 10) || 1));
  const [modalidad, setModalidad] = useState<Modalidad>("impreso");
  const [dosCaras, setDosCaras] = useState(false);
  const [material, setMaterial] = useState<MaterialId>("estandar");
  // Dos caminos: elegir las piezas que se necesitan hoy, o un paquete prepagado.
  const [modo, setModo] = useState<"piezas" | "paquetes">("piezas");
  // Piezas del paquete de lista elegido, o "medida" para armar uno propio.
  const [paqueteElegido, setPaqueteElegido] = useState<number | "medida">(25);
  const [empresa, setEmpresa] = useState("");
  const [correo, setCorreo] = useState("");
  const [sitioWeb, setSitioWeb] = useState("");
  const [generando, setGenerando] = useState(false);
  const [estado, setEstado] = useState<Estado>({ tipo: "inactivo" });

  // Los paquetes son de gafetes impresos.
  const enPaquetes = modo === "paquetes";
  const paqueteActivo = enPaquetes && typeof paqueteElegido === "number" ? paqueteElegido : null;
  const opciones = {
    modalidad: enPaquetes ? ("impreso" as const) : modalidad,
    dosCaras,
    material,
    paquete: paqueteActivo ?? undefined,
  };
  const c = cotizar(cantidad, opciones);
  const siguiente = c.paquete ? undefined : tramos.find((t) => t.desde > c.piezas);
  const ahorro = siguiente ? c.porPieza - cotizar(siguiente.desde, opciones).porPieza : 0;
  // Pedidos chicos: se sugiere el paquete prepagado más pequeño que los cubre.
  const paquete = !enPaquetes && modalidad === "impreso" && c.piezas < paquetes[0].piezas ? paquetes[0] : null;

  function verPaquetes(piezasPaquete: number | "medida") {
    setModo("paquetes");
    setPaqueteElegido(piezasPaquete);
  }

  // Los pasos se numeran según lo que se muestra en cada camino.
  let pasos = 0;
  const paso = () => ++pasos;

  async function descargarPdf() {
    setGenerando(true);
    try {
      const datos = {
        cotizacion: c,
        folio: nuevoFolio(),
        fecha: hoy(),
        empresa: empresa.trim() || undefined,
      };
      const [{ generarPdfCotizacion }, logo] = await Promise.all([
        import("@/lib/cotizacion-pdf"),
        fetch("/marca/lagafeteria-horizontal-color.png")
          .then((r) => (r.ok ? r.arrayBuffer() : undefined))
          .catch(() => undefined),
      ]);
      const bytes = await generarPdfCotizacion(datos, logo);
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = nombreArchivo(datos);
      enlace.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      registrarConversion("cotizacion");
      // Para el panel: qué se cotizó y de qué anuncio llegó. Sin datos de la persona.
      fetch("/api/cotizacion/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folio: datos.folio, cantidad: c.piezas, ...opciones, empresa, origen: leerOrigen() }),
        keepalive: true,
      }).catch(() => {});
    } finally {
      setGenerando(false);
    }
  }

  async function enviarPorCorreo(evento: FormEvent) {
    evento.preventDefault();
    setEstado({ tipo: "enviando" });
    try {
      const respuesta = await fetch("/api/cotizacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, cantidad: c.piezas, ...opciones, empresa, sitioWeb, origen: leerOrigen() }),
      });
      const datos = await respuesta.json().catch(() => ({}));
      if (respuesta.ok) registrarConversion("cotizacion");
      setEstado(
        respuesta.ok
          ? { tipo: "listo", mensaje: `Listo. Enviamos tu cotización a ${correo}.` }
          : { tipo: "error", mensaje: datos.mensaje ?? "No pudimos enviar el correo." },
      );
    } catch {
      setEstado({ tipo: "error", mensaje: "No pudimos enviar el correo. Revisa tu conexión." });
    }
  }

  const opcion = (activa: boolean) =>
    `block cursor-pointer rounded-tarjeta-chica border px-4 py-3 ${
      activa ? "border-tinta bg-tinta text-white" : "border-linea hover:border-tinta"
    }`;

  const chip = (activo: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
      activo ? "border-tinta bg-tinta text-white" : "border-linea bg-white hover:border-tinta"
    }`;

  const caminos = [
    {
      id: "piezas" as const,
      nombre: "Elegir por pieza",
      resumen: "Compras justo los gafetes que necesitas hoy.",
    },
    {
      id: "paquetes" as const,
      nombre: "Paquetes prepagados",
      resumen: `Pagas hoy y los pides de a poquitos durante ${paqueteVigenciaMeses} meses, con envíos incluidos.`,
    },
  ];

  return (
    <div className="space-y-8">
      <fieldset className="min-w-0">
        <legend className="font-semibold">¿Cómo quieres comprar?</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {caminos.map((m) => (
            <label key={m.id} className={opcion(modo === m.id)}>
              <input
                type="radio"
                name="modo"
                className="sr-only"
                checked={modo === m.id}
                onChange={() => setModo(m.id)}
              />
              <span className="block text-lg font-semibold">{m.nombre}</span>
              <span className={`block text-sm ${modo === m.id ? "text-white/75" : "text-gris"}`}>{m.resumen}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {enPaquetes ? (
        <fieldset className="min-w-0">
          <legend className="font-semibold">¿Qué paquete?</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {paquetes.map((p) => (
              <label key={p.piezas} className={`cursor-pointer ${chip(paqueteElegido === p.piezas)}`}>
                <input
                  type="radio"
                  name="paquete"
                  className="sr-only"
                  checked={paqueteElegido === p.piezas}
                  onChange={() => setPaqueteElegido(p.piezas)}
                />
                {p.piezas} gafetes
                <span className={`font-normal ${paqueteElegido === p.piezas ? "text-white/75" : "text-gris"}`}>
                  {" "}· {pesos(p.porPieza)} c/u
                </span>
              </label>
            ))}
            <label className={`cursor-pointer ${chip(paqueteElegido === "medida")}`}>
              <input
                type="radio"
                name="paquete"
                className="sr-only"
                checked={paqueteElegido === "medida"}
                onChange={() => setPaqueteElegido("medida")}
              />
              A la medida
              <span className={`font-normal ${paqueteElegido === "medida" ? "text-white/75" : "text-gris"}`}>
                {" "}· combina tipos
              </span>
            </label>
          </div>
          <p className="mt-2 text-sm text-gris">
            {c.paquete
              ? `Pagas hoy los ${c.paquete.piezas} gafetes y los pides cuando quieras, en uno o varios pedidos, con ${textoEnviosIncluidos(c.paquete.envios)}. El precio por pieza no cambia aunque pidas de uno en uno. Los paquetes de lista son de PVC estándar a una cara; para frente y vuelta u otro material, arma uno a la medida.`
              : "Arma tu paquete con varios tipos de gafete: cada uno con su cantidad, su impresión y su material. Cada gafete prepagado cubre solo un gafete igual al que elegiste."}
          </p>
        </fieldset>
      ) : null}

      {enPaquetes && paqueteElegido === "medida" ? (
        <ArmaPaquete enCotizador />
      ) : (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      <div className="min-w-0 space-y-7">
        {!enPaquetes ? (
        <>
        <fieldset className="min-w-0">
          <legend className="font-semibold">{paso()}. ¿Qué necesitas?</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {modalidades.map((m) => (
              <label key={m.id} className={opcion(modalidad === m.id)}>
                <input
                  type="radio"
                  name="modalidad"
                  className="sr-only"
                  checked={modalidad === m.id}
                  onChange={() => setModalidad(m.id)}
                />
                <span className="block font-semibold">{m.nombre}</span>
                <span className={`block text-sm ${modalidad === m.id ? "text-white/75" : "text-gris"}`}>
                  {m.resumen}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block">
          <span className="block font-semibold">{paso()}. ¿Cuántos gafetes?</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={CANTIDAD_MAXIMA}
            value={piezas}
            // Solo dígitos y sin ceros a la izquierda: "010" se vuelve "10".
            onChange={(e) => setPiezas(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 6))}
            // Al salir, el campo muestra la cantidad con la que se cotizó (mínimo 1).
            onBlur={() => setPiezas(String(cantidad))}
            className="mt-3 w-full max-w-48 rounded-tarjeta-chica border border-linea px-4 py-3 text-lg font-semibold"
          />
          {siguiente && ahorro > 0 ? (
            <span className="mt-2 block text-sm text-gris">
              Desde {siguiente.desde} piezas, cada una baja {pesos(ahorro)}.
            </span>
          ) : null}
        </label>
        </>
        ) : null}

        {c.paquete ? <IncluyePaquete compacto /> : null}

        {c.llevaEnvio && !c.paquete ? (
          <fieldset className="min-w-0">
            <legend className="font-semibold">{paso()}. Impresión</legend>
            <div className="mt-3 grid max-w-md grid-cols-2 gap-2">
              {[
                { valor: false, texto: "Una cara" },
                { valor: true, texto: "Frente y vuelta" },
              ].map((o) => (
                <label key={o.texto} className={`${opcion(dosCaras === o.valor)} text-center font-medium`}>
                  <input
                    type="radio"
                    name="caras"
                    className="sr-only"
                    checked={dosCaras === o.valor}
                    onChange={() => setDosCaras(o.valor)}
                  />
                  {o.texto}
                </label>
              ))}
            </div>
            <p className="mt-2 text-sm text-gris">
              Frente y vuelta suma {pesos(extraDosCaras(c.piezas))} por pieza con esta cantidad.
            </p>
          </fieldset>
        ) : null}

        {c.llevaEnvio && !c.paquete ? (
          <fieldset className="min-w-0">
            <legend className="font-semibold">{paso()}. Material</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {materiales.map((m) => {
                const activo = material === m.id;
                return (
                  <label
                    key={m.id}
                    className={`flex items-center gap-3 rounded-tarjeta-chica border p-3 ${
                      m.disponible
                        ? activo
                          ? "cursor-pointer border-tinta ring-2 ring-tinta"
                          : "cursor-pointer border-linea hover:border-tinta"
                        : "border-dashed border-linea text-gris"
                    }`}
                  >
                    <input
                      type="radio"
                      name="material"
                      className="sr-only"
                      disabled={!m.disponible}
                      checked={activo}
                      onChange={() => setMaterial(m.id)}
                    />
                    <MuestraMaterial material={m} className="w-20 shrink-0" />
                    <span className="min-w-0">
                      <span className="block font-semibold">{m.nombre}</span>
                      <span className="block text-sm text-gris">{grosorTexto(m)}</span>
                      {m.disponible ? (
                        <span className="block text-sm font-medium">
                          {m.extra > 0 ? `+${pesos(m.extra)} por pieza` : "Incluido"}
                        </span>
                      ) : (
                        <span className="mt-0.5 inline-block rounded-full bg-resaltador px-2 py-0.5 text-xs font-semibold text-tinta">
                          Próximamente
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
            <p className="mt-2 text-sm text-gris">
              {c.material?.resumen}{" "}
              <Link href="/materiales" className="underline">
                Comparar materiales
              </Link>
            </p>
          </fieldset>
        ) : null}

        <fieldset className="min-w-0">
          <legend className="font-semibold">{paso()}. Entrega</legend>
          <div className="mt-3 grid max-w-md grid-cols-2 gap-2">
            <label className={opcion(true)}>
              <input type="radio" name="entrega" className="sr-only" checked readOnly />
              <span className="block font-semibold">Estándar</span>
              <span className="block text-sm text-white/75">
                {c.paquete ? `${entregaTexto} por pedido` : c.llevaEnvio ? entregaTexto : "Se activan en tu plataforma"}
              </span>
            </label>
            <div
              aria-disabled="true"
              className="rounded-tarjeta-chica border border-dashed border-linea px-4 py-3 text-gris"
            >
              <span className="block font-semibold">Exprés</span>
              <span className="mt-0.5 inline-block rounded-full bg-resaltador px-2 py-0.5 text-xs font-semibold text-tinta">
                Próximamente
              </span>
            </div>
          </div>
        </fieldset>

        {c.llevaEnvio ? <VistaGafete material={c.material} /> : null}
      </div>

      <div className="min-w-0 self-start rounded-tarjeta border border-linea bg-white p-6 shadow-sm sm:p-7">
        <h2 className="text-xl font-extrabold">{c.paquete ? `Tu paquete de ${c.paquete.piezas} gafetes` : "Tu cotización"}</h2>
        <div aria-live="polite">
          <table className="mt-4 w-full text-sm">
            <caption className="sr-only">Desglose de tu cotización</caption>
            <tbody>
              {renglones(c).map((r) => (
                <tr key={r.concepto} className="border-b border-linea">
                  <th scope="row" className="py-2 pr-2 text-left font-normal">
                    {r.concepto}
                    <span className="block text-xs text-gris">
                      {r.cantidad.toLocaleString("es-MX")} × {r.porPieza}
                    </span>
                  </th>
                  <td className="py-2 text-right align-top font-medium">{r.importe}</td>
                </tr>
              ))}
              {totales(c).map((t) => (
                <tr key={t.etiqueta}>
                  <th
                    scope="row"
                    className={`pt-2 text-left ${t.fuerte ? "pt-3 text-base font-bold" : "font-normal text-gris"}`}
                  >
                    {t.etiqueta}
                  </th>
                  <td
                    className={`pt-2 text-right ${
                      t.fuerte ? "pt-3 font-titulos text-3xl font-extrabold" : "font-medium"
                    }`}
                  >
                    {t.fuerte ? <span className="resaltado">{t.valor}</span> : t.valor}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {c.faltaParaEnvioGratis > 0 ? (
            <p className="mt-4 rounded-tarjeta-chica bg-papel px-4 py-3 text-sm">
              Te faltan <strong>{pesos(c.faltaParaEnvioGratis)}</strong> para que el envío sea gratis.
            </p>
          ) : null}

          {paquete ? (
            <p className="mt-3 rounded-tarjeta-chica border border-linea px-4 py-3 text-sm">
              <strong>¿Pides de a poquitos?</strong> El paquete de {paquete.piezas} gafetes cuesta{" "}
              {pesos(precioPaquete(paquete))} e incluye {textoEnvios(paquete.envios)}: usas{" "}
              {c.piezas === 1 ? "uno" : c.piezas} hoy y el resto queda a tu favor.{" "}
              <button type="button" onClick={() => verPaquetes(paquete.piezas)} className="font-semibold underline">
                Ver paquetes
              </button>
            </p>
          ) : null}

          <p className="mt-4 text-sm text-gris">
            {c.paquete
              ? `Los usas cuando quieras durante ${paqueteVigenciaMeses} meses; cada pedido llega en ${entregaTexto} a cualquier parte de México. No es reembolsable y sí se puede transferir a otra empresa.`
              : c.llevaEnvio
              ? `Entrega en ${entregaTexto} a cualquier parte de México, a partir del pago y de que apruebes la vista previa.`
              : "Los gafetes digitales no llevan envío: se activan en tu plataforma."}{" "}
            {c.modalidad === "impreso" ? "Pago único, sin suscripción." : "Pago único, sin suscripción: el gafete digital se paga una sola vez, no cada mes."}
          </p>
        </div>

        <div className="mt-6 border-t border-linea pt-5">
          {c.piezas > carritoMaximoPiezas ? (
            <p className="rounded-tarjeta-chica bg-papel px-4 py-3 text-sm">
              En línea se compran hasta {carritoMaximoPiezas.toLocaleString("es-MX")} gafetes a la vez. Agrega dos compras al carrito o descarga la cotización.
            </p>
          ) : (
            <BotonAgregar
              articulo={
                !c.paquete
                  ? { tipo: "gafetes", piezas: c.piezas, modalidad: c.modalidad, dosCaras: c.dosCaras, material }
                  : { tipo: "paquete", piezas: c.paquete.piezas }
              }
            />
          )}
          <p className="mt-2 text-xs text-gris">
            Pagas ahora y tus gafetes quedan a tu favor: subes a tu equipo y tu diseño cuando quieras, y los pides o activas desde tu plataforma.
          </p>
        </div>

        <div className="mt-6 border-t border-linea pt-5">
          <label className="block">
            <span className="text-sm font-semibold">Empresa (opcional, aparece en la cotización)</span>
            <input
              type="text"
              maxLength={80}
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              autoComplete="organization"
              className="mt-2 w-full rounded-tarjeta-chica border border-linea px-4 py-2.5"
            />
          </label>

          <button
            type="button"
            onClick={descargarPdf}
            disabled={generando}
            className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-tinta px-6 py-3 font-semibold transition-colors hover:bg-papel disabled:opacity-60"
          >
            {generando ? "Generando PDF…" : "Descargar cotización en PDF"}
          </button>

          <form onSubmit={enviarPorCorreo} className="mt-5">
            <label className="block">
              <span className="text-sm font-semibold">O recíbela en tu correo</span>
              <span className="mt-2 flex gap-2">
                <input
                  type="email"
                  required
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder="tu@empresa.com"
                  autoComplete="email"
                  className="min-w-0 flex-1 rounded-tarjeta-chica border border-linea px-4 py-2.5"
                />
                <button
                  type="submit"
                  disabled={estado.tipo === "enviando"}
                  className="shrink-0 rounded-full border border-tinta px-5 py-2.5 font-semibold transition-colors hover:bg-papel disabled:opacity-60"
                >
                  {estado.tipo === "enviando" ? "Enviando…" : "Enviar"}
                </button>
              </span>
            </label>
            {/* Campo trampa para bots: oculto para personas y lectores de pantalla. */}
            <input
              type="text"
              name="sitioWeb"
              value={sitioWeb}
              onChange={(e) => setSitioWeb(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="hidden"
            />
            <p role="status" className={`mt-2 text-sm ${estado.tipo === "error" ? "text-rojo-oscuro" : "text-gris"}`}>
              {estado.mensaje ?? (
                <>
                  Usamos tu correo solo para enviarte esta cotización y darle seguimiento. Consulta el{" "}
                  <Link href="/aviso-de-privacidad" className="underline">
                    aviso de privacidad
                  </Link>
                  .
                </>
              )}
            </p>
          </form>
        </div>

        <ul className="mt-5 space-y-1 border-t border-linea pt-4 text-xs text-gris">
          {condiciones({ cotizacion: c, folio: "", fecha: hoy() })
            .slice(1, -1)
            .map((n) => (
              <li key={n}>{n}</li>
            ))}
          {envio.gratisDesde > 0 && c.envioGratis ? <li>Tu pedido ya tiene envío gratis.</li> : null}
        </ul>
      </div>
    </div>
      )}
    </div>
  );
}
