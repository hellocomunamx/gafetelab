"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Menú de perfil del encabezado de la cuenta: reúne el correo, «Mi acceso»,
 * agregar otra empresa, la administración (si aplica) y salir.
 */
export function MenuPerfil({
  correo,
  nombre,
  otraEmpresa = true,
  rutaAdmin,
}: {
  correo: string;
  nombre?: string | null;
  otraEmpresa?: boolean;
  rutaAdmin?: string | null;
}) {
  const ruta = usePathname();
  // Se guarda la ruta en la que se abrió: al cambiar de página se cierra solo.
  const [abiertoEn, setAbiertoEn] = useState<string | null>(null);
  const abierto = abiertoEn === ruta;
  const caja = useRef<HTMLDivElement>(null);
  const inicial = (nombre?.trim() || correo).charAt(0).toUpperCase();

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

  const claseOpcion = "block w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold hover:bg-papel";

  return (
    <div ref={caja} className="relative">
      <button
        type="button"
        aria-expanded={abierto}
        aria-controls="menu-perfil"
        onClick={() => setAbiertoEn(abierto ? null : ruta)}
        className="flex items-center gap-2 rounded-full border border-linea bg-white py-1 pl-1 pr-3 text-sm font-semibold hover:border-tinta"
      >
        <span aria-hidden className="grid h-7 w-7 place-items-center rounded-full bg-tinta text-xs text-white">
          {inicial}
        </span>
        Tu perfil
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className={`h-4 w-4 text-gris transition-transform motion-reduce:transition-none ${abierto ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {abierto ? (
        <div
          id="menu-perfil"
          className="absolute right-0 top-full z-40 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-linea bg-white p-2 shadow-lg"
        >
          <div className="border-b border-linea px-3 pb-3 pt-2">
            {nombre ? <p className="truncate font-semibold">{nombre}</p> : null}
            <p className="truncate text-sm text-gris">{correo}</p>
          </div>
          <nav aria-label="Tu perfil" className="pt-2">
            <Link href="/cuenta/acceso" className={claseOpcion} onClick={() => setAbiertoEn(null)}>
              Mi acceso
              <span className="block text-xs font-normal text-gris">Tu nombre, contraseña y formas de entrar</span>
            </Link>
            {otraEmpresa ? (
              <Link href="/cuenta/empresa/nueva" className={claseOpcion} onClick={() => setAbiertoEn(null)}>
                Agregar otra empresa
              </Link>
            ) : null}
            {rutaAdmin ? (
              <Link href={rutaAdmin} className={claseOpcion} onClick={() => setAbiertoEn(null)}>
                Administración
              </Link>
            ) : null}
            <form action="/salir" method="post" className="mt-1 border-t border-linea pt-1">
              <button type="submit" className={`${claseOpcion} text-rojo`}>
                Salir
              </button>
            </form>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
