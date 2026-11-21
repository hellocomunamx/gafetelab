import type { Metadata } from "next";
import Link from "next/link";
import { Bloque } from "@/components/cuenta/Entrada";
import { FormularioEmpleado } from "@/components/cuenta/FormularioEmpleado";
import { camposDe, sugerenciasDe } from "@/lib/cuenta/consultas";
import { requerirEmpresa } from "@/lib/cuenta/sesion";

export const metadata: Metadata = { title: "Agregar persona" };

export default async function NuevaPersona() {
  const { supabase, empresa } = await requerirEmpresa();
  const [campos, sugerencias] = await Promise.all([
    camposDe(supabase, empresa.id),
    sugerenciasDe(supabase, empresa.id),
  ]);
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <p className="text-sm"><Link href="/cuenta/equipo" className="underline">Equipo</Link> / Agregar persona</p>
      <h1 className="text-3xl font-extrabold">Agregar persona</h1>
      <Bloque>
        <FormularioEmpleado campos={campos} {...sugerencias} />
      </Bloque>
      <p className="text-sm text-gris">
        ¿Son varias? <Link href="/cuenta/equipo/importar" className="underline">Súbelas con Excel</Link>.
      </p>
    </div>
  );
}
