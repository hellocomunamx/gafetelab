import Link from "next/link";
import { envioGratisTexto } from "@/lib/precios";
import { entregaTexto } from "@/lib/site";
import { IconoCarrito } from "./carrito/IconoCarrito";
import { EnlaceCuenta } from "./cuenta/EnlaceCuenta";
import { Logo } from "./Logo";
import { Boton, Contenedor } from "./ui";

export const navegacion: { href: string; texto: string; textoLargo?: string }[] = [
  { href: "/como-funciona", texto: "Cómo funciona" },
  { href: "/plataforma", texto: "Plataforma" },
  { href: "/precios", texto: "Precios" },
  { href: "/medidas-de-gafetes", texto: "Medidas", textoLargo: "Medidas y glosario" },
  { href: "/gafetes-para", texto: "Por giro" },
  { href: "/preguntas-frecuentes", texto: "Preguntas" },
];

export function Encabezado() {
  return (
    <header className="sticky top-0 z-20 border-b border-linea bg-white/95 backdrop-blur">
      <p className="bg-tinta px-4 py-1.5 text-center text-xs font-medium text-white sm:text-sm">
        <Link href="/gafetes-en" className="hover:underline">
          Envíos a todo México
        </Link>
        <span aria-hidden className="mx-2 text-white/40">·</span>
        <span className="text-resaltador">{envioGratisTexto}</span>
        <span className="hidden sm:inline">
          <span aria-hidden className="mx-2 text-white/40">·</span>
          Entrega en {entregaTexto}
        </span>
      </p>
      {/* En celulares angostos (menos de 400 px) todo se aprieta un poco para caber sin desbordar. */}
      <Contenedor className="flex h-16 items-center justify-between gap-4 max-[399px]:gap-2">
        <Link href="/" aria-label="LaGafetería, inicio" className="shrink-0">
          <Logo className="h-auto max-[399px]:w-[7.5rem] max-[339px]:w-[6.5rem]" />
        </Link>
        <nav aria-label="Principal" className="hidden items-center gap-6 whitespace-nowrap lg:flex lg:gap-5 xl:gap-7">
          {navegacion.map((n) => (
            <Link key={n.href} href={n.href} title={n.textoLargo} className="font-medium hover:text-rojo">
              {n.texto}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 max-[399px]:gap-1">
          <EnlaceCuenta className="hidden px-2 font-medium whitespace-nowrap hover:text-rojo sm:block" />
          <IconoCarrito />
          <Boton href="/cotizar" className="px-5 py-2 text-sm whitespace-nowrap max-[399px]:px-4 max-[339px]:px-3">
            Cotizar<span className="hidden sm:inline lg:hidden xl:inline">&nbsp;en línea</span>
          </Boton>
          <details className="relative lg:hidden">
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
              className="absolute right-0 mt-2 flex w-56 flex-col rounded-tarjeta border border-linea bg-white p-2 shadow-lg"
            >
              {navegacion.map((n) => (
                <Link key={n.href} href={n.href} className="rounded-tarjeta-chica px-3 py-2 font-medium hover:bg-papel">
                  {n.textoLargo ?? n.texto}
                </Link>
              ))}
              <EnlaceCuenta className="rounded-tarjeta-chica px-3 py-2 font-medium hover:bg-papel sm:hidden" />
            </nav>
          </details>
        </div>
      </Contenedor>
    </header>
  );
}
