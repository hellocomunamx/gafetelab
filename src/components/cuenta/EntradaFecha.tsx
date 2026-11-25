"use client";

import { type InputHTMLAttributes, useRef, useState } from "react";
import { claseEntrada } from "./clases";

/** AAAA-MM-DD → DD/MM/AAAA, para mostrar. Lo demás queda igual. */
const legible = (v: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : v;
};

/**
 * Dato de tipo fecha que también acepta texto, como «Indefinido». Se escribe
 * libre o se elige en el calendario; el servidor guarda las fechas como AAAA-MM-DD.
 */
export function EntradaFecha({
  etiqueta,
  ayuda,
  defaultValue,
  className = "",
  ...resto
}: { etiqueta: string; ayuda?: string; defaultValue?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "defaultValue">) {
  const [valor, setValor] = useState(legible(defaultValue ?? ""));
  const calendario = useRef<HTMLInputElement>(null);
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-semibold">{etiqueta}</span>
      <span className="relative block">
        <input
          {...resto}
          type="text"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="15/03/2026 o Indefinido"
          className={`${claseEntrada} pr-11`}
        />
        <button
          type="button"
          onClick={() => {
            try {
              calendario.current?.showPicker();
            } catch {
              calendario.current?.focus();
            }
          }}
          aria-label={`Elegir ${etiqueta} en el calendario`}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-gris hover:text-tinta"
        >
          <svg aria-hidden viewBox="0 0 20 20" className="size-4 fill-none stroke-current" strokeWidth="1.6">
            <rect x="3" y="4.5" width="14" height="12.5" rx="2" />
            <path d="M3 8.5h14M7 2.5v4M13 2.5v4" strokeLinecap="round" />
          </svg>
        </button>
        <input
          ref={calendario}
          type="date"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => e.target.value && setValor(legible(e.target.value))}
          className="pointer-events-none absolute right-0 bottom-0 h-0 w-0 opacity-0"
        />
      </span>
      <span className="mt-1 block text-xs text-gris">{ayuda ?? "Una fecha o un texto, como «Indefinido»."}</span>
    </label>
  );
}
