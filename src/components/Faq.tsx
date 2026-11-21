import type { Faq as FaqItem } from "@/lib/faqs";

/**
 * Preguntas y respuestas visibles en el HTML (sin JavaScript): cada pregunta es
 * un encabezado y la respuesta está en el documento aunque el panel esté cerrado.
 */
export function Faq({ faqs, abiertas = false }: { faqs: FaqItem[]; abiertas?: boolean }) {
  return (
    <div className="divide-y divide-linea rounded-gl border border-linea bg-white">
      {faqs.map((f) => (
        <details key={f.pregunta} open={abiertas} className="group px-5 py-4">
          <summary className="flex items-start justify-between gap-4">
            <h3 className="text-lg leading-snug font-semibold">{f.pregunta}</h3>
            <span
              aria-hidden
              className="mt-1 text-xl leading-none text-rojo transition-transform group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <p className="mt-3 max-w-prose text-gris">{f.respuesta}</p>
        </details>
      ))}
    </div>
  );
}
