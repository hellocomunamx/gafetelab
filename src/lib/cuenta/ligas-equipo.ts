import type { SupabaseClient } from "@supabase/supabase-js";
import { todas } from "@/lib/admin/paginas";
import type { Database } from "@/lib/supabase/tipos";
import { type EstadoLiga, estadoDeLiga } from "./ligas";

export type PersonaConLiga = {
  id: string;
  nombre: string;
  numero_empleado: string | null;
  correo: string | null;
  liga: string;
  liga_enviada_en: string | null;
  estado: EstadoLiga;
  motivo: string | null;
  /** Cuándo mandó sus datos, si ya los mandó. */
  respondio: string | null;
};

/** Todas las personas que no están de baja, con el estado de su liga. */
export async function personasConLiga(supabase: SupabaseClient<Database>, empresaId: string): Promise<PersonaConLiga[]> {
  const [personas, propuestas] = await Promise.all([
    todas((desde, hasta) =>
      supabase
        .from("empleados")
        .select("id, nombre, numero_empleado, correo, liga, liga_enviada_en")
        .eq("empresa_id", empresaId)
        .neq("estatus", "baja")
        .order("nombre")
        .order("id")
        .range(desde, hasta),
    ),
    todas((desde, hasta) =>
      supabase
        .from("propuestas")
        .select("empleado_id, estado, motivo, enviado_en")
        .eq("empresa_id", empresaId)
        .order("empleado_id")
        .range(desde, hasta),
    ),
  ]);
  const propuestaDe = new Map(propuestas.map((p) => [p.empleado_id, p]));
  return personas.map((p) => {
    const propuesta = propuestaDe.get(p.id);
    return {
      ...p,
      estado: estadoDeLiga(p, propuesta),
      motivo: propuesta?.estado === "rechazada" ? propuesta.motivo : null,
      respondio: propuesta?.enviado_en ?? null,
    };
  });
}

/** A quiénes les llegaría el envío por correo a todos: tienen correo y no se les ha mandado su liga. */
export const faltanPorCorreo = (personas: PersonaConLiga[]) =>
  personas.filter((p) => p.correo && p.estado === "sin_enviar");
