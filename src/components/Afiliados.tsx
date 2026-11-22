import Image from "next/image";
import { afiliados, figalo } from "@/lib/site";
import { Contenedor } from "./ui";

/** Mención discreta de los negocios afiliados que ya tienen liga y frase. */
export function Afiliados() {
  const visibles = afiliados.filter((a) => a.url && a.texto);
  if (!visibles.length) return null;
  return (
    <section aria-label={`También de ${figalo.nombre}`} className="border-t border-linea">
      <Contenedor className="py-8">
        <ul className="space-y-6">
          {visibles.map((a) => (
            <li key={a.nombre} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
              {a.logo ? (
                <Image src={a.logo} alt="" width={44} height={44} unoptimized className="shrink-0" />
              ) : null}
              <p className="min-w-0 flex-1 text-sm text-gris">
                <span className="block text-xs font-semibold tracking-wider uppercase">
                  También de {figalo.nombre}
                </span>
                <strong className="text-tinta">{a.nombre}.</strong> {a.texto}
              </p>
              <a
                href={a.url}
                target="_blank"
                rel="noopener"
                className="shrink-0 text-sm font-semibold text-tinta underline underline-offset-4 hover:text-rojo"
              >
                Conocer {a.nombre}
              </a>
            </li>
          ))}
        </ul>
      </Contenedor>
    </section>
  );
}
