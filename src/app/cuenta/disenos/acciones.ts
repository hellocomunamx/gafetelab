"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { camposDe } from "@/lib/cuenta/consultas";
import { type CaraLista, revisarGafete } from "@/lib/cuenta/listos";
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

// --- Gafetes listos ---------------------------------------------------------

export type CaraSubida = { empleadoId: string; cara: CaraLista; ruta: string; ancho: number; alto: number };

const medida = (n: unknown): n is number => Number.isInteger(n) && (n as number) > 0 && (n as number) <= 20000;

/**
 * Registra los gafetes terminados que el navegador ya subió al almacenamiento.
 * Cada renglón es una cara de una persona; si ya tenía esa cara, se reemplaza.
 */
export async function guardarGafetesListos(caras: CaraSubida[]): Promise<Resultado> {
  const { supabase, empresa } = await requerirEmpresa();
  if (!Array.isArray(caras) || !caras.length || caras.length > 200) return { error: "Demasiados gafetes a la vez." };
  const vistos = new Set<string>();
  for (const c of caras) {
    const valida =
      UUID.test(c?.empleadoId) &&
      (c.cara === "frente" || c.cara === "vuelta") &&
      (c.ruta === `${empresa.id}/${c.empleadoId}-${c.cara}.jpg` || c.ruta === `${empresa.id}/${c.empleadoId}-${c.cara}.png`) &&
      medida(c.ancho) &&
      medida(c.alto) &&
      !revisarGafete(c.ancho, c.alto).bloquea &&
      !vistos.has(`${c.empleadoId}-${c.cara}`);
    if (!valida) return { error: "Gafete no válido." };
    vistos.add(`${c.empleadoId}-${c.cara}`);
  }

  const personas = [...new Set(caras.map((c) => c.empleadoId))];
  const { data: previos } = await supabase
    .from("gafetes_listos")
    .select("empleado_id, frente_path, vuelta_path")
    .in("empleado_id", personas);
  const previo = new Map((previos ?? []).map((g) => [g.empleado_id, g]));

  // Se guarda por cara para no borrar la otra: cada tanda lleva las mismas columnas.
  const fallas = await Promise.all(
    (["frente", "vuelta"] as const).map(async (cara) => {
      const filas = caras
        .filter((c) => c.cara === cara)
        .map((c) => {
          const base = { empleado_id: c.empleadoId, empresa_id: empresa.id };
          return cara === "frente"
            ? { ...base, frente_path: c.ruta, frente_ancho: c.ancho, frente_alto: c.alto }
            : { ...base, vuelta_path: c.ruta, vuelta_ancho: c.ancho, vuelta_alto: c.alto };
        });
      if (!filas.length) return null;
      const { error } = await supabase.from("gafetes_listos").upsert(filas, { onConflict: "empleado_id" });
      return error;
    }),
  );
  if (fallas.some(Boolean)) return { error: "Algunos gafetes no se pudieron guardar." };

  // Si la cara anterior tenía otra extensión, su archivo ya no se usa.
  const sobran = caras.flatMap((c) => {
    const fila = previo.get(c.empleadoId);
    const antes = c.cara === "frente" ? fila?.frente_path : fila?.vuelta_path;
    return antes && antes !== c.ruta ? [antes] : [];
  });
  if (sobran.length) await supabase.storage.from("gafetes").remove(sobran);
  refrescar();
  return { ok: "Gafetes guardados." };
}

/** Quita el gafete terminado de una persona: una cara o las dos. */
export async function quitarGafeteListo(d: FormData) {
  const { supabase, empresa } = await requerirEmpresa();
  const empleado = idDe(d);
  const cara = String(d.get("cara") ?? "");
  if (!empleado) return;
  const { data: actual } = await supabase
    .from("gafetes_listos")
    .select("frente_path, vuelta_path")
    .eq("empleado_id", empleado)
    .eq("empresa_id", empresa.id)
    .maybeSingle();
  if (!actual) return;
  const soloVuelta = cara === "vuelta" && actual.frente_path;
  if (soloVuelta) {
    await supabase
      .from("gafetes_listos")
      .update({ vuelta_path: null, vuelta_ancho: null, vuelta_alto: null })
      .eq("empleado_id", empleado);
  } else {
    await supabase.from("gafetes_listos").delete().eq("empleado_id", empleado);
  }
  const rutas = (soloVuelta ? [actual.vuelta_path] : [actual.frente_path, actual.vuelta_path]).filter(
    (r): r is string => Boolean(r),
  );
  if (rutas.length) await supabase.storage.from("gafetes").remove(rutas);
  refrescar();
}
