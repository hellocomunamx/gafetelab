"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { camposDe } from "@/lib/cuenta/consultas";
import { requerirEmpresa } from "@/lib/cuenta/sesion";
import type { Resultado } from "@/lib/cuenta/tipos";
import { limpiarCara, rutasDe } from "@/lib/diseno/limpiar";
import { crearDesdePlantilla, esPlantilla } from "@/lib/diseno/plantillas";
import type { Cara, Orientacion } from "@/lib/diseno/tipos";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLOR = /^#[0-9a-f]{6}$/i;
const MAXIMO = 30;
const ERROR_GENERAL = "No pudimos guardar. Intenta de nuevo.";
const refrescar = () => revalidatePath("/cuenta", "layout");
const idDe = (d: FormData) => {
  const v = String(d.get("id") ?? "");
  return UUID.test(v) ? v : null;
};
const orientacionDe = (v: unknown): Orientacion => (v === "vertical" ? "vertical" : "horizontal");

type Cliente = Awaited<ReturnType<typeof requerirEmpresa>>["supabase"];

/**
 * Borra del almacenamiento los fondos e imágenes que ya no usa ningún diseño.
 * Los archivos de menos de un día se respetan: pueden ser de un editor abierto
 * que todavía no guarda, o volver con "Deshacer".
 */
async function limpiarArchivos(supabase: Cliente, empresaId: string) {
  const [{ data: archivos }, { data: disenos }] = await Promise.all([
    supabase.storage.from("disenos").list(empresaId, { limit: 1000 }),
    supabase.from("disenos").select("frente, vuelta").eq("empresa_id", empresaId),
  ]);
  if (!archivos?.length || !disenos) return;
  const enUso = new Set(disenos.flatMap((d) => [...rutasDe(d.frente as Cara), ...rutasDe(d.vuelta as Cara | null)]));
  const limite = Date.now() - 24 * 60 * 60 * 1000;
  const sobran = archivos
    .filter((a) => a.id && a.created_at && Date.parse(a.created_at) < limite)
    .map((a) => `${empresaId}/${a.name}`)
    .filter((ruta) => !enUso.has(ruta));
  if (sobran.length) await supabase.storage.from("disenos").remove(sobran);
}

export async function crearDiseno(_: Resultado, d: FormData): Promise<Resultado> {
  const { supabase, empresa } = await requerirEmpresa();
  const plantilla = String(d.get("plantilla") ?? "");
  if (!esPlantilla(plantilla)) return { error: "Elige con qué quieres empezar." };
  const color = String(d.get("color") ?? "");
  const orientacion = orientacionDe(d.get("orientacion"));

  const { count } = await supabase
    .from("disenos")
    .select("id", { count: "exact", head: true })
    .eq("empresa_id", empresa.id);
  if ((count ?? 0) >= MAXIMO) return { error: `Llegaste al máximo de ${MAXIMO} diseños. Borra alguno para crear otro.` };

  const campos = await camposDe(supabase, empresa.id);
  const { frente, vuelta } = crearDesdePlantilla(
    plantilla,
    orientacion,
    campos,
    COLOR.test(color) ? color.toLowerCase() : "#e63b2e",
    empresa.nombre,
  );
  const nombre = String(d.get("nombre") ?? "").trim().slice(0, 80) || `Diseño ${(count ?? 0) + 1}`;
  const { data, error } = await supabase
    .from("disenos")
    .insert({
      empresa_id: empresa.id,
      nombre,
      orientacion,
      frente: frente as never,
      vuelta: vuelta as never,
      predeterminado: !count,
    })
    .select("id")
    .single();
  if (error || !data) return { error: ERROR_GENERAL };
  refrescar();
  redirect(`/cuenta/disenos/${data.id}`);
}

/** Guarda el diseño completo desde el editor. */
export async function guardarDiseno(entrada: {
  id: string;
  nombre: string;
  orientacion: Orientacion;
  frente: Cara;
  vuelta: Cara | null;
}): Promise<Resultado> {
  const { supabase, empresa } = await requerirEmpresa();
  if (!entrada || !UUID.test(entrada.id)) return { error: ERROR_GENERAL };
  const nombre = String(entrada.nombre ?? "").trim().slice(0, 80);
  if (!nombre) return { error: "Ponle nombre a tu diseño." };
  const orientacion = orientacionDe(entrada.orientacion);
  const frente = limpiarCara(entrada.frente, orientacion, empresa.id);
  if (!frente) return { error: ERROR_GENERAL };
  const vuelta = entrada.vuelta ? limpiarCara(entrada.vuelta, orientacion, empresa.id) : null;

  const { data, error } = await supabase
    .from("disenos")
    .update({ nombre, orientacion, frente: frente as never, vuelta: vuelta as never })
    .eq("id", entrada.id)
    .eq("empresa_id", empresa.id)
    .select("id");
  if (error || !data.length) return { error: ERROR_GENERAL };
  await limpiarArchivos(supabase, empresa.id);
  refrescar();
  return { ok: "Guardado." };
}

export async function duplicarDiseno(d: FormData) {
  const { supabase, empresa } = await requerirEmpresa();
  const id = idDe(d);
  if (!id) return;
  const [{ data: original }, { count }] = await Promise.all([
    supabase.from("disenos").select("*").eq("id", id).eq("empresa_id", empresa.id).maybeSingle(),
    supabase.from("disenos").select("id", { count: "exact", head: true }).eq("empresa_id", empresa.id),
  ]);
  if (!original || (count ?? 0) >= MAXIMO) return;
  const { data } = await supabase
    .from("disenos")
    .insert({
      empresa_id: empresa.id,
      nombre: `${original.nombre} (copia)`.slice(0, 80),
      orientacion: original.orientacion,
      frente: original.frente as never,
      vuelta: original.vuelta as never,
    })
    .select("id")
    .single();
  refrescar();
  if (data) redirect(`/cuenta/disenos/${data.id}`);
}

export async function predeterminarDiseno(d: FormData) {
  const { supabase, empresa } = await requerirEmpresa();
  const id = idDe(d);
  if (id) {
    await supabase.from("disenos").update({ predeterminado: false }).eq("empresa_id", empresa.id);
    await supabase.from("disenos").update({ predeterminado: true }).eq("id", id).eq("empresa_id", empresa.id);
  }
  refrescar();
}

export async function borrarDiseno(d: FormData) {
  const { supabase, empresa } = await requerirEmpresa();
  const id = idDe(d);
  if (id) {
    const { data: borrados } = await supabase
      .from("disenos")
      .delete()
      .eq("id", id)
      .eq("empresa_id", empresa.id)
      .select("predeterminado");
    if (borrados?.length) {
      // Las copias comparten archivos: solo se borran los que ya no usa ningún diseño.
      await limpiarArchivos(supabase, empresa.id);
      if (borrados[0].predeterminado) {
        const { data: otro } = await supabase
          .from("disenos")
          .select("id")
          .eq("empresa_id", empresa.id)
          .order("creado_en")
          .limit(1)
          .maybeSingle();
        if (otro) await supabase.from("disenos").update({ predeterminado: true }).eq("id", otro.id);
      }
    }
  }
  refrescar();
  redirect("/cuenta/disenos");
}
