import type { SupabaseClient } from "@supabase/supabase-js";
import { camposDe } from "@/lib/cuenta/consultas";
import { type AjusteQr, contenidoQr } from "@/lib/cuenta/qr";
import { datosDePersona, disenoDeFila, faltantes } from "@/lib/diseno/datos";
import { disenoPorReglas, type ReglaDiseno } from "@/lib/diseno/reglas";
import type { Diseno } from "@/lib/diseno/tipos";
import type { Database } from "@/lib/supabase/tipos";
import { type GafeteCopiado, pedidoMaximoPiezas } from "./reglas";

/**
 * Lo que una empresa puede pedir: de dónde salen sus gafetes (uno de sus
 * diseños o los gafetes que subió ya terminados) y, para cada persona activa,
 * si su gafete está completo. La página del pedido lo usa para mostrarlo y el
 * servidor para volver a comprobarlo antes de cobrar.
 */

export const FUENTE_LISTOS = "listos";
export const FUENTE_REGLAS = "reglas";

type FilaDiseno = Pick<Database["public"]["Tables"]["disenos"]["Row"], "id" | "nombre" | "orientacion" | "frente" | "vuelta">;

export type PersonaDePedido = {
  id: string;
  nombre: string;
  numero: string | null;
  puesto: string | null;
  departamento: string | null;
  foto: string | null;
};

export type FuenteDePedido = {
  id: string;
  tipo: "diseno" | "listos" | "reglas";
  nombre: string;
  /** Solo con un diseño. */
  fila?: FilaDiseno;
  diseno?: Diseno;
  /**
   * Por persona: lo que le falta a su gafete y la copia que se guardaría en el
   * pedido. Con reglas, también el diseño que le toca.
   */
  gafetes: Map<string, { faltan: string[]; copia: GafeteCopiado; disenoId?: string }>;
  /** Solo con reglas: los diseños que pueden tocar, por id. */
  disenos?: Map<string, { fila: FilaDiseno; diseno: Diseno }>;
};

export async function prepararPedido(
  supabase: SupabaseClient<Database>,
  empresa: { id: string } & AjusteQr,
): Promise<{ personas: PersonaDePedido[]; fuentes: FuenteDePedido[]; etiquetas: Record<string, string> }> {
  const [campos, { data: disenos }, { data: equipo }, { data: listos }, { data: reglas }] = await Promise.all([
    camposDe(supabase, empresa.id),
    supabase
      .from("disenos")
      .select("id, nombre, orientacion, frente, vuelta")
      .eq("empresa_id", empresa.id)
      .order("predeterminado", { ascending: false })
      .order("creado_en"),
    supabase
      .from("empleados")
      .select("id, codigo, nombre, numero_empleado, puesto, departamento, tipo_contrato, datos, foto_path")
      .eq("empresa_id", empresa.id)
      .eq("estatus", "activo")
      .order("nombre")
      .limit(pedidoMaximoPiezas),
    supabase.from("gafetes_listos").select("*").eq("empresa_id", empresa.id),
    supabase.from("reglas_diseno").select("id, campo, valor, diseno_id, orden").eq("empresa_id", empresa.id),
  ]);
  const activos = equipo ?? [];

  const fuentes: FuenteDePedido[] = (disenos ?? []).map((fila) => {
    const diseno = disenoDeFila(fila);
    const gafetes: FuenteDePedido["gafetes"] = new Map();
    for (const p of activos) {
      const valores = datosDePersona(p, campos);
      const qr = contenidoQr(empresa, { codigo: p.codigo, valores });
      gafetes.set(p.id, {
        faltan: faltantes(diseno, valores, Boolean(p.foto_path), campos, qr),
        copia: { nombre: p.nombre, numero: p.numero_empleado, valores, qr, foto: p.foto_path },
      });
    }
    return { id: fila.id, tipo: "diseno", nombre: fila.nombre, fila, diseno, gafetes };
  });

  // Con reglas, cada persona lleva el gafete del diseño que le toca. Va primero.
  if (reglas?.length && fuentes.length) {
    const porId = new Map(fuentes.map((f) => [f.id, f]));
    const validas = (reglas as ReglaDiseno[]).filter((r) => porId.has(r.diseno_id));
    if (validas.length) {
      const gafetes: FuenteDePedido["gafetes"] = new Map();
      const usados: NonNullable<FuenteDePedido["disenos"]> = new Map();
      for (const p of activos) {
        const valores = datosDePersona(p, campos);
        const id = disenoPorReglas(valores, validas, fuentes[0].id) ?? fuentes[0].id;
        const f = porId.get(id)!;
        const g = f.gafetes.get(p.id);
        if (!g) continue;
        gafetes.set(p.id, { ...g, disenoId: id });
        usados.set(id, { fila: f.fila!, diseno: f.diseno! });
      }
      fuentes.unshift({ id: FUENTE_REGLAS, tipo: "reglas", nombre: "Cada quien con su diseño", gafetes, disenos: usados });
    }
  }

  if (listos?.length) {
    const porPersona = new Map(listos.map((g) => [g.empleado_id, g]));
    const gafetes: FuenteDePedido["gafetes"] = new Map();
    const cara = (ruta: string | null, ancho: number | null, alto: number | null) => (ruta && ancho && alto ? { ruta, ancho, alto } : null);
    for (const p of activos) {
      const g = porPersona.get(p.id);
      if (!g) continue;
      const frente = cara(g.frente_path, g.frente_ancho, g.frente_alto);
      gafetes.set(p.id, {
        faltan: frente ? [] : ["El frente"],
        copia: { nombre: p.nombre, numero: p.numero_empleado, frente, vuelta: cara(g.vuelta_path, g.vuelta_ancho, g.vuelta_alto) },
      });
    }
    if (gafetes.size) fuentes.push({ id: FUENTE_LISTOS, tipo: "listos", nombre: "Mis gafetes listos", gafetes });
  }

  return {
    personas: activos.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      numero: p.numero_empleado,
      puesto: p.puesto,
      departamento: p.departamento,
      foto: p.foto_path,
    })),
    fuentes,
    etiquetas: Object.fromEntries(campos.map((c) => [c.clave, c.etiqueta])),
  };
}

/**
 * ¿Cuántos gafetes del pedido llevan vuelta? Con un diseño, todos o ninguno;
 * con reglas o con gafetes listos, los elegidos que la llevan. Solo a ellos
 * se les cobra la vuelta.
 */
export function cuantosConVuelta(fuente: FuenteDePedido, personas: string[]): number {
  if (fuente.tipo === "diseno") return fuente.diseno?.vuelta ? personas.length : 0;
  if (fuente.tipo === "reglas") {
    return personas.filter((id) => {
      const d = fuente.gafetes.get(id)?.disenoId;
      return Boolean(d && fuente.disenos?.get(d)?.diseno.vuelta);
    }).length;
  }
  return personas.filter((id) => Boolean(fuente.gafetes.get(id)?.copia.vuelta)).length;
}
