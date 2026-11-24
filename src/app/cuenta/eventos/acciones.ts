"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordarEmpresa, requerirEmpresa } from "@/lib/cuenta/sesion";
import type { Resultado } from "@/lib/cuenta/tipos";
import { normalizar } from "@/lib/diseno/reglas";
import { type Categoria, categoriasDe, esTipoEvento, hoyIso, limpiarCategorias } from "@/lib/eventos";
import { borrarDatosDeEvento, crearDisenosPorCategoria, renombrarCategoria } from "@/lib/eventos-servidor";
import { clienteServicio } from "@/lib/supabase/publico";

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const ERROR_GENERAL = "No pudimos guardar. Intenta de nuevo.";
const SOLO_ADMIN = "Solo quien administra la organización puede crear y cambiar eventos.";
const refrescar = () => revalidatePath("/cuenta", "layout");

type DatosEvento = {
  nombre: string;
  tipo: string;
  inicio: string;
  fin: string;
  limite: string;
  sede: string | null;
  categorias: Categoria[];
};

/** Lee y revisa lo que llega del formulario del evento. */
function leerEvento(d: FormData): DatosEvento | { error: string } {
  const nombre = String(d.get("nombre") ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  const tipo = String(d.get("tipo") ?? "");
  const inicio = String(d.get("inicio") ?? "");
  const fin = String(d.get("fin") ?? "") || inicio;
  const limite = String(d.get("limite") ?? "");
  const sede = String(d.get("sede") ?? "").replace(/\s+/g, " ").trim().slice(0, 160) || null;
  let categorias: Categoria[] = [];
  try {
    categorias = limpiarCategorias(JSON.parse(String(d.get("categorias") ?? "[]")));
  } catch {
    categorias = [];
  }
  if (!nombre) return { error: "Escribe el nombre del evento." };
  if (!esTipoEvento(tipo)) return { error: "Elige qué tipo de evento es." };
  if (!FECHA.test(inicio)) return { error: "Elige la fecha en que empieza el evento." };
  if (!FECHA.test(fin) || fin < inicio) return { error: "El evento no puede terminar antes de empezar." };
  if (!FECHA.test(limite)) return { error: "Elige la fecha límite para pedir los gafetes." };
  if (limite > fin) return { error: "La fecha límite para pedir debe ser antes de que termine el evento." };
  if (!categorias.length) return { error: "Deja al menos una categoría de gafete." };
  return { nombre, tipo, inicio, fin, limite, sede, categorias };
}

export async function crearEvento(_: Resultado, d: FormData): Promise<Resultado> {
  const { supabase, empresa, empresas, administra } = await requerirEmpresa();
  // Desde un evento también se puede crear otro: va a la misma organización.
  const organizacion = empresa.tipo === "evento" ? empresas.find((e) => e.id === empresa.padre_id) : empresa;
  if (!organizacion) return { error: "Crea el evento desde tu empresa." };
  if (empresa.tipo === "equipo" && !administra) return { error: SOLO_ADMIN };
  const datos = leerEvento(d);
  if ("error" in datos) return datos;
  if (datos.fin < hoyIso()) return { error: "Ese evento ya pasó. Revisa las fechas." };

  const { data: evento, error } = await supabase.rpc("crear_evento", {
    p_organizacion: organizacion.id,
    p_nombre: datos.nombre,
    p_tipo: datos.tipo,
    p_inicio: datos.inicio,
    p_fin: datos.fin,
    p_limite: datos.limite,
    p_sede: datos.sede ?? "",
    p_categorias: datos.categorias,
  });
  if (error || !evento) return { error: error?.code === "P0001" ? error.message : ERROR_GENERAL };

  await crearDisenosPorCategoria(supabase, {
    id: evento,
    nombre: datos.nombre,
    evento_inicio: datos.inicio,
    evento_fin: datos.fin,
    evento_sede: datos.sede,
    categorias: datos.categorias,
  });
  await recordarEmpresa(evento);
  refrescar();
  redirect("/cuenta/evento?nuevo=1");
}

export async function guardarEvento(_: Resultado, d: FormData): Promise<Resultado> {
  const { supabase, empresa, administra } = await requerirEmpresa();
  if (empresa.tipo !== "evento") return { error: ERROR_GENERAL };
  if (!administra) return { error: SOLO_ADMIN };
  if (empresa.datos_borrados_en) return { error: "Este evento ya terminó y sus datos se borraron." };
  const datos = leerEvento(d);
  if ("error" in datos) return datos;

  // Renombrar: el formulario manda el nombre anterior de cada categoría.
  let anteriores: (string | null)[] = [];
  try {
    const crudo = JSON.parse(String(d.get("anteriores") ?? "[]"));
    anteriores = Array.isArray(crudo) ? crudo.map((v) => (typeof v === "string" ? v : null)) : [];
  } catch {
    anteriores = [];
  }
  const guardadas = categoriasDe(empresa.categorias);
  const { data, error } = await supabase
    .from("empresas")
    .update({
      nombre: datos.nombre,
      evento_tipo: datos.tipo,
      evento_inicio: datos.inicio,
      evento_fin: datos.fin,
      evento_limite: datos.limite,
      evento_sede: datos.sede,
      categorias: datos.categorias,
    })
    .eq("id", empresa.id)
    .select("id");
  if (error) return { error: ERROR_GENERAL };
  if (!data.length) return { error: SOLO_ADMIN };

  for (const [i, c] of datos.categorias.entries()) {
    const antes = anteriores[i];
    if (antes && normalizar(antes) !== normalizar(c.nombre) && guardadas.some((g) => normalizar(g.nombre) === normalizar(antes))) {
      await renombrarCategoria(supabase, empresa.id, antes, c.nombre);
    }
  }
  refrescar();
  return { ok: "Guardado." };
}

/** Diseños para las categorías que todavía no tienen uno. */
export async function crearDisenosFaltantes(): Promise<void> {
  const { supabase, empresa } = await requerirEmpresa();
  if (empresa.tipo !== "evento" || empresa.datos_borrados_en) redirect("/cuenta/evento");
  const creados = await crearDisenosPorCategoria(supabase, empresa);
  refrescar();
  redirect(`/cuenta/disenos?creados=${creados}`);
}

/** Borra ya los datos de un evento terminado, sin esperar los días de gracia. */
export async function borrarDatosAhora(d: FormData): Promise<void> {
  const { empresa, administra } = await requerirEmpresa();
  const servicio = clienteServicio();
  if (empresa.tipo !== "evento" || !administra || !servicio || empresa.datos_borrados_en) redirect("/cuenta/evento");
  if (String(d.get("confirmo") ?? "") !== "si") redirect("/cuenta/evento?borrar=confirma");
  if ((empresa.evento_fin ?? "9999-12-31") >= hoyIso()) redirect("/cuenta/evento?borrar=antes");
  await borrarDatosDeEvento(servicio, empresa.id);
  refrescar();
  redirect("/cuenta/evento?borrado=1");
}
