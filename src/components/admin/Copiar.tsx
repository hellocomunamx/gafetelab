"use client";

import { useState } from "react";

/** Un dato con su botón para copiarlo, para pasarlo al portal del SAT sin teclear. */
export function Copiar({ etiqueta, valor, ayuda }: { etiqueta: string; valor: string; ayuda?: string }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      setCopiado(false);
    }
  }
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <dt className="text-xs text-gris">{etiqueta}</dt>
        <dd className="break-words font-semibold">{valor || "—"}</dd>
        {ayuda ? <dd className="text-xs text-gris">{ayuda}</dd> : null}
      </div>
      {valor ? (
        <button
          type="button"
          onClick={copiar}
          aria-label={`Copiar ${etiqueta}`}
          className="shrink-0 rounded-full border border-linea px-3 py-1 text-xs font-semibold hover:border-tinta"
        >
          <span aria-live="polite">{copiado ? "Copiado" : "Copiar"}</span>
        </button>
      ) : null}
    </div>
  );
}
