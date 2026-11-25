"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Enlace = { href: string; texto: string };
/** Un grupo del menú; `paso` numera los grupos que siguen el orden de trabajo. */
type Grupo = { titulo?: string; paso?: number; enlaces: Enlace[] };

/** Orden de trabajo: primero qué datos lleva cada persona, luego quiénes son, luego el diseño y el pedido. */
const GRUPOS_EQUIPO: Grupo[] = [
  { enlaces: [{ href: "/cuenta", texto: "Resumen" }] },
  {
    titulo: "Arma tu equipo",
    paso: 1,
    enlaces: [
      { href: "/cuenta/campos", texto: "Datos del equipo" },
      { href: "/cuenta/equipo", texto: "Equipo" },
      { href: "/cuenta/solicitudes", texto: "Solicitudes" },
    ],
  },
  {
    titulo: "Diseña y pide",
    paso: 2,
    enlaces: [
      { href: "/cuenta/disenos", texto: "Diseños" },
      { href: "/cuenta/pedidos", texto: "Pedidos" },
      { href: "/cuenta/eventos", texto: "Eventos" },
    ],
  },
  {
    titulo: "Tu cuenta",
    enlaces: [
      { href: "/cuenta/datos", texto: "Envío y facturación" },
      { href: "/cuenta/usuarios", texto: "Usuarios" },
    ],
  },
];

/** En un evento no hay portal ni solicitudes, y el equipo son los asistentes. */
const GRUPOS_EVENTO: Grupo[] = [
  { enlaces: [{ href: "/cuenta", texto: "Resumen" }] },
  {
    titulo: "Arma tu evento",
    paso: 1,
    enlaces: [
      { href: "/cuenta/evento", texto: "Evento" },
      { href: "/cuenta/campos", texto: "Datos de asistentes" },
      { href: "/cuenta/equipo", texto: "Asistentes" },
    ],
  },
  {
    titulo: "Diseña y pide",
    paso: 2,
    enlaces: [
      { href: "/cuenta/disenos", texto: "Diseños" },
      { href: "/cuenta/pedidos", texto: "Pedidos" },
    ],
  },
  {
    titulo: "Tu cuenta",
    enlaces: [
      { href: "/cuenta/datos", texto: "Envío y facturación" },
      { href: "/cuenta/usuarios", texto: "Usuarios" },
    ],
  },
];

function TituloGrupo({ grupo, className = "" }: { grupo: Grupo; className?: string }) {
  if (!grupo.titulo) return null;
  return (
    <p className={`flex items-center gap-1.5 text-xs font-semibold text-gris ${className}`}>
      {grupo.paso ? (
        <span aria-hidden className="grid h-4 w-4 place-items-center rounded-full bg-tinta text-[10px] leading-none text-white">
          {grupo.paso}
        </span>
      ) : null}
      {grupo.paso ? <span className="sr-only">Paso {grupo.paso}: </span> : null}
      {grupo.titulo}
    </p>
  );
}

function esActivo(href: string, ruta: string) {
  if (href === "/cuenta") return ruta === href;
  // "/cuenta/evento" no debe marcarse en "/cuenta/eventos" ni al revés.
  return ruta === href || ruta.startsWith(`${href}/`);
}

/**
 * Menú de la cuenta.
 * Las secciones van agrupadas por pasos, en el orden en que se trabaja.
 * - Celular: un botón con la sección actual que abre los grupos, cada uno
 *   en una cuadrícula, sin desplazar hacia los lados.
 * - Escritorio: grupos en renglón con su título arriba; bajan de línea si no caben.
 */
export function NavCuenta({ evento = false }: { evento?: boolean }) {
  const ruta = usePathname();
  const GRUPOS = evento ? GRUPOS_EVENTO : GRUPOS_EQUIPO;
  const ENLACES = GRUPOS.flatMap((g) => g.enlaces);
  // Se guarda la ruta en la que se abrió: al cambiar de página se cierra solo.
  const [abiertoEn, setAbiertoEn] = useState<string | null>(null);
  const abierto = abiertoEn === ruta;
  const setAbierto = (v: boolean) => setAbiertoEn(v ? ruta : null);
  const caja = useRef<HTMLDivElement>(null);
  const actual = ENLACES.find((e) => esActivo(e.href, ruta));

  useEffect(() => {
    if (!abierto) return;
    const fuera = (ev: PointerEvent) => {
      if (caja.current && !caja.current.contains(ev.target as Node)) setAbiertoEn(null);
    };
    const tecla = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setAbiertoEn(null);
    };
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  return (
    <>
      {/* Celular */}
      <div ref={caja} className="relative w-full lg:hidden">
        <button
          type="button"
          aria-expanded={abierto}
          aria-controls="menu-cuenta"
          onClick={() => setAbierto(!abierto)}
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-linea bg-white px-4 py-3 text-left font-semibold"
        >
          <span className="flex items-center gap-2">
            <svg aria-hidden viewBox="0 0 20 20" className="h-5 w-5 text-gris" fill="currentColor">
              <rect x="2" y="2" width="7" height="7" rx="1.5" />
              <rect x="11" y="2" width="7" height="7" rx="1.5" />
              <rect x="2" y="11" width="7" height="7" rx="1.5" />
              <rect x="11" y="11" width="7" height="7" rx="1.5" />
            </svg>
            <span>
              <span className="sr-only">Sección: </span>
              {actual?.texto ?? "Mi cuenta"}
            </span>
          </span>
          <span className="flex items-center gap-1 text-sm text-gris">
            {abierto ? "Cerrar" : "Ver secciones"}
            <svg
              aria-hidden
              viewBox="0 0 20 20"
              className={`h-4 w-4 transition-transform motion-reduce:transition-none ${abierto ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
        {abierto ? (
          <nav
            id="menu-cuenta"
            aria-label="Mi cuenta"
            className="absolute inset-x-0 top-full z-30 mt-2 max-h-[75vh] space-y-3 overflow-y-auto rounded-2xl border border-linea bg-white p-2 shadow-lg"
          >
            {GRUPOS.map((g, i) => (
              <div key={g.titulo ?? i}>
                <TituloGrupo grupo={g} className="mb-1.5 px-1" />
                <div className="grid grid-cols-2 gap-2">
                  {g.enlaces.map((e) => {
                    const activo = esActivo(e.href, ruta);
                    return (
                      <Link
                        key={e.href}
                        href={e.href}
                        aria-current={activo ? "page" : undefined}
                        onClick={() => setAbierto(false)}
                        className={`rounded-xl px-3 py-3 text-sm font-semibold ${
                          activo ? "bg-tinta text-white" : "bg-papel hover:bg-linea"
                        } ${g.titulo ? "" : "col-span-2"}`}
                      >
                        {e.texto}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        ) : null}
      </div>

      {/* Escritorio */}
      <nav aria-label="Mi cuenta" className="hidden flex-wrap items-end gap-x-2 gap-y-3 lg:flex">
        {GRUPOS.map((g, i) => (
          <div
            key={g.titulo ?? i}
            className={`flex flex-col gap-1 ${i > 0 ? "border-l border-linea pl-2" : ""}`}
          >
            {g.titulo ? <TituloGrupo grupo={g} className="px-4" /> : null}
            <div className="flex flex-wrap gap-1">
              {g.enlaces.map((e) => {
                const activo = esActivo(e.href, ruta);
                return (
                  <Link
                    key={e.href}
                    href={e.href}
                    aria-current={activo ? "page" : undefined}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${
                      activo ? "bg-tinta text-white" : "hover:bg-white"
                    }`}
                  >
                    {e.texto}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </>
  );
}
