"use client";

import { type FormEvent, type ReactNode, startTransition, useActionState, useEffect, useRef } from "react";
import type { Resultado } from "@/lib/cuenta/tipos";

export const claseEntrada =
  "mt-1.5 w-full rounded-tarjeta-chica border border-linea bg-white px-3.5 py-2.5";
export const claseBoton =
  "inline-flex items-center justify-center rounded-full bg-rojo px-5 py-2.5 font-semibold text-white transition-colors hover:bg-rojo-oscuro disabled:opacity-60";
export const claseBotonSecundario =
  "inline-flex items-center justify-center rounded-full border border-tinta px-5 py-2.5 font-semibold transition-colors hover:bg-papel disabled:opacity-60";

/**
 * Formulario que llama a una acción del servidor y muestra su resultado.
 * No se limpia al fallar, para no perder lo que la persona ya escribió.
 */
export function Formulario({
  accion,
  boton,
  children,
  className = "",
  limpiarAlGuardar = false,
}: {
  accion: (previo: Resultado, datos: FormData) => Promise<Resultado>;
  boton: string;
  children: ReactNode;
  className?: string;
  limpiarAlGuardar?: boolean;
}) {
  const [estado, enviar, enviando] = useActionState(accion, {});
  const forma = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok && limpiarAlGuardar) forma.current?.reset();
  }, [estado, limpiarAlGuardar]);

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    startTransition(() => enviar(datos));
  }

  return (
    <form ref={forma} onSubmit={alEnviar} className={className}>
      {children}
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button type="submit" disabled={enviando} className={claseBoton}>
          {enviando ? "Guardando…" : boton}
        </button>
        {estado.error ? (
          <p role="alert" className="text-sm font-medium text-rojo-oscuro">{estado.error}</p>
        ) : estado.ok ? (
          <p role="status" className="text-sm font-medium text-[#0a7d4f]">{estado.ok}</p>
        ) : null}
      </div>
    </form>
  );
}
