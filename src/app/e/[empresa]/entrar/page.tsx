import { notFound } from "next/navigation";
import { claseBoton } from "@/components/cuenta/clases";
import { FORMATO_TOKEN } from "@/lib/portal/cripto";
import { FORMATO_HANDLE } from "@/lib/portal/reglas";
import { clienteServicio } from "@/lib/supabase/publico";
import { entrarConEnlace } from "../../acciones";

export const dynamic = "force-dynamic";

/**
 * Liga del correo. No entra sola al abrirse: los revisores de correo de
 * algunas empresas abren las ligas para revisarlas y la gastarían. La persona
 * confirma con un botón.
 */
export default async function EntrarConLiga({
  params,
  searchParams,
}: {
  params: Promise<{ empresa: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { empresa: handle } = await params;
  const { t = "" } = await searchParams;
  if (!FORMATO_HANDLE.test(handle)) notFound();
  const servicio = clienteServicio();
  const { data: empresa } = servicio
    ? await servicio.from("empresas").select("nombre").eq("handle", handle).eq("portal_activo", true).maybeSingle()
    : { data: null };
  if (!empresa) notFound();
  return (
    <div className="mx-auto max-w-md text-center">
      <p className="text-sm font-semibold text-gris">{empresa.nombre}</p>
      <h1 className="mt-1 text-3xl font-extrabold">Mi gafete</h1>
      {FORMATO_TOKEN.test(t) ? (
        <form action={entrarConEnlace} className="mt-6 rounded-tarjeta border border-linea bg-white p-6">
          <input type="hidden" name="empresa" value={handle} />
          <input type="hidden" name="t" value={t} />
          <p className="text-gris">Toca el botón para entrar. La liga sirve una sola vez.</p>
          <button type="submit" className={`${claseBoton} mt-5 w-full`}>Entrar a Mi gafete</button>
        </form>
      ) : (
        <p className="mt-6 rounded-tarjeta-chica bg-rojo/10 p-4 text-sm">Esta liga no está completa. Ábrela de nuevo desde tu correo o pide un código nuevo.</p>
      )}
    </div>
  );
}
