"use client";

import { useState } from "react";
import { agregarRegla } from "@/app/cuenta/disenos/reglas/acciones";
import { Chips } from "./Entrada";
import { claseEntrada, Formulario } from "./Formulario";

/** Formulario para agregar una regla: el dato, su valor (con los que ya usa el equipo) y el diseño que le toca. */
export function NuevaRegla({
  campos,
  valores,
  disenos,
}: {
  campos: { clave: string; etiqueta: string }[];
  /** Valores que ya tiene el equipo, por campo, para sugerirlos. */
  valores: Record<string, string[]>;
  disenos: { id: string; nombre: string }[];
}) {
  const [campo, setCampo] = useState(campos[0].clave);
  const [valor, setValor] = useState("");
  const sugerencias = valores[campo] ?? [];
  return (
    <Formulario accion={agregarRegla} boton="Agregar regla" limpiarAlGuardar>
      <div className="space-y-5">
        <div
          onChange={(e) => {
            const t = e.target as unknown as HTMLInputElement;
            if (t.name === "campo") {
              setCampo(t.value);
              setValor("");
            }
          }}
        >
          <Chips
            etiqueta="Si su…"
            name="campo"
            inicial={campos[0].clave}
            opciones={campos.map((c) => ({ valor: c.clave, texto: c.etiqueta }))}
          />
        </div>
        <div className="max-w-2xl">
          <label className="block max-w-md">
            <span className="text-sm font-semibold">…es</span>
            {/* Sin autocompletar del navegador: mezclaba lo que la persona escribió en otros sitios. */}
            <input
              name="valor"
              required
              maxLength={120}
              autoComplete="off"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder={sugerencias[0] ?? "Por ejemplo, Seguridad"}
              className={claseEntrada}
            />
          </label>
          {sugerencias.length ? (
            <div className="mt-2">
              <span className="block text-xs text-gris">En tu equipo hay estos; toca uno para elegirlo:</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {sugerencias.slice(0, 30).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setValor(v)}
                    aria-pressed={valor === v}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${valor === v ? "border-tinta bg-tinta text-white" : "border-linea bg-white hover:border-tinta"}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <span className="mt-1.5 block text-xs text-gris">No importan mayúsculas ni acentos.</span>
        </div>
        <Chips etiqueta="…lleva el diseño" name="diseno" inicial={disenos[0]?.id} opciones={disenos.map((d) => ({ valor: d.id, texto: d.nombre }))} />
      </div>
    </Formulario>
  );
}
