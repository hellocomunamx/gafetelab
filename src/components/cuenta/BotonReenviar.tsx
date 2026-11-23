"use client";

import { useActionState } from "react";
import type { Resultado } from "@/lib/cuenta/tipos";

/** Reenvía una invitación pendiente y avisa ahí mismo cómo salió. */
export function BotonReenviar({
  accion,
  id,
}: {
  accion: (estado: Resultado, datos: FormData) => Promise<Resultado>;
  id: string;
}) {
  const [estado, enviar, enviando] = useActionState<Resultado, FormData>(accion, {});
  return (
    <form action={enviar} className="text-sm">
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={enviando} className="font-semibold underline underline-offset-4 disabled:opacity-60">
        {enviando ? "Reenviando…" : "Reenviar invitación"}
      </button>
      {estado.ok ? <span className="ml-2 text-gris">{estado.ok}</span> : null}
      {estado.error ? (
        <span role="alert" className="mt-1 block max-w-xs break-words text-rojo-oscuro">
          {estado.error}
        </span>
      ) : null}
    </form>
  );
}
