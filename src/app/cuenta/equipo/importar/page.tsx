import type { Metadata } from "next";
import Link from "next/link";
import { ImportarExcel } from "@/components/cuenta/ImportarExcel";
import { camposDe } from "@/lib/cuenta/consultas";
import { requerirEmpresa } from "@/lib/cuenta/sesion";
import { claveDe } from "@/lib/cuenta/texto";

export const metadata: Metadata = { title: "Importar Excel" };

export default async function Importar() {
  const { supabase, empresa } = await requerirEmpresa();
  const campos = await camposDe(supabase, empresa.id);
  return (
    <div className="space-y-5">
      <p className="text-sm"><Link href="/cuenta/equipo" className="underline">Equipo</Link> / Importar Excel</p>
      <h1 className="text-3xl font-extrabold">Sube a tu equipo con Excel</h1>
      <p className="max-w-2xl text-gris">
        Personaliza los campos de tu gafete y descarga una plantilla de Excel hecha a tu medida. Si
        vuelves a subir a alguien con el mismo número de empleado, se actualiza en lugar de duplicarse.
      </p>
      <ImportarExcel
        campos={campos.map(({ clave, etiqueta, tipo }) => ({ clave, etiqueta, tipo }))}
        empresa={claveDe(empresa.nombre).replace(/_/g, "-")}
      />
    </div>
  );
}
