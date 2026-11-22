"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { limitesContacto, type MotivoContacto, motivosContacto } from "@/lib/contacto";

type Estado =
  | { tipo: "inactivo" | "enviando" }
  | { tipo: "listo" }
  | { tipo: "error"; mensaje: string };

const entrada = "mt-2 w-full rounded-tarjeta-chica border border-linea bg-white px-4 py-2.5";

/**
 * Formulario de contacto. Envía a /api/contacto, que lo manda por correo al
 * buzón del sitio. El precio no se pide aquí: para eso está el cotizador.
 */
export function FormularioContacto({ correoSitio }: { correoSitio: string }) {
  const [motivo, setMotivo] = useState<MotivoContacto>(motivosContacto[0]);
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [telefono, setTelefono] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [sitioWeb, setSitioWeb] = useState("");
  const [estado, setEstado] = useState<Estado>({ tipo: "inactivo" });

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setEstado({ tipo: "enviando" });
    try {
      const respuesta = await fetch("/api/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo, nombre, correo, empresa, telefono, mensaje, sitioWeb }),
      });
      const datos = await respuesta.json().catch(() => ({}));
      setEstado(
        respuesta.ok
          ? { tipo: "listo" }
          : { tipo: "error", mensaje: datos.mensaje ?? "No pudimos enviar tu mensaje." },
      );
    } catch {
      setEstado({
        tipo: "error",
        mensaje: `No pudimos enviar tu mensaje. Revisa tu conexión o escríbenos a ${correoSitio}.`,
      });
    }
  }

  if (estado.tipo === "listo") {
    return (
      <div role="status" className="self-start rounded-tarjeta border border-linea bg-papel p-8">
        <p className="font-mano text-3xl text-rojo">¡Gracias, {nombre.split(" ")[0]}!</p>
        <h2 className="mt-2 text-2xl font-extrabold">Recibimos tu mensaje</h2>
        <p className="mt-3 text-gris">
          Te respondemos a <strong className="text-tinta">{correo}</strong> lo antes posible. Mientras
          tanto, puedes ver tu precio al momento en el cotizador en línea.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/cotizar"
            className="inline-flex items-center justify-center rounded-full bg-rojo px-6 py-3 font-semibold text-white transition-colors hover:bg-rojo-oscuro"
          >
            Ir al cotizador en línea
          </Link>
          <button
            type="button"
            onClick={() => {
              setMensaje("");
              setEstado({ tipo: "inactivo" });
            }}
            className="inline-flex items-center justify-center rounded-full border border-tinta px-6 py-3 font-semibold transition-colors hover:bg-white"
          >
            Enviar otro mensaje
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="rounded-tarjeta border border-linea p-6 sm:p-8">
      <fieldset>
        <legend className="text-sm font-semibold">¿Sobre qué nos escribes?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {motivosContacto.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={motivo === m}
              onClick={() => setMotivo(m)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                motivo === m ? "border-tinta bg-tinta text-white" : "border-linea bg-white hover:border-tinta"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold">Tu nombre</span>
          <input
            type="text"
            required
            minLength={2}
            maxLength={limitesContacto.nombre}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoComplete="name"
            className={entrada}
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Tu correo</span>
          <input
            type="email"
            required
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="tu@empresa.com"
            autoComplete="email"
            className={entrada}
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">
            Empresa <span className="font-normal text-gris">(opcional)</span>
          </span>
          <input
            type="text"
            maxLength={limitesContacto.empresa}
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
            autoComplete="organization"
            className={entrada}
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">
            Teléfono o WhatsApp <span className="font-normal text-gris">(opcional)</span>
          </span>
          <input
            type="tel"
            maxLength={limitesContacto.telefono}
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            autoComplete="tel"
            className={entrada}
          />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="text-sm font-semibold">Tu mensaje</span>
        <textarea
          required
          minLength={10}
          maxLength={limitesContacto.mensaje}
          rows={6}
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          placeholder="Cuéntanos qué necesitas."
          className={entrada}
        />
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

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={estado.tipo === "enviando"}
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-rojo px-7 py-3 font-semibold text-white transition-colors hover:bg-rojo-oscuro disabled:opacity-60"
        >
          {estado.tipo === "enviando" ? "Enviando…" : "Enviar mensaje"}
        </button>
        <p
          role="status"
          className={`text-sm ${estado.tipo === "error" ? "font-semibold text-rojo-oscuro" : "text-gris"}`}
        >
          {estado.tipo === "error" ? (
            estado.mensaje
          ) : (
            <>
              Usamos tus datos solo para responderte. Consulta el{" "}
              <Link href="/aviso-de-privacidad" className="underline">
                aviso de privacidad
              </Link>
              .
            </>
          )}
        </p>
      </div>
    </form>
  );
}
