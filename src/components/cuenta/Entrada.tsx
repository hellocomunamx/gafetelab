import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { claseEntrada } from "./Formulario";

/** Etiqueta con su campo de texto. */
export function Entrada({
  etiqueta,
  ayuda,
  className = "",
  ...resto
}: { etiqueta: string; ayuda?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-semibold">{etiqueta}</span>
      <input {...resto} className={claseEntrada} />
      {ayuda ? <span className="mt-1 block text-xs text-gris">{ayuda}</span> : null}
    </label>
  );
}

/** Etiqueta con su lista de opciones. */
export function Seleccion({
  etiqueta,
  children,
  className = "",
  ...resto
}: { etiqueta: string; children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-semibold">{etiqueta}</span>
      <select {...resto} className={claseEntrada}>
        {children}
      </select>
    </label>
  );
}

/** Tarjeta blanca con título, para agrupar cada bloque de la cuenta. */
export function Bloque({
  titulo,
  children,
  className = "",
}: {
  titulo?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-tarjeta border border-linea bg-white p-5 sm:p-6 ${className}`}>
      {titulo ? <h2 className="mb-4 text-xl font-extrabold">{titulo}</h2> : null}
      {children}
    </section>
  );
}

const COLORES: Record<string, string> = {
  activo: "bg-[#dff3ea] text-[#0a5c3b]",
  pendiente: "bg-resaltador/40 text-tinta",
  baja: "bg-linea text-gris",
};

export function Estatus({ valor }: { valor: string }) {
  const nombre = { activo: "Activo", pendiente: "Pendiente", baja: "Baja" }[valor] ?? valor;
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${COLORES[valor] ?? COLORES.baja}`}>
      {nombre}
    </span>
  );
}
