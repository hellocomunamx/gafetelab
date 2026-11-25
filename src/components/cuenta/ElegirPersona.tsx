"use client";

import { useId, useMemo, useRef, useState } from "react";
import { normalizar, quien } from "@/lib/cuenta/texto";

export type PersonaElegible = { id: string; nombre: string; numero_empleado: string | null; tieneFoto: boolean };

/**
 * Buscador de personas para asignar una foto: se escribe parte del nombre o el
 * número y se elige de la lista. Primero salen quienes aún no tienen foto.
 */
export function ElegirPersona({
  personas,
  valor,
  ocupadas,
  alElegir,
  etiqueta,
  abierta = false,
  enfocar = false,
  disabled = false,
}: {
  personas: PersonaElegible[];
  valor: string;
  /** Personas que ya tienen otra foto en esta tanda. */
  ocupadas: Set<string>;
  alElegir: (id: string) => void;
  etiqueta: string;
  /** Lista siempre visible (para asignar una por una). */
  abierta?: boolean;
  enfocar?: boolean;
  disabled?: boolean;
}) {
  const [texto, setTexto] = useState("");
  const [enfocado, setEnfocado] = useState(false);
  const [activo, setActivo] = useState(0);
  const entrada = useRef<HTMLInputElement>(null);
  const idLista = useId();
  const elegida = personas.find((p) => p.id === valor);

  const opciones = useMemo(() => {
    const buscadas = normalizar(texto).split(" ").filter(Boolean);
    const coincide = (p: PersonaElegible) => {
      if (!buscadas.length) return true;
      const suyas = `${normalizar(p.nombre ?? "")} ${normalizar(p.numero_empleado ?? "")}`.split(" ");
      return buscadas.every((b) => suyas.some((w) => w.includes(b)));
    };
    const orden = (p: PersonaElegible) => (ocupadas.has(p.id) ? 2 : p.tieneFoto ? 1 : 0);
    return personas
      .filter(coincide)
      .sort((a, b) => orden(a) - orden(b))
      .slice(0, abierta ? 30 : 8);
  }, [texto, personas, ocupadas, abierta]);

  function elegir(id: string) {
    alElegir(id);
    setTexto("");
    setActivo(0);
    if (!abierta) entrada.current?.blur();
  }

  if (elegida && !abierta) {
    return (
      <div className="mt-1.5 flex items-center justify-between gap-2 rounded-tarjeta-chica border border-linea bg-white px-2 py-1.5">
        <span className="min-w-0 truncate font-medium">
          {quien(elegida)}
          {elegida.numero_empleado && elegida.nombre ? <span className="text-gris"> · {elegida.numero_empleado}</span> : null}
        </span>
        <button type="button" disabled={disabled} onClick={() => alElegir("")} className="shrink-0 text-xs underline">
          Cambiar
        </button>
      </div>
    );
  }

  const mostrar = abierta || (enfocado && !disabled);

  return (
    <div className={abierta ? "" : "relative mt-1.5"}>
      <input
        ref={entrada}
        type="search"
        role="combobox"
        aria-expanded={mostrar}
        aria-controls={idLista}
        aria-label={etiqueta}
        placeholder="Busca por nombre o número"
        autoComplete="off"
        autoFocus={enfocar}
        value={texto}
        disabled={disabled}
        onChange={(e) => {
          setTexto(e.target.value);
          setActivo(0);
        }}
        onFocus={() => setEnfocado(true)}
        onBlur={() => setTimeout(() => setEnfocado(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") setActivo((a) => Math.min(opciones.length - 1, a + 1));
          else if (e.key === "ArrowUp") setActivo((a) => Math.max(0, a - 1));
          else if (e.key === "Enter" && opciones[activo]) elegir(opciones[activo].id);
          else return;
          e.preventDefault();
        }}
        className="w-full rounded-tarjeta-chica border border-linea bg-white px-3 py-2"
      />
      {mostrar ? (
        <ul
          id={idLista}
          role="listbox"
          className={
            abierta
              ? "mt-2 max-h-72 overflow-y-auto rounded-tarjeta-chica border border-linea"
              : "absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-tarjeta-chica border border-linea bg-white shadow-lg"
          }
        >
          {opciones.length ? (
            opciones.map((p, i) => (
              <li key={p.id} role="option" aria-selected={i === activo}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => elegir(p.id)}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-papel ${i === activo ? "bg-papel" : ""}`}
                >
                  <span className="min-w-0 truncate">
                    {quien(p)}
                    {p.numero_empleado && p.nombre ? <span className="text-gris"> · {p.numero_empleado}</span> : null}
                  </span>
                  <span className="shrink-0 text-xs text-gris">
                    {ocupadas.has(p.id) ? "Ya tiene otra en esta tanda" : p.tieneFoto ? "Ya tiene foto" : ""}
                  </span>
                </button>
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-sm text-gris">Nadie coincide con «{texto}».</li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
