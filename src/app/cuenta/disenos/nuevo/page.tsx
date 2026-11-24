import type { Metadata } from "next";
import Link from "next/link";
import { Bloque } from "@/components/cuenta/Entrada";
import { NuevoDiseno } from "@/components/diseno/NuevoDiseno";
import { camposDe } from "@/lib/cuenta/consultas";
import { requerirEmpresa } from "@/lib/cuenta/sesion";
import { datosDeMuestra } from "@/lib/diseno/datos";

export const metadata: Metadata = { title: "Crear diseño" };

export default async function DisenoNuevo() {
  const { supabase, empresa } = await requerirEmpresa();
  const campos = await camposDe(supabase, empresa.id);
  return (
    <div className="space-y-5">
      <p className="text-sm"><Link href="/cuenta/disenos" className="underline">Diseños</Link> / Crear diseño</p>
      <h1 className="text-3xl font-extrabold">Crear diseño</h1>
      <Bloque>
        <NuevoDiseno
          campos={campos.map(({ clave, etiqueta, tipo, en_gafete, cara, orden }) => ({ clave, etiqueta, tipo, en_gafete, cara, orden }))}
          empresa={empresa.nombre}
          datos={datosDeMuestra(campos)}
        />
      </Bloque>
      <p className="text-sm text-gris">
        ¿Ya tienes el gafete terminado de cada persona?{" "}
        <Link href="/cuenta/disenos/listos" className="underline">Súbelos de forma masiva</Link>.
      </p>
    </div>
  );
}
