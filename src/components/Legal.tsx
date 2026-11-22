import type { ReactNode } from "react";

/** Apartado numerado de un documento legal (aviso de privacidad, términos y condiciones). */
export function Apartado({ numero, titulo, children }: { numero: number; titulo: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-2xl font-extrabold">
        {numero}. {titulo}
      </h2>
      <div className="mt-3 space-y-3 text-gris [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-tinta [&_ul]:space-y-1.5">
        {children}
      </div>
    </section>
  );
}

/** "22 de noviembre de 2026" a partir de AAAA-MM-DD. */
export const fechaLegal = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
