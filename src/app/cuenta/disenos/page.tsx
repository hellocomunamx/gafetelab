import type { Metadata } from "next";
import Link from "next/link";
import { Confirmar } from "@/components/cuenta/Confirmar";
import { claseBoton } from "@/components/cuenta/Formulario";
import { GafeteSvg } from "@/components/diseno/GafeteSvg";
import { camposDe } from "@/lib/cuenta/consultas";
import { ligasDe } from "@/lib/cuenta/fotos";
import { requerirEmpresa } from "@/lib/cuenta/sesion";
import { datosDeMuestra, disenoDeFila } from "@/lib/diseno/datos";
import { rutasDe } from "@/lib/diseno/limpiar";
import { borrarDiseno, duplicarDiseno, predeterminarDiseno } from "./acciones";

export const metadata: Metadata = { title: "Diseños" };

const ligaAccion = "font-semibold underline underline-offset-4";

export default async function Disenos() {
  const { supabase, empresa } = await requerirEmpresa();
  const [{ data: filas }, campos] = await Promise.all([
    supabase
      .from("disenos")
      .select("id, nombre, orientacion, frente, vuelta, predeterminado")
      .eq("empresa_id", empresa.id)
      .order("predeterminado", { ascending: false })
      .order("creado_en"),
    camposDe(supabase, empresa.id),
  ]);
  const disenos = (filas ?? []).map((f) => ({ ...disenoDeFila(f), predeterminado: f.predeterminado }));
  const ligas = await ligasDe(supabase, "disenos", disenos.flatMap((d) => rutasDe(d.frente)));
  const imagenes = Object.fromEntries(ligas);
  const datos = datosDeMuestra(campos);
  const etiquetas = Object.fromEntries(campos.map((c) => [c.clave, c.etiqueta]));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold">Diseños</h1>
        <Link href="/cuenta/disenos/nuevo" className={claseBoton}>Crear diseño</Link>
      </div>

      {disenos.length ? (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {disenos.map((d) => (
            <li key={d.id} className="flex flex-col rounded-tarjeta border border-linea bg-white p-4">
              <Link
                href={`/cuenta/disenos/${d.id}`}
                aria-label={`Editar ${d.nombre}`}
                className="flex h-52 items-center justify-center rounded-tarjeta-chica bg-papel p-4"
              >
                <GafeteSvg
                  cara={d.frente}
                  orientacion={d.orientacion}
                  datos={datos}
                  etiquetas={etiquetas}
                  imagenes={imagenes}
                  titulo={`Frente de ${d.nombre}`}
                  className="max-h-full max-w-full drop-shadow-md"
                />
              </Link>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-extrabold">{d.nombre}</h2>
                {d.predeterminado ? (
                  <span className="rounded-full bg-[#dff3ea] px-2.5 py-0.5 text-xs font-semibold text-[#0a5c3b]">
                    Predeterminado
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-gris">
                {d.orientacion === "vertical" ? "Vertical" : "Horizontal"}, {d.vuelta ? "frente y vuelta" : "solo frente"}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <Link href={`/cuenta/disenos/${d.id}`} className={`${ligaAccion} text-rojo`}>Editar</Link>
                <Link href={`/cuenta/disenos/${d.id}/vista`} className={ligaAccion}>Ver con mi equipo</Link>
                <form action={duplicarDiseno}>
                  <input type="hidden" name="id" value={d.id} />
                  <button type="submit" className={ligaAccion}>Duplicar</button>
                </form>
                {d.predeterminado ? null : (
                  <form action={predeterminarDiseno}>
                    <input type="hidden" name="id" value={d.id} />
                    <button type="submit" className={ligaAccion}>Usar siempre</button>
                  </form>
                )}
              </div>
              <div className="mt-3 border-t border-linea pt-3">
                <Confirmar accion={borrarDiseno} id={d.id} texto="Borrar diseño" confirmar="Sí, borrarlo">
                  Se borra el diseño con su fondo y sus imágenes. Los gafetes ya emitidos no cambian.
                </Confirmar>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-tarjeta border border-dashed border-linea bg-white p-8 text-center">
          <p className="font-semibold">Todavía no tienes diseños.</p>
          <p className="mt-1 text-gris">
            Empieza con una plantilla o sube tu propio fondo, y acomoda los campos de tu equipo donde quieras.
          </p>
          <Link href="/cuenta/disenos/nuevo" className={`${claseBoton} mt-4`}>Crear mi primer diseño</Link>
        </div>
      )}
      <p className="text-sm text-gris">
        El diseño predeterminado es el que se usará en tus pedidos. Los datos de las miniaturas son de ejemplo.
      </p>
    </div>
  );
}
