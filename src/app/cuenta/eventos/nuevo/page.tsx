import type { Metadata } from "next";
import Link from "next/link";
import { Bloque } from "@/components/cuenta/Entrada";
import { FormularioEvento } from "@/components/cuenta/FormularioEvento";
import { requerirEmpresa } from "@/lib/cuenta/sesion";
import { crearEvento } from "../acciones";

export const metadata: Metadata = { title: "Nuevo evento" };

export default async function NuevoEvento() {
  const { empresa, empresas } = await requerirEmpresa();
  const organizacion = empresa.tipo === "evento" ? empresas.find((e) => e.id === empresa.padre_id) : empresa;
  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-sm">
        <Link href="/cuenta/eventos" className="underline">Eventos</Link>
      </p>
      <h1 className="mt-2 text-3xl font-extrabold">Nuevo evento</h1>
      <p className="mt-2 text-gris">
        {organizacion ? `Queda dentro de ${organizacion.nombre}, con tus mismos usuarios, direcciones y datos de facturación. ` : ""}
        Después subes la lista de asistentes en Excel, revisas cómo sale cada gafete y pides con cotización en línea al momento.
      </p>
      <Bloque className="mt-6">
        <FormularioEvento accion={crearEvento} boton="Crear evento" />
      </Bloque>
    </div>
  );
}
