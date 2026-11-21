import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EditorDiseno } from "@/components/diseno/EditorDiseno";
import { camposDe } from "@/lib/cuenta/consultas";
import { ligasDe } from "@/lib/cuenta/fotos";
import { requerirEmpresa } from "@/lib/cuenta/sesion";
import { datosDeMuestra, datosDePersona, disenoDeFila } from "@/lib/diseno/datos";
import { rutasDe } from "@/lib/diseno/limpiar";

export const metadata: Metadata = { title: "Editar diseño" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditarDiseno({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { supabase, empresa } = await requerirEmpresa();
  const [{ data: fila }, campos, { data: equipo }] = await Promise.all([
    supabase.from("disenos").select("id, nombre, orientacion, frente, vuelta").eq("id", id).eq("empresa_id", empresa.id).maybeSingle(),
    camposDe(supabase, empresa.id),
    supabase
      .from("empleados")
      .select("id, nombre, numero_empleado, puesto, departamento, tipo_contrato, datos, foto_path")
      .eq("empresa_id", empresa.id)
      .neq("estatus", "baja")
      .order("nombre")
      .limit(40),
  ]);
  if (!fila) notFound();
  const diseno = disenoDeFila(fila);
  const [imagenes, fotos] = await Promise.all([
    ligasDe(supabase, "disenos", [...rutasDe(diseno.frente), ...rutasDe(diseno.vuelta)]),
    ligasDe(supabase, "fotos", (equipo ?? []).map((p) => p.foto_path)),
  ]);

  return (
    <div className="space-y-4">
      <p className="text-sm"><Link href="/cuenta/disenos" className="underline">Diseños</Link> / {diseno.nombre}</p>
      <h1 className="sr-only">Editar el diseño {diseno.nombre}</h1>
      <EditorDiseno
        key={diseno.id}
        inicial={diseno}
        empresaId={empresa.id}
        campos={campos.map(({ clave, etiqueta, tipo }) => ({ clave, etiqueta, tipo }))}
        personas={(equipo ?? []).map((p) => ({
          id: p.id,
          nombre: p.nombre,
          datos: datosDePersona(p, campos),
          foto: (p.foto_path && fotos.get(p.foto_path)) || null,
        }))}
        muestra={datosDeMuestra(campos)}
        imagenesIniciales={Object.fromEntries(imagenes)}
      />
    </div>
  );
}
