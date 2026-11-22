import type { SupabaseClient } from "@supabase/supabase-js";
import { camposDe } from "@/lib/cuenta/consultas";
import { type AjusteQr, contenidoQr } from "@/lib/cuenta/qr";
import { datosDePersona, disenoDeFila, faltantes } from "@/lib/diseno/datos";
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
  tipo: "diseno" | "listos";
  nombre: string;
  /** Solo con un diseño. */
  fila?: FilaDiseno;
  diseno?: Diseno;
  /** Por persona: lo que le falta a su gafete y la copia que se guardaría en el pedido. */
  gafetes: Map<string, { faltan: string[]; copia: GafeteCopiado }>;
};

export async function prepararPedido(
  supabase: SupabaseClient<Database>,
  empresa: { id: string } & AjusteQr,
): Promise<{ personas: PersonaDePedido[]; fuentes: FuenteDePedido[]; etiquetas: Record<string, string> }> {
  const [campos, { data: disenos }, { data: equipo }, { data: listos }] = await Promise.all([
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

/** ¿El pedido va impreso por frente y vuelta? Con un diseño, si tiene vuelta; con gafetes listos, si alguno la trae. */
export function llevaVuelta(fuente: FuenteDePedido, personas: string[]): boolean {
  if (fuente.tipo === "diseno") return Boolean(fuente.diseno?.vuelta);
  return personas.some((id) => Boolean(fuente.gafetes.get(id)?.copia.vuelta));
}
