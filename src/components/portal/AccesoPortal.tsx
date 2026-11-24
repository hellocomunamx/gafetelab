"use client";

import { type FormEvent, startTransition, useActionState, useState } from "react";
import { entrarConCodigo, entrarConNip, pedirCodigo, type ResultadoAcceso } from "@/app/e/acciones";
import { claseBoton, claseEntrada } from "@/components/cuenta/clases";
import { Turnstile } from "@/components/Turnstile";
import type { Resultado } from "@/lib/cuenta/tipos";

type Modo = "correo" | "nip";

function AvisoError({ texto }: { texto?: string }) {
  return texto ? (
    <p role="alert" className="mt-4 rounded-tarjeta-chica bg-rojo/10 p-3 text-sm font-medium text-rojo-oscuro">
      {texto}
    </p>
  ) : null;
}

/** Envía el formulario con la acción, sin recargar la página. */
function useEnvio<T extends Resultado>(accion: (previo: T, d: FormData) => Promise<T>, inicial: Awaited<T>) {
  const [estado, enviar, enviando] = useActionState<T, FormData>(accion, inicial);
  const alEnviar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    startTransition(() => enviar(datos));
  };
  return { estado, alEnviar, enviando };
}

function ConCorreo({ handle }: { handle: string }) {
  const pedir = useEnvio<ResultadoAcceso>(pedirCodigo, {});
  const confirmar = useEnvio<ResultadoAcceso>(entrarConCodigo, {});
  const [otraVez, setOtraVez] = useState(0);
  const correo = confirmar.estado.correo ?? pedir.estado.correo;
  const enCodigo = (pedir.estado.paso === "codigo" || confirmar.estado.paso === "codigo") && otraVez === 0;

  if (enCodigo && correo) {
    return (
      <form onSubmit={confirmar.alEnviar} noValidate>
        <input type="hidden" name="empresa" value={handle} />
        <input type="hidden" name="correo" value={correo} />
        <p className="text-sm">
          Si <strong className="break-all">{correo}</strong> está registrado en tu empresa, te mandamos un código de 6
          números y una liga para entrar. Revisa también tu correo no deseado.
        </p>
        <label className="mt-4 block">
          <span className="text-sm font-semibold">Código</span>
          <input
            name="codigo"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            required
            autoFocus
            placeholder="000000"
            className={`${claseEntrada} text-center font-mono text-2xl tracking-[0.5em]`}
          />
        </label>
        <AvisoError texto={confirmar.estado.error} />
        <button type="submit" disabled={confirmar.enviando} className={`${claseBoton} mt-5 w-full`}>
          {confirmar.enviando ? "Entrando…" : "Entrar"}
        </button>
        <button type="button" onClick={() => setOtraVez((n) => n + 1)} className="mt-3 w-full text-sm font-semibold underline underline-offset-4">
          Usar otro correo o pedir otro código
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={(e) => { setOtraVez(0); pedir.alEnviar(e); }} noValidate>
      <input type="hidden" name="empresa" value={handle} />
      <label className="block">
        <span className="text-sm font-semibold">Tu correo</span>
        <input name="correo" type="email" inputMode="email" autoComplete="email" required defaultValue={correo} placeholder="tu@correo.com" className={claseEntrada} />
        <span className="mt-1 block text-xs text-gris">El que tiene registrado tu empresa. Te mandamos un código, sin contraseñas.</span>
      </label>
      <Turnstile reinicio={pedir.estado} />
      <AvisoError texto={pedir.estado.error} />
      <button type="submit" disabled={pedir.enviando} className={`${claseBoton} mt-5 w-full`}>
        {pedir.enviando ? "Enviando…" : "Mandarme un código"}
      </button>
    </form>
  );
}

function ConNip({ handle }: { handle: string }) {
  const { estado, alEnviar, enviando } = useEnvio<Resultado>(entrarConNip, {});
  return (
    <form onSubmit={alEnviar} noValidate>
      <input type="hidden" name="empresa" value={handle} />
      <label className="block">
        <span className="text-sm font-semibold">ID de acceso</span>
        <input name="id_acceso" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={40} placeholder="Tu número de empleado" className={claseEntrada} />
      </label>
      <label className="mt-4 block">
        <span className="text-sm font-semibold">NIP</span>
        <input
          name="nip"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          pattern="\d{6}"
          maxLength={6}
          required
          placeholder="••••••"
          className={`${claseEntrada} font-mono tracking-[0.4em]`}
        />
        <span className="mt-1 block text-xs text-gris">6 números. Si es tu primera vez, usa el que te dio tu empresa.</span>
      </label>
      <Turnstile reinicio={estado} />
      <AvisoError texto={estado.error} />
      <button type="submit" disabled={enviando} className={`${claseBoton} mt-5 w-full`}>
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}

/** Pantalla de entrada del portal: con correo (código o liga) o con ID de acceso y NIP. */
export function AccesoPortal({ handle, inicial = "correo" }: { handle: string; inicial?: Modo }) {
  const [modo, setModo] = useState<Modo>(inicial);
  const pestana = (m: Modo, texto: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={modo === m}
      onClick={() => setModo(m)}
      className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold transition-colors ${modo === m ? "bg-tinta text-white" : "text-tinta hover:bg-white"}`}
    >
      {texto}
    </button>
  );
  return (
    <div>
      <div role="tablist" aria-label="Cómo quieres entrar" className="flex gap-1 rounded-full bg-papel p-1">
        {pestana("correo", "Con mi correo")}
        {pestana("nip", "Con ID y NIP")}
      </div>
      <div className="mt-5">{modo === "correo" ? <ConCorreo handle={handle} /> : <ConNip handle={handle} />}</div>
    </div>
  );
}
