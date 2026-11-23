import { constancia } from "@/lib/site";

/** Desplegable que explica, con calma, para qué se pide la Constancia de Situación Fiscal. */
export function PorQueConstancia({ className = "" }: { className?: string }) {
  return (
    <details className={`group text-sm ${className}`}>
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 font-semibold underline underline-offset-4 [&::-webkit-details-marker]:hidden">
        {constancia.pregunta}
        <svg viewBox="0 0 12 12" aria-hidden className="size-3 transition-transform group-open:rotate-180">
          <path d="M2 4.5l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="mt-3 rounded-tarjeta-chica bg-white p-4">
        <p className="font-semibold">{constancia.respuesta}</p>
        <ul className="mt-2 space-y-2">
          {constancia.razones.map((r) => (
            <li key={r.titulo}>
              <strong>{r.titulo}</strong> {r.texto}
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
