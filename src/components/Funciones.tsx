import { funcionesPlataforma, sinCostoExtra } from "@/lib/plataforma";

export function Palomita({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={`size-5 shrink-0 ${className}`}>
      <circle cx="10" cy="10" r="10" fill="currentColor" opacity="0.18" />
      <path d="M5.5 10.5l3 3 6-6.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Marca de lo que todavía no está disponible. */
export function MuyPronto({ oscuro = false }: { oscuro?: boolean }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 align-middle text-[11px] font-semibold tracking-wide whitespace-nowrap uppercase ${
        oscuro ? "bg-white/15 text-white" : "bg-resaltador/50 text-tinta"
      }`}
    >
      Muy pronto
    </span>
  );
}

/** Lo que la plataforma no cobra, en lista con palomitas. */
export function SinCostoExtra({ oscuro = false, className = "" }: { oscuro?: boolean; className?: string }) {
  return (
    <ul className={`grid gap-x-6 gap-y-2.5 sm:grid-cols-2 ${className}`}>
      {sinCostoExtra.map((s) => (
        <li key={s} className="flex items-start gap-2 font-semibold">
          <Palomita className={oscuro ? "text-resaltador" : "text-[#0a7d4f]"} />
          {s}
        </li>
      ))}
    </ul>
  );
}

/** Las funciones de la plataforma en tres tarjetas, una por grupo. */
export function GruposFunciones({ oscuro = false }: { oscuro?: boolean }) {
  const tenue = oscuro ? "text-white/70" : "text-gris";
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {funcionesPlataforma.map((g) => (
        <section
          key={g.grupo}
          className={`rounded-tarjeta p-6 ${oscuro ? "bg-white/[0.07] ring-1 ring-white/10" : "border border-linea bg-white"}`}
        >
          <h3 className="text-2xl font-extrabold">{g.grupo}</h3>
          <p className={`mt-1 ${tenue}`}>{g.resumen}</p>
          <ul className="mt-5 space-y-4">
            {g.funciones.map((f) => (
              <li key={f.titulo} className="flex gap-2.5">
                <Palomita className={`mt-0.5 ${f.pronto ? (oscuro ? "text-white/50" : "text-gris") : oscuro ? "text-resaltador" : "text-rojo"}`} />
                <div>
                  <p className="font-semibold">
                    {f.titulo} {f.pronto ? <MuyPronto oscuro={oscuro} /> : null}
                  </p>
                  <p className={`mt-0.5 text-sm ${tenue}`}>{f.texto}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
