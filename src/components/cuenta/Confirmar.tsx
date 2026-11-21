import type { ReactNode } from "react";

/**
 * Botón de dos pasos, sin JavaScript: primero se abre y luego se confirma.
 * Para acciones que no se pueden deshacer.
 */
export function Confirmar({
  accion,
  id,
  texto,
  confirmar,
  children,
}: {
  accion: (datos: FormData) => Promise<void>;
  id: string;
  texto: string;
  confirmar: string;
  children?: ReactNode;
}) {
  return (
    <details className="group text-sm">
      <summary className="cursor-pointer list-none font-semibold text-rojo-oscuro underline underline-offset-4 [&::-webkit-details-marker]:hidden">
        {texto}
      </summary>
      <form action={accion} className="mt-2 rounded-tarjeta-chica bg-papel p-3">
        <input type="hidden" name="id" value={id} />
        {children ? <p className="mb-2 text-gris">{children}</p> : null}
        <button type="submit" className="rounded-full bg-rojo-oscuro px-4 py-1.5 font-semibold text-white">
          {confirmar}
        </button>
      </form>
    </details>
  );
}
