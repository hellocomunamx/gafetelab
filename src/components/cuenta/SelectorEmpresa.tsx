"use client";

import { usePathname } from "next/navigation";
import { elegirEmpresa } from "@/app/cuenta/acciones";

type Proyecto = { id: string; nombre: string; tipo?: string | null; padre_id?: string | null; datos_borrados_en?: string | null };

/**
 * Proyectos de la persona: cada organización con su equipo de trabajo y sus
 * eventos. Al elegir otro, cambia de inmediato y se queda en la misma sección.
 */
export function SelectorEmpresa({ empresas, actual }: { empresas: Proyecto[]; actual?: string }) {
  const ruta = usePathname();
  const organizaciones = empresas.filter((e) => e.tipo !== "evento");
  const eventosDe = (id: string) => empresas.filter((e) => e.tipo === "evento" && e.padre_id === id);
  // Eventos a los que la invitaron sin estar en la organización.
  const sueltos = empresas.filter((e) => e.tipo === "evento" && !organizaciones.some((o) => o.id === e.padre_id));
  const hayEventos = empresas.some((e) => e.tipo === "evento");
  const nombreEvento = (e: Proyecto) => `Evento: ${e.nombre}${e.datos_borrados_en ? " (terminado)" : ""}`;

  return (
    <form action={elegirEmpresa} className="flex items-center gap-2">
      <input type="hidden" name="ruta" value={ruta} />
      <label className="sr-only" htmlFor="empresa">
        Cambiar de empresa o evento
      </label>
      <select
        id="empresa"
        name="empresa"
        defaultValue={actual}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="max-w-[18rem] rounded-tarjeta-chica border border-linea bg-white px-3 py-2 font-titulos font-bold"
      >
        {hayEventos
          ? organizaciones.map((o) => (
              <optgroup key={o.id} label={o.nombre}>
                <option value={o.id}>{o.nombre}: equipo de trabajo</option>
                {eventosDe(o.id).map((e) => (
                  <option key={e.id} value={e.id}>
                    {nombreEvento(e)}
                  </option>
                ))}
              </optgroup>
            ))
          : organizaciones.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
        {sueltos.length ? (
          <optgroup label="Eventos">
            {sueltos.map((e) => (
              <option key={e.id} value={e.id}>
                {nombreEvento(e)}
              </option>
            ))}
          </optgroup>
        ) : null}
      </select>
      <noscript>
        <button type="submit" className="text-sm font-semibold underline">
          Cambiar
        </button>
      </noscript>
    </form>
  );
}
