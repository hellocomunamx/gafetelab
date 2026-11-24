import { clientePublico, clienteServicio } from "@/lib/supabase/publico";

export type Verificacion = {
  estado: "vigente" | "expirado" | "baja" | "pendiente";
  empresa?: string;
  nombre?: string;
  puesto?: string;
  numero_empleado?: string;
  departamento?: string;
  /** AAAA-MM-DD, si la empresa usa un campo de fecha como vigencia. */
  vigente_hasta?: string;
  con_foto?: boolean;
  /** Si el gafete es de un evento: su nombre, fechas (AAAA-MM-DD) y sede. */
  evento?: { nombre: string; inicio: string; fin: string; sede: string | null };
  /** En un evento, la categoría de la persona con su color. */
  categoria?: { nombre: string; color: string };
  /** Campos elegidos por la empresa, en su orden y con su nombre actual. */
  datos?: { clave: string; etiqueta: string; tipo: string; valor: string }[];
};

const CODIGO = /^[A-Za-z0-9_-]{12}$/;

/** Consulta pública de un gafete por su código. Devuelve null si no existe o no se puede verificar. */
export async function verificarGafete(codigo: string): Promise<Verificacion | null> {
  if (!CODIGO.test(codigo)) return null;
  const supabase = clientePublico();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("verificar_gafete", { p_codigo: codigo });
  if (error || !data || typeof data !== "object" || Array.isArray(data)) return null;
  return data as Verificacion;
}

/**
 * Liga temporal (5 minutos) a la fotografía de un gafete verificado. Solo se
 * llama cuando la verificación dijo `con_foto`, es decir, cuando la empresa
 * eligió mostrarla. Necesita la llave secreta; sin ella no hay fotografía.
 */
export async function fotoVerificada(codigo: string): Promise<string | null> {
  const servicio = clienteServicio();
  if (!servicio || !CODIGO.test(codigo)) return null;
  const { data: persona } = await servicio.from("empleados").select("foto_path").eq("codigo", codigo).maybeSingle();
  if (!persona?.foto_path) return null;
  const { data } = await servicio.storage.from("fotos").createSignedUrl(persona.foto_path, 300);
  return data?.signedUrl ?? null;
}
