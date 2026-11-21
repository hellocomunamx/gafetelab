import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { borrarEmpleado, cambiarEstatus, quitarFoto } from "@/app/cuenta/acciones";
import { Confirmar } from "@/components/cuenta/Confirmar";
import { Bloque, Estatus } from "@/components/cuenta/Entrada";
import { claseBotonSecundario } from "@/components/cuenta/Formulario";
import { FormularioEmpleado } from "@/components/cuenta/FormularioEmpleado";
import { FotoEmpleado } from "@/components/cuenta/FotoEmpleado";
import { estadosGafete, motivosGafete } from "@/lib/cuenta/catalogos";
import { camposDe, sugerenciasDe } from "@/lib/cuenta/consultas";
import { ligasDeFotos } from "@/lib/cuenta/fotos";
import { requerirEmpresa } from "@/lib/cuenta/sesion";

export const metadata: Metadata = { title: "Persona" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Fecha legible. Una fecha sin hora (AAAA-MM-DD) se muestra tal cual, sin moverla de zona horaria. */
const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: iso.length === 10 ? "UTC" : "America/Hermosillo",
  });

export default async function Persona({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase, empresa } = await requerirEmpresa();
  const { data: persona } = await supabase
    .from("empleados")
    .select("*")
    .eq("id", id)
    .eq("empresa_id", empresa.id)
    .maybeSingle();
  if (!persona) notFound();

  const [campos, sugerencias, { data: gafetes }, fotos] = await Promise.all([
    camposDe(supabase, empresa.id),
    sugerenciasDe(supabase, empresa.id),
    supabase.from("gafetes").select("*").eq("empleado_id", id).order("emitido_en", { ascending: false }),
    ligasDeFotos(supabase, [persona.foto_path]),
  ]);
  const deBaja = persona.estatus === "baja";

  return (
    <div className="space-y-5">
      <p className="text-sm"><Link href="/cuenta/equipo" className="underline">Equipo</Link> / {persona.nombre}</p>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-extrabold">{persona.nombre}</h1>
        <Estatus valor={persona.estatus} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
        <div className="min-w-0 space-y-5">
          <Bloque titulo="Datos">
            <FormularioEmpleado empleado={persona} campos={campos} {...sugerencias} />
          </Bloque>

          <Bloque titulo="Historial de gafetes">
            {gafetes?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[28rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-linea">
                      <th scope="col" className="py-2 pr-4 font-semibold">Fecha</th>
                      <th scope="col" className="py-2 pr-4 font-semibold">Motivo</th>
                      <th scope="col" className="py-2 pr-4 font-semibold">Tipo</th>
                      <th scope="col" className="py-2 font-semibold">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-linea">
                    {gafetes.map((g) => (
                      <tr key={g.id}>
                        <td className="py-2 pr-4">{fecha(g.emitido_en)}</td>
                        <td className="py-2 pr-4">{motivosGafete[g.motivo] ?? g.motivo}</td>
                        <td className="py-2 pr-4 capitalize">{g.tipo}</td>
                        <td className="py-2">{estadosGafete[g.estado] ?? g.estado}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gris">
                Todavía no se le ha emitido ningún gafete. Aquí vas a ver cada uno con su motivo: alta,
                reposición o cambio de datos.
              </p>
            )}
          </Bloque>
        </div>

        <div className="space-y-5">
          <Bloque titulo="Fotografía">
            <FotoEmpleado
              empresaId={empresa.id}
              empleadoId={persona.id}
              url={persona.foto_path ? fotos.get(persona.foto_path) : undefined}
            >
              {persona.foto_path ? (
                <form action={quitarFoto}>
                  <input type="hidden" name="id" value={persona.id} />
                  <button type="submit" className="underline">Quitar</button>
                </form>
              ) : null}
            </FotoEmpleado>
          </Bloque>

          <Bloque titulo="Estatus">
            <p className="text-sm text-gris">
              {deBaja
                ? `De baja${persona.fecha_baja ? ` desde el ${fecha(persona.fecha_baja)}` : ""}. Su historial se conserva.`
                : persona.estatus === "pendiente"
                  ? "Pendiente: todavía no entra a tus pedidos."
                  : "Activa: entra a tus pedidos de gafetes y credenciales."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(deBaja ? ["activo"] : persona.estatus === "pendiente" ? ["activo", "baja"] : ["baja"]).map((e) => (
                <form key={e} action={cambiarEstatus}>
                  <input type="hidden" name="id" value={persona.id} />
                  <input type="hidden" name="estatus" value={e} />
                  <button type="submit" className={`${claseBotonSecundario} px-4 py-1.5 text-sm`}>
                    {e === "baja" ? "Dar de baja" : deBaja ? "Reactivar" : "Marcar como activa"}
                  </button>
                </form>
              ))}
            </div>
            <div className="mt-5 border-t border-linea pt-4">
              <Confirmar accion={borrarEmpleado} id={persona.id} texto="Eliminar a esta persona" confirmar="Sí, eliminar">
                Se borran sus datos y su foto, y no se puede deshacer. Si solo dejó de trabajar contigo,
                mejor dale de baja.
              </Confirmar>
            </div>
          </Bloque>
        </div>
      </div>
    </div>
  );
}
