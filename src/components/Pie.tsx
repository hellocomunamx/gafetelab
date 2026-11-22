import Image from "next/image";
import Link from "next/link";
import { giros } from "@/lib/giros";
import { figalo, site } from "@/lib/site";
import { Logo } from "./Logo";
import { Contenedor } from "./ui";

const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export function Pie() {
  return (
    <footer className="bg-tinta text-white">
      <Contenedor className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo inverso />
          <p className="mt-4 text-sm text-white/70">
            Gafetes y credenciales para empleados, impresos y digitales, con envíos a todo México
            desde {site.estadoBase}.
          </p>
          <p className="mt-3 text-sm">
            <Link href="/contacto" className="underline hover:text-rojo-claro">
              Escríbenos
            </Link>
            <span aria-hidden className="mx-2 text-white/40">·</span>
            <a href={`mailto:${site.correo}`} className="underline hover:text-rojo-claro">
              {site.correo}
            </a>
          </p>
        </div>

        <nav aria-label={site.nombre}>
          <h2 className="font-texto text-sm font-semibold tracking-wider text-white/60 uppercase">
            {site.nombre}
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/como-funciona" className="hover:text-rojo-claro">Cómo funciona</Link></li>
            <li><Link href="/precios" className="hover:text-rojo-claro">Precios</Link></li>
            <li><Link href="/materiales" className="hover:text-rojo-claro">Materiales y medidas</Link></li>
            <li><Link href="/cotizar" className="hover:text-rojo-claro">Cotizador en línea</Link></li>
            <li><Link href="/gafetes-en" className="hover:text-rojo-claro">Envíos a todo México</Link></li>
            <li><Link href="/preguntas-frecuentes" className="hover:text-rojo-claro">Preguntas frecuentes</Link></li>
            <li><Link href="/contacto" className="hover:text-rojo-claro">Contacto</Link></li>
            <li><Link href="/aviso-de-privacidad" className="hover:text-rojo-claro">Aviso de privacidad</Link></li>
          </ul>
        </nav>

        <nav aria-label="Gafetes y credenciales por giro">
          <h2 className="font-texto text-sm font-semibold tracking-wider text-white/60 uppercase">
            Por giro
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            {giros.map((g) => (
              <li key={g.slug}>
                <Link href={`/gafetes-para/${g.slug}`} className="hover:text-rojo-claro">
                  {mayuscula(g.nombre)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Tu plataforma">
          <h2 className="font-texto text-sm font-semibold tracking-wider text-white/60 uppercase">
            Tu plataforma
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/plataforma" className="hover:text-rojo-claro">Qué incluye</Link></li>
            <li><Link href="/plataforma#costo" className="hover:text-rojo-claro">Sin costo extra</Link></li>
            <li><Link href="/plataforma#cargar" className="hover:text-rojo-claro">Formas de subir a tu equipo</Link></li>
            <li><Link href="/cuenta" className="hover:text-rojo-claro">Entrar a mi cuenta</Link></li>
          </ul>
        </nav>
      </Contenedor>
      <div className="border-t border-white/10">
        <Contenedor className="flex flex-col gap-3 py-5 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {site.actualizado.slice(0, 4)} {site.nombre}. Hecho en {site.estadoBase}, México.
          </p>
          <a
            href={figalo.url}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 hover:text-white"
          >
            Powered by
            <Image
              src="/marca/figalo-isotipo-inverso.svg"
              alt=""
              width={18}
              height={18}
              unoptimized
            />
            <span className="font-semibold text-white">{figalo.nombre}</span>
          </a>
        </Contenedor>
      </div>
    </footer>
  );
}
