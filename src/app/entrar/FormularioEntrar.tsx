"use client";

import { useActionState, useState } from "react";
import { ConversionAlMostrar } from "@/components/EtiquetaAnuncios";
import { Turnstile } from "@/components/Turnstile";
import { LARGO_MINIMO_CONTRASENA } from "@/lib/cuenta/roles";
import {
  type EstadoAcceso,
  crearCuenta,
  entrarConContrasena,
  entrarConProveedor,
  pedirAcceso,
  verificarCodigo,
} from "./acciones";

const NOMBRES = { google: "Google", azure: "Microsoft" } as const;
const entrada = "mt-2 w-full rounded-tarjeta-chica border border-linea px-4 py-3 text-lg";
const boton =
  "mt-4 inline-flex w-full items-center justify-center rounded-full bg-rojo px-6 py-3 font-semibold text-white transition-colors hover:bg-rojo-oscuro disabled:opacity-60";
const ligaSecundaria = "font-semibold text-tinta underline";

export type Modo = "entrar" | "crear" | "liga";

const PESTANAS = [
  { id: "entrar", texto: "Iniciar sesión" },
  { id: "crear", texto: "Crear cuenta" },
] as const;

/** Desde una invitación casi siempre es la primera vez: "Crear cuenta" va primero. */
const PESTANAS_INVITACION = [
  { id: "crear", texto: "Crear cuenta" },
  { id: "entrar", texto: "Ya tengo cuenta" },
] as const;

const AVISO_CODIGO = {
  liga: "Abre la liga o escribe aquí el código para entrar.",
  olvido: "Abre la liga o escribe aquí el código para entrar; después podrás crear una contraseña nueva.",
  crear: "Abre la liga o escribe aquí el código para confirmar tu correo y entrar.",
} as const;

