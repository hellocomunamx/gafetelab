"use client";

import { useActionState, useState } from "react";
import {
  type EstadoAcceso,
  entrarConContrasena,
  entrarConProveedor,
  pedirAcceso,
  verificarCodigo,
} from "./acciones";

const NOMBRES = { google: "Google", azure: "Microsoft" } as const;
const entrada =
  "mt-2 w-full rounded-tarjeta-chica border border-linea px-4 py-3 text-lg";
const boton =
  "mt-4 inline-flex w-full items-center justify-center rounded-full bg-rojo px-6 py-3 font-semibold text-white transition-colors hover:bg-rojo-oscuro disabled:opacity-60";

const MODOS = [
  { id: "liga", texto: "Con liga por correo" },
  { id: "contrasena", texto: "Con contraseña" },
] as const;

export function FormularioEntrar({
  proveedores,
  aviso,
  correoInicial,
}: {
  proveedores: (keyof typeof NOMBRES)[];
  aviso?: string;
  /** Correo ya escrito, por ejemplo al llegar desde una invitación. */
  correoInicial?: string;
}) {
  const [modo, setModo] = useState<(typeof MODOS)[number]["id"]>("liga");
  const [correo, setCorreo] = useState(correoInicial ?? "");
  const [conClave, entrar, entrando] = useActionState<EstadoAcceso, FormData>(entrarConContrasena, {
    paso: "correo",
  });
  const [pedido, pedir, pidiendo] = useActionState<EstadoAcceso, FormData>(pedirAcceso, {
    paso: "correo",
  });
  const [verificado, verificar, verificando] = useActionState<EstadoAcceso, FormData>(
    verificarCodigo,
    { paso: "codigo" },
  );

  if (pedido.paso === "codigo") {
    return (
      <div>
        <p className="rounded-tarjeta-chica bg-papel px-4 py-3">
          Te enviamos un correo a <strong>{pedido.correo}</strong> con una liga y un código. Abre la
          liga o escribe aquí el código.
        </p>
        <form action={verificar} className="mt-5">
          <input type="hidden" name="correo" value={pedido.correo} />
          <label className="block">
            <span className="font-semibold">Código de 6 dígitos</span>
            <input
              name="codigo"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9 ]*"
              maxLength={8}
              required
              autoFocus
              className={`${entrada} tracking-[0.3em]`}
            />
          </label>
          <p role="alert" className="mt-2 min-h-5 text-sm text-rojo-oscuro">{verificado.error}</p>
          <button type="submit" disabled={verificando} className={boton}>
            {verificando ? "Entrando…" : "Entrar"}
          </button>
        </form>
        <form action={pedir} className="mt-4 text-center text-sm">
          <input type="hidden" name="correo" value={pedido.correo} />
          <button type="submit" disabled={pidiendo} className="underline">
            {pidiendo ? "Enviando…" : "Enviar otro correo"}
          </button>
        </form>
      </div>
    );
  }

  const campoCorreo = (
    <label className="block">
      <span className="font-semibold">Tu correo de trabajo</span>
      <input
        type="email"
        name="correo"
        required
        autoComplete={modo === "contrasena" ? "username" : "email"}
        value={correo}
        onChange={(e) => setCorreo(e.target.value)}
        placeholder="tu@empresa.com"
        className={entrada}
      />
    </label>
  );

  return (
    <div>
      <div role="group" aria-label="Cómo quieres entrar" className="mb-5 flex flex-wrap gap-2">
        {MODOS.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={modo === m.id}
            onClick={() => setModo(m.id)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
              modo === m.id ? "border-tinta bg-tinta text-white" : "border-linea bg-white hover:border-tinta"
            }`}
          >
            {m.texto}
          </button>
        ))}
      </div>

      {modo === "liga" ? (
        <form action={pedir}>
          {campoCorreo}
          <p role="alert" className="mt-2 min-h-5 text-sm text-rojo-oscuro">{pedido.error ?? aviso}</p>
          <button type="submit" disabled={pidiendo} className={boton}>
            {pidiendo ? "Enviando…" : "Enviarme mi acceso"}
          </button>
          <p className="mt-3 text-sm text-gris">
            Te llega una liga y un código de un solo uso. Si es tu primera vez, tu cuenta se crea
            sola.
          </p>
        </form>
      ) : (
        <form action={entrar}>
          {campoCorreo}
          <label className="mt-4 block">
            <span className="font-semibold">Tu contraseña</span>
            <input
              type="password"
              name="contrasena"
              required
              maxLength={72}
              autoComplete="current-password"
              className={entrada}
            />
          </label>
          <p role="alert" className="mt-2 min-h-5 text-sm text-rojo-oscuro">{conClave.error}</p>
          <button type="submit" disabled={entrando} className={boton}>
            {entrando ? "Entrando…" : "Entrar"}
          </button>
          <p className="mt-3 text-sm text-gris">
            ¿Es tu primera vez, no tienes contraseña o la olvidaste?{" "}
            <button type="button" onClick={() => setModo("liga")} className="font-semibold text-tinta underline">
              Entra con la liga por correo
            </button>{" "}
            y créala en Mi acceso.
          </p>
        </form>
      )}

      {proveedores.length > 0 ? (
        <div className="mt-6 border-t border-linea pt-6">
          {proveedores.map((p) => (
            <form key={p} action={entrarConProveedor} className="mt-2">
              <input type="hidden" name="proveedor" value={p} />
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-full border border-tinta px-6 py-3 font-semibold transition-colors hover:bg-papel"
              >
                Entrar con {NOMBRES[p]}
              </button>
            </form>
          ))}
        </div>
      ) : null}
    </div>
  );
}
