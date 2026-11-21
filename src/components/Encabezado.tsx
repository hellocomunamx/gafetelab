import Image from "next/image";
import Link from "next/link";
import { Boton, Contenedor } from "./ui";

export const navegacion = [
  { href: "/como-funciona", texto: "Cómo funciona" },
  { href: "/precios", texto: "Precios" },
  { href: "/gafetes-para", texto: "Por giro" },
  { href: "/preguntas-frecuentes", texto: "Preguntas" },
];

export function Encabezado() {
  return (
    <header className="sticky top-0 z-20 border-b border-linea bg-white/95 backdrop-blur">
      <Contenedor className="flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label="GafeteLab, inicio" className="shrink-0">
          <Image
            src="/marca/gafetelab-horizontal-color.svg"
            alt="GafeteLab"
            width={156}
            height={48}
            priority
            unoptimized
          />
        </Link>
        <nav aria-label="Principal" className="hidden items-center gap-7 md:flex">
          {navegacion.map((n) => (
            <Link key={n.href} href={n.href} className="font-medium hover:text-rojo">
              {n.texto}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Boton href="/cotizar" className="px-5 py-2 text-sm">
            Cotizar
          </Boton>
          <details className="relative md:hidden">
            <summary
              aria-label="Abrir menú"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-linea"
            >
              <svg width="18" height="14" viewBox="0 0 18 14" aria-hidden>
                <path d="M1 1h16M1 7h16M1 13h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </summary>
            <nav
              aria-label="Principal, móvil"
              className="absolute right-0 mt-2 flex w-56 flex-col rounded-gl border border-linea bg-white p-2 shadow-lg"
            >
              {navegacion.map((n) => (
                <Link key={n.href} href={n.href} className="rounded-gl-chico px-3 py-2 font-medium hover:bg-papel">
                  {n.texto}
                </Link>
              ))}
            </nav>
          </details>
        </div>
      </Contenedor>
    </header>
  );
}
