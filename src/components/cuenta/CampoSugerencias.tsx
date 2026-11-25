"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { claseEntrada } from "./clases";

const sinAcentos = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/**
 * Campo de texto libre con sugerencias propias (combobox accesible).
 * Reemplaza a <datalist>, que cada navegador pinta como si fuera su autocompletado.
 */
export function CampoSugerencias({
  etiqueta,
  name,
  sugerencias,
  defaultValue = "",
  maxLength,
  ayuda,
  className = "",
}: {
  etiqueta: string;
  name: string;
  sugerencias: string[];
  defaultValue?: string;
  maxLength?: number;
  ayuda?: string;
  className?: string;
}) {
  const [valor, setValor] = useState(defaultValue);
  const [abierto, setAbierto] = useState(false);
  const [filtrar, setFiltrar] = useState(false);
  const [activo, setActivo] = useState(-1);
  const caja = useRef<HTMLDivElement>(null);
  const entrada = useRef<HTMLInputElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const id = useId();

  const opciones = useMemo(() => {
    const unicas = [...new Set(sugerencias.map((s) => s.trim()).filter(Boolean))];
    const consulta = sinAcentos(valor);
    if (!filtrar || !consulta) return unicas;
    return unicas.filter((s) => sinAcentos(s).includes(consulta));
  }, [sugerencias, valor, filtrar]);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("pointerdown", fuera);
    return () => document.removeEventListener("pointerdown", fuera);
  }, [abierto]);

  // Si el formulario se limpia al guardar, el campo vuelve a su valor inicial.
  useEffect(() => {
    const forma = entrada.current?.form;
    if (!forma) return;
    const limpiar = () => setValor(defaultValue);
    forma.addEventListener("reset", limpiar);
    return () => forma.removeEventListener("reset", limpiar);
  }, [defaultValue]);

  useEffect(() => {
    if (activo < 0) return;
    lista.current?.querySelector<HTMLElement>(`[data-indice="${activo}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activo]);

  function abrir(conFiltro: boolean) {
    setFiltrar(conFiltro);
    setActivo(-1);
    setAbierto(true);
  }

  function elegir(texto: string) {
    setValor(texto);
    setAbierto(false);
    entrada.current?.focus();
  }

  function teclas(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!abierto) {
        abrir(false);
        return;
      }
      const ultimo = opciones.length - 1;
      setActivo((i) => (e.key === "ArrowDown" ? Math.min(i + 1, ultimo) : Math.max(i - 1, 0)));
    } else if (e.key === "Enter" && abierto && opciones[activo]) {
      e.preventDefault();
      elegir(opciones[activo]);
    } else if (e.key === "Escape" && abierto) {
      e.preventDefault();
      setAbierto(false);
    } else if (e.key === "Tab") {
      setAbierto(false);
    }
  }

  const visible = abierto && opciones.length > 0;
  const idLista = `${id}-lista`;
  const idAyuda = ayuda ? `${id}-ayuda` : undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-semibold">
        {etiqueta}
      </label>
      <div ref={caja} className="relative">
        <input
          ref={entrada}
          id={id}
          name={name}
          value={valor}
          maxLength={maxLength}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={visible}
          aria-controls={idLista}
          aria-activedescendant={visible && activo >= 0 ? `${id}-${activo}` : undefined}
          aria-describedby={idAyuda}
          onChange={(e) => {
            setValor(e.target.value);
            abrir(true);
          }}
          onClick={() => (abierto ? setAbierto(false) : abrir(false))}
          onKeyDown={teclas}
          className={`${claseEntrada} pr-10`}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={`Ver opciones de ${etiqueta.toLowerCase()}`}
          onClick={() => {
            if (abierto) setAbierto(false);
            else abrir(false);
            entrada.current?.focus();
          }}
          className="absolute right-1 top-1.5 bottom-0 flex w-9 items-center justify-center text-gris hover:text-tinta"
        >
          <svg aria-hidden viewBox="0 0 12 12" className={`h-3 w-3 transition-transform ${visible ? "rotate-180" : ""}`}>
            <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        <ul
          ref={lista}
          id={idLista}
          role="listbox"
          aria-label={etiqueta}
          hidden={!visible}
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-tarjeta-chica border border-linea bg-white py-1 text-sm shadow-lg"
        >
          {opciones.map((o, i) => {
            const elegida = sinAcentos(o) === sinAcentos(valor);
            return (
              <li
                key={o}
                id={`${id}-${i}`}
                data-indice={i}
                role="option"
                aria-selected={elegida}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => elegir(o)}
                onMouseEnter={() => setActivo(i)}
                className={`flex cursor-pointer items-center justify-between gap-2 px-3.5 py-2 ${i === activo ? "bg-papel" : ""} ${
                  elegida ? "font-semibold" : ""
                }`}
              >
                <span className="truncate">{o}</span>
                {elegida ? (
                  <svg aria-hidden viewBox="0 0 12 12" className="h-3 w-3 shrink-0 text-rojo">
                    <path d="M2 6.5l2.5 2.5L10 3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
      {ayuda ? (
        <span id={idAyuda} className="mt-1 block text-xs text-gris">
          {ayuda}
        </span>
      ) : null}
    </div>
  );
}
