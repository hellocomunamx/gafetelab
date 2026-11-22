import Link from "next/link";
import type { ReactNode } from "react";
import type { Miga } from "@/lib/schema";

/** Texto del botón principal: deja claro que el precio sale en línea y al momento. */
export const CTA_TEXTO = "Cotiza en línea al momento";

/** Texto por omisión de los bloques de cierre: nadie tiene que escribirnos para saber el precio. */
export const CIERRE_TEXTO =
  "Elige cuántos gafetes necesitas en el cotizador en línea y ve tu total con envío e IVA al momento, sin dejar tus datos ni esperar un correo.";

export function Contenedor({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 ${className}`}>{children}</div>;
}

export function Boton({
  href,
  children,
  variante = "primario",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variante?: "primario" | "secundario" | "claro";
  className?: string;
}) {
  const estilos = {
    primario: "bg-rojo text-white hover:bg-rojo-oscuro",
    secundario: "border border-tinta text-tinta hover:bg-papel",
    claro: "bg-white text-tinta hover:bg-papel",
  }[variante];
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-semibold transition-colors ${estilos} ${className}`}
    >
      {children}
    </Link>
  );
}

/** Ruta de navegación visible. El JSON-LD equivalente sale de `migas()` en lib/schema. */
export function Migas({ items }: { items: Miga[] }) {
  return (
    <nav aria-label="Ruta de navegación" className="text-sm text-gris">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <li>
          <Link href="/" className="hover:text-tinta hover:underline">
            Inicio
          </Link>
        </li>
        {items.map((m, i) => (
          <li key={m.ruta} className="flex items-center gap-2">
            <span aria-hidden>/</span>
            {i === items.length - 1 ? (
              <span aria-current="page" className="text-tinta">
                {m.nombre}
              </span>
            ) : (
              <Link href={m.ruta} className="hover:text-tinta hover:underline">
                {m.nombre}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Encabezado de página interior: migas, H1 y la respuesta corta. */
export function Portada({
  migas,
  titulo,
  children,
}: {
  migas: Miga[];
  titulo: string;
  children?: ReactNode;
}) {
  return (
    <header className="bg-papel">
      <Contenedor className="py-10 sm:py-14">
        <Migas items={migas} />
        <h1 className="mt-4 max-w-3xl text-4xl leading-tight font-extrabold sm:text-5xl">
          {titulo}
        </h1>
        {children ? <div className="mt-4 max-w-2xl text-lg text-gris">{children}</div> : null}
      </Contenedor>
    </header>
  );
}

export function Seccion({
  titulo,
  children,
  fondo = false,
  id,
}: {
  titulo?: string;
  children: ReactNode;
  fondo?: boolean;
  id?: string;
}) {
  return (
    <section id={id} className={`scroll-mt-28 ${fondo ? "bg-papel" : ""}`}>
      <Contenedor className="py-12 sm:py-16">
        {titulo ? <h2 className="mb-6 max-w-3xl text-3xl font-extrabold">{titulo}</h2> : null}
        {children}
      </Contenedor>
    </section>
  );
}

/** Bloque de cierre con el botón principal. */
export function Cierre({ titulo, texto = CIERRE_TEXTO }: { titulo: string; texto?: string }) {
  return (
    <section className="bg-tinta text-white">
      <Contenedor className="flex flex-col items-start gap-6 py-14 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-extrabold">{titulo}</h2>
          <p className="mt-2 max-w-xl text-white/75">{texto}</p>
        </div>
        <Boton href="/cotizar" className="shrink-0">
          {CTA_TEXTO}
        </Boton>
      </Contenedor>
    </section>
  );
}