function LogoProveedor({ proveedor }: { proveedor: keyof typeof NOMBRES }) {
  if (proveedor === "google") {
    return (
      <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden>
      <path fill="#F25022" d="M0 0h10v10H0z" />
      <path fill="#7FBA00" d="M11 0h10v10H11z" />
      <path fill="#00A4EF" d="M0 11h10v10H0z" />
      <path fill="#FFB900" d="M11 11h10v10H11z" />
    </svg>
  );
}

export function FormularioEntrar({
  proveedores,
  aviso,
  correoInicial,
  siguiente,
  modoInicial = "entrar",
  correoFijo = false,
  invitacion = false,
}: {
  proveedores: (keyof typeof NOMBRES)[];
  aviso?: string;
  /** Correo ya escrito, por ejemplo al llegar desde una invitación. */
  correoInicial?: string;
  /** A dónde regresar al entrar (por ejemplo, al carrito). */
  siguiente?: string;
  /** Pestaña abierta al llegar. */
  modoInicial?: Modo;
  /** El correo no se puede cambiar (la invitación es para ese correo). */
  correoFijo?: boolean;
  /** Llega desde la liga de una invitación al equipo. */
  invitacion?: boolean;
}) {
  const regreso = siguiente ? <input type="hidden" name="siguiente" value={siguiente} /> : null;
  const [modo, setModo] = useState<Modo>(modoInicial);
  const [olvido, setOlvido] = useState(false);
  const [correo, setCorreo] = useState(correoInicial ?? "");
  const [conClave, entrar, entrando] = useActionState<EstadoAcceso, FormData>(entrarConContrasena, {
    paso: "correo",
  });
  const [creado, crear, creando] = useActionState<EstadoAcceso, FormData>(crearCuenta, { paso: "correo" });
  const [pedido, pedir, pidiendo] = useActionState<EstadoAcceso, FormData>(pedirAcceso, {
    paso: "correo",
  });
  const [verificado, verificar, verificando] = useActionState<EstadoAcceso, FormData>(
    verificarCodigo,
    { paso: "codigo" },
  );

  const enviado = creado.paso === "codigo" ? creado : pedido.paso === "codigo" ? pedido : null;
  if (enviado) {
    // Quien olvidó su contraseña llega a "Mi acceso" para crear otra, salvo que venga del carrito.
    const destino = siguiente ?? (enviado.motivo === "olvido" ? "/cuenta/acceso" : undefined);
    return (
      <div>
        {creado.paso === "codigo" ? <ConversionAlMostrar tipo="registro" /> : null}
        <p className="rounded-tarjeta-chica bg-papel px-4 py-3">
          Te enviamos un correo a <strong>{enviado.correo}</strong> con una liga y un código.{" "}
          {AVISO_CODIGO[enviado.motivo ?? "liga"]}
        </p>
        <form action={verificar} className="mt-5">
          <input type="hidden" name="correo" value={enviado.correo} />
          {destino ? <input type="hidden" name="siguiente" value={destino} /> : null}
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
          <input type="hidden" name="correo" value={enviado.correo} />
          <input type="hidden" name="motivo" value={enviado.motivo === "olvido" ? "olvido" : "liga"} />
          {destino ? <input type="hidden" name="siguiente" value={destino} /> : null}
          <Turnstile reinicio={pedido} />
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
        autoComplete={modo === "liga" ? "email" : "username"}
        value={correo}
        onChange={(e) => setCorreo(e.target.value)}
        readOnly={correoFijo}
        placeholder="tu@empresa.com"
        className={`${entrada}${correoFijo ? " bg-papel text-gris" : ""}`}
      />
    </label>
  );

  const cambiar = (m: Modo, deOlvido = false) => {
    setModo(m);
    setOlvido(deOlvido);
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label="Iniciar sesión o crear cuenta"
        className="-mx-6 -mt-6 mb-6 flex border-b border-linea sm:-mx-7 sm:-mt-7"
      >
        {(invitacion ? PESTANAS_INVITACION : PESTANAS).map((p) => {
          const activa = p.id === "crear" ? modo === "crear" : modo !== "crear";
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={activa}
              onClick={() => cambiar(p.id)}
              className={`flex-1 border-b-2 px-4 py-4 font-semibold transition-colors ${
                activa ? "border-rojo text-tinta" : "border-transparent text-gris hover:text-tinta"
              }`}
            >
              {p.texto}
            </button>
          );
        })}
      </div>

      {proveedores.length > 0 && modo !== "liga" ? (
        <>
          {proveedores.map((p) => (
            <form key={p} action={entrarConProveedor} className="mt-2 first:mt-0">
              <input type="hidden" name="proveedor" value={p} />
              {regreso}
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-3 rounded-full border border-linea bg-white px-6 py-3 font-semibold transition-colors hover:border-tinta hover:bg-papel"
              >
                <LogoProveedor proveedor={p} />
                Continuar con {NOMBRES[p]}
              </button>
            </form>
          ))}
          <div className="my-6 flex items-center gap-3 text-sm text-gris">
            <span className="h-px flex-1 bg-linea" />o con tu correo<span className="h-px flex-1 bg-linea" />
          </div>
        </>
      ) : null}

      {modo === "entrar" ? (
        <form action={entrar}>
          {regreso}
          {campoCorreo}
          <div className="mt-4 flex items-baseline justify-between gap-2">
            <label htmlFor="contrasena" className="font-semibold">
              Tu contraseña
            </label>
            <button
              type="button"
              onClick={() => cambiar("liga", true)}
              className="text-sm text-gris underline hover:text-tinta"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
          <input
            id="contrasena"
            type="password"
            name="contrasena"
            required
            maxLength={72}
            autoComplete="current-password"
            className={entrada}
          />
          <Turnstile reinicio={conClave} />
          <p role="alert" className="mt-2 min-h-5 text-sm text-rojo-oscuro">{conClave.error ?? aviso}</p>
          <button type="submit" disabled={entrando} className={boton}>
            {entrando ? "Entrando…" : "Iniciar sesión"}
          </button>
          <p className="mt-4 text-center text-sm text-gris">
            ¿Prefieres no usar contraseña?{" "}
            <button type="button" onClick={() => cambiar("liga")} className={ligaSecundaria}>
              Entra con una liga por correo
            </button>
          </p>
        </form>
      ) : modo === "crear" ? (
        <form action={crear}>
          {regreso}
          {campoCorreo}
          <label className="mt-4 block">
            <span className="font-semibold">Crea tu contraseña</span>
            <input
              type="password"
              name="contrasena"
              required
              minLength={LARGO_MINIMO_CONTRASENA}
              maxLength={72}
              autoComplete="new-password"
              className={entrada}
            />
            <span className="mt-1 block text-sm text-gris">Mínimo {LARGO_MINIMO_CONTRASENA} caracteres.</span>
          </label>
          <Turnstile reinicio={creado} />
          <p role="alert" className="mt-2 min-h-5 text-sm text-rojo-oscuro">{creado.error}</p>
          <button type="submit" disabled={creando} className={boton}>
            {creando ? "Creando tu cuenta…" : "Crear cuenta"}
          </button>
          <p className="mt-3 text-sm text-gris">
            Te enviaremos un correo para confirmar que es tuyo. Crear tu cuenta no tiene costo.
          </p>
        </form>
      ) : (
        <form action={pedir}>
          {regreso}
          <input type="hidden" name="motivo" value={olvido ? "olvido" : "liga"} />
          <p className="mb-4 text-gris">
            {olvido
              ? "Escribe tu correo y te enviamos una liga y un código para entrar. Ya dentro, creas una contraseña nueva."
              : "Te enviamos una liga y un código de un solo uso. Si es tu primera vez, tu cuenta se crea sola."}
          </p>
          {campoCorreo}
          <Turnstile reinicio={pedido} />
          <p role="alert" className="mt-2 min-h-5 text-sm text-rojo-oscuro">{pedido.error ?? aviso}</p>
          <button type="submit" disabled={pidiendo} className={boton}>
            {pidiendo ? "Enviando…" : "Enviarme mi acceso"}
          </button>
          <p className="mt-4 text-center text-sm text-gris">
            <button type="button" onClick={() => cambiar("entrar")} className={ligaSecundaria}>
              Volver a iniciar sesión con contraseña
            </button>
          </p>
        </form>
      )}
    </div>
  );
}
