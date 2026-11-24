import { clienteServicio } from "@/lib/supabase/publico";
import { FORMATO_LIGA, camposDeLiga } from "./ligas";

/**
 * Todo lo que la página pública de una liga necesita saber de su persona.
 * Se lee con la llave secreta: quien abre la liga no tiene cuenta. Devuelve
 * null si la liga no existe o la persona está de baja.
 */
export async function personaDeLiga(liga: string) {
  if (!FORMATO_LIGA.test(liga)) return null;
  const servicio = clienteServicio();
  if (!servicio) return null;
  const { data: persona } = await servicio
    .from("empleados")
    .select("id, empresa_id, codigo, nombre, numero_empleado, puesto, departamento, tipo_contrato, datos, foto_path, estatus")
    .eq("liga", liga)
    .maybeSingle();
  if (!persona || persona.estatus === "baja") return null;

  const [{ data: empresa }, { data: campos }, { data: propuesta }] = await Promise.all([
    servicio.from("empresas").select("id, nombre, liga_campos, liga_foto").eq("id", persona.empresa_id).maybeSingle(),
    servicio.from("campos").select("clave, etiqueta, tipo, obligatorio").eq("empresa_id", persona.empresa_id).order("orden").order("creado_en"),
    servicio.from("propuestas").select("datos, foto_path, estado, motivo, enviado_en").eq("empleado_id", persona.id).maybeSingle(),
  ]);
  if (!empresa) return null;
  return { servicio, persona, empresa, campos: camposDeLiga(campos ?? [], empresa.liga_campos), propuesta };
}
