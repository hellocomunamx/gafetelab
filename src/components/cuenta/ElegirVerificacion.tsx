"use client";

import { type ReactNode, useState } from "react";
import type { MetodoVerificacion } from "@/lib/cuenta/constancia";
import { verificacion } from "@/lib/site";

/** La empresa elige con qué se verifica y ve el formulario de esa opción. */
export function ElegirVerificacion({ formas }: { formas: Partial<Record<MetodoVerificacion, ReactNode>> }) {
  const metodos = (Object.keys(verificacion.metodos) as MetodoVerificacion[]).filter((m) => formas[m]);
  const [elegido, setElegido] = useState<MetodoVerificacion | null>(null);

  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="font-semibold">¿Con qué quieres verificar tu empresa?</legend>
        <div className={`mt-3 grid gap-3 ${metodos.length > 2 ? "md:grid-cols-3" : "sm:grid-cols-2"}`}>
          {metodos.map((m) => {
            const info = verificacion.metodos[m];
            const activo = elegido === m;
            return (
              <label
                key={m}
                className={`relative flex cursor-pointer flex-col rounded-tarjeta-chica border-2 bg-white p-4 transition-colors ${
                  activo ? "border-rojo" : "border-linea hover:border-tinta"
                }`}
              >
                <input type="radio" name="metodo" value={m} checked={activo} onChange={() => setElegido(m)} className="sr-only" />
                {info.etiqueta ? (
                  <span className="mb-2 self-start rounded-full bg-resaltador/60 px-2.5 py-0.5 text-xs font-semibold">{info.etiqueta}</span>
                ) : null}
                <span className="font-titulos text-lg font-extrabold leading-tight">{info.titulo}</span>
                <span className="mt-1 text-sm text-gris">{info.texto}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      {elegido ? <div className="rounded-tarjeta border border-linea bg-white p-5 sm:p-6">{formas[elegido]}</div> : null}
    </div>
  );
}
