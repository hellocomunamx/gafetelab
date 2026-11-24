"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const ENLACES_EQUIPO = [
  { href: "/cuenta", texto: "Resumen" },
  { href: "/cuenta/equipo", texto: "Equipo" },
  { href: "/cuenta/solicitudes", texto: "Solicitudes" },
  { href: "/cuenta/campos", texto: "Datos del equipo" },
  { href: "/cuenta/disenos", texto: "Diseños" },
  { href: "/cuenta/pedidos", texto: "Pedidos" },
  { href: "/cuenta/eventos", texto: "Eventos" },
  { href: "/cuenta/datos", texto: "Envío y facturación" },
  { href: "/cuenta/usuarios", texto: "Usuarios" },
];

/** En un evento no hay portal ni solicitudes, y el equipo son los asistentes. */
const ENLACES_EVENTO = [
  { href: "/cuenta", texto: "Resumen" },
  { href: "/cuenta/evento", texto: "Evento" },
  { href: "/cuenta/equipo", texto: "Asistentes" },
  { href: "/cuenta/campos", texto: "Datos de asistentes" },
  { href: "/cuenta/disenos", texto: "Diseños" },
  { href: "/cuenta/pedidos", texto: "Pedidos" },
  { href: "/cuenta/datos", texto: "Envío y facturación" },
  { href: "/cuenta/usuarios", texto: "Usuarios" },
];

function esActivo(href: string, ruta: string) {
  if (href === "/cuenta") return ruta === href;
  // "/cuenta/evento" no debe marcarse en "/cuenta/eventos" ni al revés.
  return ruta === href || ruta.startsWith(`${href}/`);
}

/**
 * Menú de la cuenta.
 * - Celular: un botón con la sección actual que abre todas las secciones
 *   en una cuadrícula, sin desplazar hacia los lados.
 * - Escritorio: pestañas en renglón que bajan de línea si no caben.
 */
export function NavCuenta({ evento = false }: { evento?: boolean }) {
  const ruta = usePathname();
  const ENLACES = evento ? ENLACES_EVENTO : ENLACES_EQUIPO;
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
            className="absolute inset-x-0 top-full z-30 mt-2 grid grid-cols-2 gap-2 rounded-2xl border border-linea bg-white p-2 shadow-lg"
          >
            {ENLACES.map((e) => {
              const activo = esActivo(e.href, ruta);
              return (
                <Link
                  key={e.href}
                  href={e.href}
                  aria-current={activo ? "page" : undefined}
                  onClick={() => setAbierto(false)}
                  className={`rounded-xl px-3 py-3 text-sm font-semibold ${
                    activo ? "bg-tinta text-white" : "bg-papel hover:bg-linea"
                  }`}
                >
                  {e.texto}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </div>

      {/* Escritorio */}
      <nav aria-label="Mi cuenta" className="-mx-1 hidden flex-wrap gap-1 lg:flex">
        {ENLACES.map((e) => {
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
      </nav>
    </>
  );
}
