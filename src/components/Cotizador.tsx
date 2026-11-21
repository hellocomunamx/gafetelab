"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { condiciones, nombreArchivo, nuevoFolio, renglones, totales } from "@/lib/cotizacion";
import {
  cotizar,
  envio,
  type Modalidad,
  modalidades,
  pesos,
  tramos,
} from "@/lib/precios";
import { entregaTexto } from "@/lib/site";

type Estado = { tipo: "inactivo" | "enviando" | "listo" | "error"; mensaje?: string };

const hoy = () => new Date().toISOString().slice(0, 10);

/**
 * Cotizador completo: precio por pieza, envío, IVA, total y entrega a la vista.
 * La cotización se puede descargar en PDF o recibir por correo.
 */
export function Cotizador() {
  const [cantidad, setCantidad] = useState(30);
  const [modalidad, setModalidad] = useState<Modalidad>("impreso");
  const [dosCaras, setDosCaras] = useState(false);
  const [empresa, setEmpresa] = useState("");
  const [correo, setCorreo] = useState("");
  const [sitioWeb, setSitioWeb] = useState("");
  const [generando, setGenerando] = useState(false);
  const [estado, setEstado] = useState<Estado>({ tipo: "inactivo" });

  const c = cotizar(cantidad, { modalidad, dosCaras });
  const siguiente = tramos.find((t) => t.desde > c.piezas);
  const ahorro = siguiente
    ? c.porPieza - cotizar(siguiente.desde, { modalidad, dosCaras }).porPieza
    : 0;

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
        body: JSON.stringify({ correo, cantidad: c.piezas, modalidad, dosCaras, empresa, sitioWeb }),
      });
      const datos = await respuesta.json().catch(() => ({}));
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

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      <div className="min-w-0 space-y-7">
        <fieldset className="min-w-0">
          <legend className="font-semibold">1. ¿Qué necesitas?</legend>
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
          <span className="block font-semibold">2. ¿Cuántos gafetes?</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={100000}
            value={cantidad}
            onChange={(e) => setCantidad(Number(e.target.value))}
            className="mt-3 w-full max-w-48 rounded-tarjeta-chica border border-linea px-4 py-3 text-lg font-semibold"
          />
          {siguiente && ahorro > 0 ? (
            <span className="mt-2 block text-sm text-gris">
              Desde {siguiente.desde} piezas, cada una baja {pesos(ahorro)}.
            </span>
          ) : null}
        </label>

        {c.llevaEnvio ? (
          <fieldset className="min-w-0">
            <legend className="font-semibold">3. Impresión</legend>
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
          </fieldset>
        ) : null}

        <fieldset className="min-w-0">
          <legend className="font-semibold">{c.llevaEnvio ? "4" : "3"}. Entrega</legend>
          <div className="mt-3 grid max-w-md grid-cols-2 gap-2">
            <label className={opcion(true)}>
              <input type="radio" name="entrega" className="sr-only" checked readOnly />
              <span className="block font-semibold">Estándar</span>
              <span className="block text-sm text-white/75">
                {c.llevaEnvio ? entregaTexto : "Se activan en tu plataforma"}
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
      </div>

      <div className="min-w-0 rounded-tarjeta border border-linea bg-white p-6 shadow-sm sm:p-7">
        <h2 className="text-xl font-extrabold">Tu cotización</h2>
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

          <p className="mt-4 text-sm text-gris">
            {c.llevaEnvio
              ? `Entrega en ${entregaTexto} a cualquier parte de México, a partir del pago y de que apruebes la vista previa.`
              : "Los gafetes digitales no llevan envío: se activan en tu plataforma."}{" "}
            Pago único, sin suscripción.
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
            className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-rojo px-6 py-3 font-semibold text-white transition-colors hover:bg-rojo-oscuro disabled:opacity-60"
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
  );
}
