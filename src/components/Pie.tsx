import Image from "next/image";
import Link from "next/link";
import { ciudades } from "@/lib/ciudades";
import { giros } from "@/lib/giros";
import { site } from "@/lib/site";
import { Contenedor } from "./ui";

const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export function Pie() {
  return (
    <footer className="bg-tinta text-white">
      <Contenedor className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Image
            src="/marca/gafetelab-horizontal-inverse.svg"
            alt="GafeteLab"
            width={156}
            height={48}
            unoptimized
          />
          <p className="mt-4 text-sm text-white/70">
            Gafetes y credenciales para empleados, con envío a todo México desde {site.ciudadBase},{" "}
            {site.estadoBase}.
          </p>
          <p className="mt-3 text-sm">
            <a href={`mailto:${site.correo}`} className="underline hover:text-rojo-claro">
              {site.correo}
            </a>
          </p>
        </div>

        <nav aria-label="GafeteLab">
          <h2 className="font-texto text-sm font-semibold tracking-wider text-white/60 uppercase">
            GafeteLab
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/como-funciona" className="hover:text-rojo-claro">Cómo funciona</Link></li>
            <li><Link href="/precios" className="hover:text-rojo-claro">Precios</Link></li>
            <li><Link href="/cotizar" className="hover:text-rojo-claro">Cotizar</Link></li>
            <li><Link href="/preguntas-frecuentes" className="hover:text-rojo-claro">Preguntas frecuentes</Link></li>
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

        <nav aria-label="Gafetes y credenciales por ciudad">
          <h2 className="font-texto text-sm font-semibold tracking-wider text-white/60 uppercase">
            Por ciudad
          </h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {ciudades.map((c) => (
              <li key={c.slug}>
                <Link href={`/gafetes-en/${c.slug}`} className="hover:text-rojo-claro">
                  {c.nombre}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Contenedor>
      <div className="border-t border-white/10">
        <Contenedor className="py-5 text-xs text-white/60">
          © {site.actualizado.slice(0, 4)} {site.nombre}. Hecho en {site.ciudadBase}, {site.estadoBase},
          México.
        </Contenedor>
      </div>
    </footer>
  );
}
