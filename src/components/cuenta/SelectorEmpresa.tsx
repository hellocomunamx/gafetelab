"use client";

import { usePathname } from "next/navigation";
import { elegirEmpresa } from "@/app/cuenta/acciones";

/** Lista de las empresas de la persona: al elegir otra, cambia de inmediato y se queda en la misma sección. */
export function SelectorEmpresa({ empresas, actual }: { empresas: { id: string; nombre: string }[]; actual?: string }) {
  const ruta = usePathname();
  return (
    <form action={elegirEmpresa} className="flex items-center gap-2">
      <input type="hidden" name="ruta" value={ruta} />
      <label className="sr-only" htmlFor="empresa">
        Cambiar de empresa
      </label>
      <select
        id="empresa"
        name="empresa"
        defaultValue={actual}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="max-w-[16rem] rounded-tarjeta-chica border border-linea bg-white px-3 py-2 font-titulos font-bold"
      >
        {empresas.map((e) => (
          <option key={e.id} value={e.id}>
            {e.nombre}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="text-sm font-semibold underline">
          Cambiar
        </button>
      </noscript>
    </form>
  );
}
