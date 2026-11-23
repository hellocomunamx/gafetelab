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
  const sugerencias = valores[campo] ?? [];
  return (
    <Formulario accion={agregarRegla} boton="Agregar regla" limpiarAlGuardar>
      <div className="space-y-5">
        <div
          onChange={(e) => {
            const t = e.target as unknown as HTMLInputElement;
            if (t.name === "campo") setCampo(t.value);
          }}
        >
          <Chips
            etiqueta="Si su…"
            name="campo"
            inicial={campos[0].clave}
            opciones={campos.map((c) => ({ valor: c.clave, texto: c.etiqueta }))}
          />
        </div>
        <label className="block max-w-md">
          <span className="text-sm font-semibold">…es</span>
          <input name="valor" required maxLength={120} list="valores-regla" placeholder={sugerencias[0] ?? "Por ejemplo, Seguridad"} className={claseEntrada} />
          <datalist id="valores-regla">
            {sugerencias.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
          <span className="mt-1 block text-xs text-gris">
            No importan mayúsculas ni acentos.
            {sugerencias.length ? ` En tu equipo hay: ${sugerencias.slice(0, 8).join(", ")}${sugerencias.length > 8 ? "…" : "."}` : ""}
          </span>
        </label>
        <Chips etiqueta="…lleva el diseño" name="diseno" inicial={disenos[0]?.id} opciones={disenos.map((d) => ({ valor: d.id, texto: d.nombre }))} />
      </div>
    </Formulario>
  );
}
