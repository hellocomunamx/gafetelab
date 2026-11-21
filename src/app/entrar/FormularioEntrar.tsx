"use client";

import { useActionState } from "react";
import { type EstadoAcceso, entrarConProveedor, pedirAcceso, verificarCodigo } from "./acciones";

const NOMBRES = { google: "Google", azure: "Microsoft" } as const;
const entrada =
  "mt-2 w-full rounded-tarjeta-chica border border-linea px-4 py-3 text-lg";
const boton =
  "mt-4 inline-flex w-full items-center justify-center rounded-full bg-rojo px-6 py-3 font-semibold text-white transition-colors hover:bg-rojo-oscuro disabled:opacity-60";

export function FormularioEntrar({
  proveedores,
  aviso,
}: {
  proveedores: (keyof typeof NOMBRES)[];
  aviso?: string;
}) {
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

  return (
    <div>
      <form action={pedir}>
        <label className="block">
          <span className="font-semibold">Tu correo de trabajo</span>
          <input
            type="email"
            name="correo"
            required
            autoComplete="email"
            defaultValue={pedido.correo}
            placeholder="tu@empresa.com"
            className={entrada}
          />
        </label>
        <p role="alert" className="mt-2 min-h-5 text-sm text-rojo-oscuro">{pedido.error ?? aviso}</p>
        <button type="submit" disabled={pidiendo} className={boton}>
          {pidiendo ? "Enviando…" : "Enviarme mi acceso"}
        </button>
        <p className="mt-3 text-sm text-gris">
          Sin contraseñas: te llega una liga y un código de un solo uso. Si es tu primera vez, tu
          cuenta se crea sola.
        </p>
      </form>

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
