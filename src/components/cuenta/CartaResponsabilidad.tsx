"use client";

import { carta } from "@/lib/site";

/** Carta de responsabilidad, a la vista, con la casilla para aceptarla. */
export function CartaResponsabilidad({
  aceptada,
  alCambiar,
  deshabilitada = false,
}: {
  aceptada: boolean;
  alCambiar: (valor: boolean) => void;
  deshabilitada?: boolean;
}) {
  return (
    <fieldset className="rounded-tarjeta-chica border border-linea bg-papel/60 p-4" disabled={deshabilitada}>
      <legend className="px-1 font-titulos text-lg font-extrabold">{carta.titulo}</legend>
      <ul className="list-disc space-y-1.5 pl-5 text-sm">
        {carta.puntos.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <label className="mt-3 flex items-start gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          checked={aceptada}
          onChange={(e) => alCambiar(e.target.checked)}
          className="mt-0.5 size-4 accent-rojo"
        />
        <span>{carta.casilla}</span>
      </label>
    </fieldset>
  );
}
