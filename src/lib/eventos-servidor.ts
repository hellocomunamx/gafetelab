import type { SupabaseClient } from "@supabase/supabase-js";
import { camposDe } from "@/lib/cuenta/consultas";
import { disenoDeEvento } from "@/lib/diseno/plantilla-evento";
import { normalizar } from "@/lib/diseno/reglas";
import { type Categoria, categoriasDe, diasParaBorrarDatos, hoyIso, rangoEvento, sumarDias } from "@/lib/eventos";
import type { Database } from "@/lib/supabase/tipos";

type Cliente = SupabaseClient<Database>;

type EventoParaDisenos = {
  id: string;
  nombre: string;
  evento_inicio: string | null;
  evento_fin: string | null;
  evento_sede: string | null;
  categorias: unknown;
};

/**
 * Crea un diseño por cada categoría que todavía no tiene uno, con la regla
 * «Categoría = …» que lo asigna. Así cada persona sale con la franja del color
 * de su categoría. El primero queda como diseño predeterminado. Devuelve
 * cuántos diseños creó.
 */
export async function crearDisenosPorCategoria(supabase: Cliente, evento: EventoParaDisenos): Promise<number> {
  const categorias = categoriasDe(evento.categorias);
  if (!categorias.length) return 0;
  const [campos, { data: reglas }, { count }] = await Promise.all([
    camposDe(supabase, evento.id),
    supabase.from("reglas_diseno").select("valor, orden").eq("empresa_id", evento.id).eq("campo", "categoria"),
    supabase.from("disenos").select("id", { count: "exact", head: true }).eq("empresa_id", evento.id),
  ]);
  const conRegla = new Set((reglas ?? []).map((r) => normalizar(r.valor)));
  const faltan = categorias.filter((c) => !conRegla.has(normalizar(c.nombre)));
  const fechas = evento.evento_inicio && evento.evento_fin ? rangoEvento(evento.evento_inicio, evento.evento_fin) : "";
  let orden = Math.max(0, ...(reglas ?? []).map((r) => r.orden + 1));
  let creados = 0;
  let predeterminado = !count;

  for (const categoria of faltan) {
    const { frente, vuelta } = disenoDeEvento({ evento: evento.nombre, fechas, sede: evento.evento_sede, categoria, campos });
    const { data: diseno } = await supabase
      .from("disenos")
      .insert({
        empresa_id: evento.id,
        nombre: `${categoria.nombre}`.slice(0, 80),
        orientacion: "vertical",
        frente: frente as never,
        vuelta: vuelta as never,
        predeterminado,
      })
      .select("id")
      .single();
    if (!diseno) break;
    predeterminado = false;
    await supabase
      .from("reglas_diseno")
      .insert({ empresa_id: evento.id, campo: "categoria", valor: categoria.nombre, diseno_id: diseno.id, orden: orden++ });
    creados++;
  }
  return creados;
}

/**
 * Cambia el nombre de una categoría donde se usa: en el dato de cada persona,
 * en su regla de diseño y en el nombre del diseño si era el mismo.
 */
export async function renombrarCategoria(supabase: Cliente, eventoId: string, antes: string, despues: string) {
  const { data: personas } = await supabase.from("empleados").select("id, datos").eq("empresa_id", eventoId).limit(10000);
  const buscada = normalizar(antes);
  for (const p of personas ?? []) {
    const datos = (p.datos && typeof p.datos === "object" && !Array.isArray(p.datos) ? p.datos : {}) as Record<string, unknown>;
    if (typeof datos.categoria === "string" && normalizar(datos.categoria) === buscada) {
      await supabase.from("empleados").update({ datos: { ...datos, categoria: despues } }).eq("id", p.id);
    }
  }
  const { data: reglas } = await supabase.from("reglas_diseno").select("id, valor, diseno_id").eq("empresa_id", eventoId).eq("campo", "categoria");
  for (const r of reglas ?? []) {
    if (normalizar(r.valor) !== buscada) continue;
    await supabase.from("reglas_diseno").update({ valor: despues }).eq("id", r.id);
    await supabase.from("disenos").update({ nombre: despues.slice(0, 80) }).eq("id", r.diseno_id).eq("nombre", r.valor);
  }
}

/** Cuántas personas hay por categoría y cuántas traen una categoría que no existe. */
export async function conteoPorCategoria(supabase: Cliente, eventoId: string, categorias: Categoria[]) {
  const { data } = await supabase.from("empleados").select("datos").eq("empresa_id", eventoId).eq("estatus", "activo").limit(10000);
  const cuenta = new Map(categorias.map((c) => [normalizar(c.nombre), 0]));
  let sinCategoria = 0;
  for (const p of data ?? []) {
    const valor = (p.datos as Record<string, unknown> | null)?.categoria;
    const clave = typeof valor === "string" ? normalizar(valor) : "";
    if (cuenta.has(clave)) cuenta.set(clave, (cuenta.get(clave) ?? 0) + 1);
    else sinCategoria++;
  }
  return { porCategoria: categorias.map((c) => ({ ...c, personas: cuenta.get(normalizar(c.nombre)) ?? 0 })), sinCategoria, total: data?.length ?? 0 };
}

/**
 * Borra los datos personales de los asistentes de un evento: primero sus
 * fotografías del almacenamiento y después nombres y datos en la base. Usa la
 * llave secreta.
 */
export async function borrarDatosDeEvento(servicio: Cliente, eventoId: string): Promise<number> {
  for (;;) {
    const { data: archivos } = await servicio.storage.from("fotos").list(eventoId, { limit: 1000 });
    const rutas = (archivos ?? []).filter((a) => a.id).map((a) => `${eventoId}/${a.name}`);
    if (!rutas.length) break;
    const { error } = await servicio.storage.from("fotos").remove(rutas);
    if (error) throw new Error(`No se pudieron borrar las fotos del evento ${eventoId}: ${error.message}`);
  }
  const { data, error } = await servicio.rpc("borrar_datos_evento", { p_evento: eventoId });
  if (error) throw new Error(`No se pudieron borrar los datos del evento ${eventoId}: ${error.message}`);
  return data ?? 0;
}

/**
 * Borra los datos de los eventos que terminaron hace más de
 * `diasParaBorrarDatos` días. Lo llama el cron semanal.
 */
export async function vencerEventos(servicio: Cliente): Promise<{ eventos: number; personas: number; errores: string[] }> {
  const corte = sumarDias(hoyIso(), -diasParaBorrarDatos);
  const { data: eventos } = await servicio
    .from("empresas")
    .select("id")
    .eq("tipo", "evento")
    .is("datos_borrados_en", null)
    .lt("evento_fin", corte)
    .limit(200);
  let personas = 0;
  const errores: string[] = [];
  for (const e of eventos ?? []) {
    try {
      personas += await borrarDatosDeEvento(servicio, e.id);
    } catch (falla) {
      errores.push(falla instanceof Error ? falla.message : String(falla));
    }
  }
  return { eventos: (eventos?.length ?? 0) - errores.length, personas, errores };
}
