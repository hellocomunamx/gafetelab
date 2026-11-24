import type { Metadata } from "next";
import Link from "next/link";
import { elegirEmpresa } from "@/app/cuenta/acciones";
import { claseBoton } from "@/components/cuenta/clases";
import { Bloque } from "@/components/cuenta/Entrada";
import { requerirEmpresa } from "@/lib/cuenta/sesion";
import { EtiquetaEstado } from "@/components/cuenta/EtiquetaEstado";
import { estadoEvento, nombreTipoEvento, rangoEvento } from "@/lib/eventos";

export const metadata: Metadata = { title: "Eventos" };

export default async function Eventos() {
  const { supabase, empresa, empresas } = await requerirEmpresa();
  const organizacion = empresa.tipo === "evento" ? empresa.padre_id : empresa.id;
  const { data: eventos } = await supabase
    .from("empresas")
    .select("id, nombre, evento_tipo, evento_inicio, evento_fin, evento_limite, evento_sede, datos_borrados_en")
    .eq("tipo", "evento")
    .eq("padre_id", organizacion ?? "")
    .order("evento_inicio", { ascending: false });
  const nombreOrg = empresas.find((e) => e.id === organizacion)?.nombre ?? empresa.nombre;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Eventos</h1>
          <p className="mt-2 max-w-2xl text-gris">
            Congresos, convenciones, foros, capacitaciones o expos de {nombreOrg}. Cada evento tiene sus asistentes, sus categorías
            de gafete con color, su fecha límite para pedir y un QR de acceso por persona. Sus datos se borran solos al terminar.
          </p>
        </div>
        <Link href="/cuenta/eventos/nuevo" className={claseBoton}>Nuevo evento</Link>
      </div>

      {eventos?.length ? (
        <ul className="grid gap-4 md:grid-cols-2">
          {eventos.map((e) => (
            <li key={e.id}>
              <Bloque className="h-full">
                <p className="text-sm text-gris">{nombreTipoEvento(e.evento_tipo)}</p>
                <p className="mt-1 font-titulos text-xl font-extrabold">{e.nombre}</p>
                <p className="mt-1 text-sm">
                  {e.evento_inicio && e.evento_fin ? rangoEvento(e.evento_inicio, e.evento_fin) : ""}
                  {e.evento_sede ? ` · ${e.evento_sede}` : ""}
                </p>
                <div className="mt-3">
                  <EtiquetaEstado estado={estadoEvento(e)} />
                </div>
                <form action={elegirEmpresa} className="mt-4">
                  <input type="hidden" name="empresa" value={e.id} />
                  <input type="hidden" name="ruta" value="/cuenta/evento" />
                  <button type="submit" className="font-semibold underline">Abrir evento</button>
                </form>
              </Bloque>
            </li>
          ))}
        </ul>
      ) : (
        <Bloque>
          <p className="font-semibold">Todavía no tienes eventos.</p>
          <p className="mt-1 text-gris">
            Crea uno con sus fechas y categorías (asistente, ponente, staff, prensa, expositor y organizador) y sube la lista en Excel.
          </p>
        </Bloque>
      )}
    </div>
  );
}
