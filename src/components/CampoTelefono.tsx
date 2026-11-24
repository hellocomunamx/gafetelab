"use client";

import { type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { buscarPaises, PAIS_PREDETERMINADO, paises } from "@/lib/paises";

/** Une lada y número como se guarda y se manda: «+52 644 123 4567». Vacío si no hay número. */
export function telefonoCompleto(iso: string, numero: string) {
  const limpio = numero.trim();
  if (!limpio) return "";
  const pais = paises().find((p) => p.iso === iso);
  return pais ? `+${pais.lada} ${limpio}` : limpio;
}

/**
 * Teléfono con código de país que se puede buscar por nombre o por lada.
 * México (+52) queda elegido siempre al abrir.
 */
export function CampoTelefono({
  numero,
  onNumero,
  pais = PAIS_PREDETERMINADO,
  onPais,
  maxLength,
  etiquetaId,
}: {
  numero: string;
  onNumero: (valor: string) => void;
  pais?: string;
  onPais: (iso: string) => void;
  maxLength?: number;
  /** id del texto que nombra el campo, para lectores de pantalla. */
  etiquetaId?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [consulta, setConsulta] = useState("");
  const [activo, setActivo] = useState(0);
  const caja = useRef<HTMLDivElement>(null);
  const buscador = useRef<HTMLInputElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const id = useId();

  const elegido = useMemo(() => paises().find((p) => p.iso === pais) ?? paises()[0], [pais]);
  const resultados = useMemo(() => buscarPaises(consulta), [consulta]);

  useEffect(() => {
    if (!abierto) return;
    buscador.current?.focus();
    const fuera = (e: MouseEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [abierto]);

  useEffect(() => {
    lista.current?.querySelector<HTMLElement>(`[data-indice="${activo}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activo]);

  function abrir() {
    setConsulta("");
    setActivo(Math.max(0, paises().findIndex((p) => p.iso === elegido.iso)));
    setAbierto(true);
  }

  function elegir(iso: string) {
    onPais(iso);
    setAbierto(false);
    boton.current?.focus();
  }

  function teclas(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActivo((i) => Math.min(i + 1, resultados.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActivo((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (resultados[activo]) elegir(resultados[activo].iso);
    } else if (e.key === "Escape" || e.key === "Tab") {
      setAbierto(false);
      if (e.key === "Escape") boton.current?.focus();
    }
  }

  return (
    <div ref={caja} className="relative mt-2 flex rounded-tarjeta-chica border border-linea bg-white has-[input[type=tel]:focus-visible]:outline-3 has-[input[type=tel]:focus-visible]:outline-offset-2 has-[input[type=tel]:focus-visible]:outline-resaltador">
      <button
        ref={boton}
        type="button"
        onClick={() => (abierto ? setAbierto(false) : abrir())}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-label={`Código de país: ${elegido.nombre} +${elegido.lada}. Cambiar`}
        className="flex shrink-0 items-center gap-1.5 rounded-l-tarjeta-chica border-r border-linea px-3 py-2.5 hover:bg-papel"
      >
        <span aria-hidden className="text-lg leading-none">{elegido.bandera}</span>
        <span className="font-semibold tabular-nums">+{elegido.lada}</span>
        <svg aria-hidden viewBox="0 0 12 12" className="h-3 w-3 text-gris">
          <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
      <input
        type="tel"
        inputMode="tel"
        maxLength={maxLength}
        value={numero}
        onChange={(e) => onNumero(e.target.value)}
        autoComplete="tel-national"
        aria-labelledby={etiquetaId}
        placeholder={elegido.iso === "MX" ? "10 dígitos" : "Número"}
        style={{ outline: "none" }}
        className="min-w-0 flex-1 rounded-r-tarjeta-chica bg-transparent px-3 py-2.5"
      />

      {abierto ? (
        <div className="absolute left-0 top-full z-20 mt-1 w-72 max-w-[calc(100vw-2rem)] rounded-tarjeta-chica border border-linea bg-white shadow-lg">
          <div className="border-b border-linea p-2">
            <input
              ref={buscador}
              type="search"
              value={consulta}
              onChange={(e) => {
                setConsulta(e.target.value);
                setActivo(0);
              }}
              onKeyDown={teclas}
              placeholder="Busca país o código"
              aria-label="Busca país o código"
              role="combobox"
              aria-expanded
              aria-controls={`${id}-lista`}
              aria-activedescendant={resultados[activo] ? `${id}-${resultados[activo].iso}` : undefined}
              className="w-full rounded-tarjeta-chica border border-linea px-3 py-2 text-sm"
            />
          </div>
          <ul ref={lista} id={`${id}-lista`} role="listbox" className="max-h-64 overflow-y-auto py-1 text-sm">
            {resultados.length === 0 ? (
              <li className="px-3 py-2 text-gris">No encontramos ese país.</li>
            ) : (
              resultados.map((p, i) => (
                <li
                  key={p.iso}
                  id={`${id}-${p.iso}`}
                  data-indice={i}
                  role="option"
                  aria-selected={p.iso === elegido.iso}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => elegir(p.iso)}
                  onMouseEnter={() => setActivo(i)}
                  className={`flex cursor-pointer items-center gap-2 px-3 py-2 ${i === activo ? "bg-papel" : ""} ${
                    p.iso === elegido.iso ? "font-semibold" : ""
                  }`}
                >
                  <span aria-hidden className="text-lg leading-none">{p.bandera}</span>
                  <span className="flex-1 truncate">{p.nombre}</span>
                  <span className="tabular-nums text-gris">+{p.lada}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
