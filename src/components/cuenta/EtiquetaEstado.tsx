import { type EstadoEvento, fechaEvento } from "@/lib/eventos";

/** Cómo se ve el punto en que va cada evento. */
export function EtiquetaEstado({ estado }: { estado: EstadoEvento }) {
  const { texto, clase } =
    estado.fase === "a_tiempo"
      ? {
          texto: estado.diasParaLimite === 0 ? "Hoy es el último día para pedir" : `${estado.diasParaLimite} ${estado.diasParaLimite === 1 ? "día" : "días"} para pedir`,
          clase: "bg-[#dff3ea] text-[#0a5c3b]",
        }
      : estado.fase === "tarde"
        ? { texto: "Pasó la fecha límite para pedir", clase: "bg-resaltador/40 text-tinta" }
        : estado.fase === "en_curso"
          ? { texto: "En curso", clase: "bg-tinta text-white" }
          : estado.fase === "terminado"
            ? { texto: `Terminado: sus datos se borran el ${fechaEvento(estado.borradoEl)}`, clase: "bg-linea text-gris" }
            : { texto: "Terminado, datos borrados", clase: "bg-linea text-gris" };
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${clase}`}>{texto}</span>;
}
