"use client";

import { useState } from "react";
import { claseEntrada } from "./Formulario";

const OTRO = "Otro";
/** "Empresas de limpieza" y "Limpieza" son el mismo giro. */
const base = (t: string) => t.trim().toLocaleLowerCase("es-MX").replace(/^empresas de /, "");

/**
 * Giro de la empresa con chips: se elige uno con un toque (y se quita con otro),
 * o "Otro" para escribirlo. El valor viaja en un campo oculto llamado `giro`.
 */
export function GiroChips({
  opciones,
  inicial = "",
  opcional = false,
}: {
  opciones: string[];
  /** Giro guardado, si ya hay uno. */
  inicial?: string;
  opcional?: boolean;
}) {
  const guardado = inicial.trim();
  const enLista = opciones.find((o) => base(o) === base(guardado));
  const [elegido, setElegido] = useState(enLista ?? (guardado ? OTRO : ""));
  const [otro, setOtro] = useState(enLista ? "" : guardado);

  return (
    <fieldset>
      <legend className="text-sm font-semibold">
        Giro {opcional ? <span className="font-normal text-gris">(opcional)</span> : null}
      </legend>
      <input type="hidden" name="giro" value={elegido === OTRO ? otro : elegido} />
      <div className="mt-2 flex flex-wrap gap-2">
        {[...opciones, OTRO].map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={elegido === o}
            onClick={() => setElegido(elegido === o ? "" : o)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
              elegido === o ? "border-tinta bg-tinta text-white" : "border-linea bg-white hover:border-tinta"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
      {elegido === OTRO ? (
        <label className="mt-3 block">
          <span className="text-sm font-semibold">¿Cuál es tu giro?</span>
          <input
            value={otro}
            onChange={(e) => setOtro(e.target.value)}
            maxLength={80}
            autoFocus
            placeholder="Por ejemplo: constructora"
            className={claseEntrada}
          />
        </label>
      ) : null}
    </fieldset>
  );
}
