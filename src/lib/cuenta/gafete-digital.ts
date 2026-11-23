import type { SupabaseClient } from "@supabase/supabase-js";
import { ligasDe } from "@/lib/cuenta/fotos";
import { type AjusteQr, COLUMNAS_QR, contenidoQr } from "@/lib/cuenta/qr";
import { datosDePersona, disenoDeFila } from "@/lib/diseno/datos";
import { rutasDe } from "@/lib/diseno/limpiar";
import type { Diseno } from "@/lib/diseno/tipos";
import type { GafeteCopiado } from "@/lib/pedidos/reglas";
import type { Database } from "@/lib/supabase/tipos";

/**
 * El gafete digital de una persona, listo para dibujarse en su celular. Se
 * dibuja con el diseño que la empresa aprobó en el pedido y con los datos y
 * la foto vigentes de la persona: si la empresa aprueba un cambio, el gafete
 * digital se actualiza solo. Con gafetes que la empresa subió ya terminados,
 * se muestra la imagen tal cual.
 *
 * Se lee con la llave secreta (quien abre su liga no tiene cuenta). Devuelve
 * null si la persona no tiene un gafete digital activo.
 */

export type GafeteDigital = {
  empresa: string;
  nombre: string;
  /** Lo que lleva su código QR; "" si no hay nada que codificar. */
  qr: string;
  /** ¿El QR lleva a la página de verificación de LaGafetería? */
  verificable: boolean;
  activoDesde: string;
} & (
  | {
      tipo: "diseno";
      diseno: Diseno;
      datos: Record<string, string>;
      etiquetas: Record<string, string>;
      foto: string | null;
      imagenes: Record<string, string>;
    }
  | { tipo: "listos"; frente: string; vuelta: string | null }
);

type Persona = Pick<
  Database["public"]["Tables"]["empleados"]["Row"],
  | "id"
  | "empresa_id"
  | "codigo"
  | "nombre"
  | "numero_empleado"
  | "puesto"
  | "departamento"
  | "tipo_contrato"
  | "datos"
  | "foto_path"
  | "estatus"
>;

export async function gafeteDigitalDe(servicio: SupabaseClient<Database>, persona: Persona): Promise<GafeteDigital | null> {
  if (persona.estatus !== "activo") return null;
  const { data: gafete } = await servicio
    .from("gafetes")
    .select("id, pedido_id, datos, emitido_en")
    .eq("empleado_id", persona.id)
    .eq("tipo", "digital")
    .eq("estado", "activo")
    .order("emitido_en", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!gafete?.pedido_id) return null;

  const [{ data: pedido }, { data: empresa }, { data: campos }] = await Promise.all([
    servicio.from("pedidos").select("fuente, diseno_id, diseno").eq("id", gafete.pedido_id).maybeSingle(),
    servicio.from("empresas").select(`nombre, ${COLUMNAS_QR}`).eq("id", persona.empresa_id).maybeSingle(),
    servicio.from("campos").select("clave, etiqueta, tipo").eq("empresa_id", persona.empresa_id),
  ]);
  if (!pedido || !empresa) return null;
  const ajuste = empresa as unknown as AjusteQr & { nombre: string };
  const datos = datosDePersona(persona, campos ?? []);
  const base = {
    empresa: ajuste.nombre,
    nombre: persona.nombre,
    qr: contenidoQr(ajuste, { codigo: persona.codigo, valores: datos }),
    verificable: ajuste.qr_modo === "verificacion",
    activoDesde: gafete.emitido_en,
  };

  if (pedido.fuente === "listos") {
    const copia = gafete.datos as unknown as GafeteCopiado;
    const ligas = await ligasDe(servicio, "gafetes", [copia.frente?.ruta, copia.vuelta?.ruta]);
    const frente = copia.frente ? ligas.get(copia.frente.ruta) : undefined;
    if (!frente) return null;
    return {
      ...base,
      tipo: "listos",
      frente,
      vuelta: (copia.vuelta && ligas.get(copia.vuelta.ruta)) || null,
    };
  }

  const copiaDiseno = pedido.diseno as {
    nombre?: string;
    orientacion?: string;
    frente?: unknown;
    vuelta?: unknown;
  } | null;
  if (!copiaDiseno) return null;
  const diseno = disenoDeFila({
    id: pedido.diseno_id ?? "",
    nombre: copiaDiseno.nombre ?? "",
    orientacion: copiaDiseno.orientacion ?? "horizontal",
    frente: copiaDiseno.frente,
    vuelta: copiaDiseno.vuelta,
  });
  const [imagenes, fotos] = await Promise.all([
    ligasDe(servicio, "disenos", [...rutasDe(diseno.frente), ...rutasDe(diseno.vuelta)]),
    ligasDe(servicio, "fotos", [persona.foto_path]),
  ]);
  return {
    ...base,
    tipo: "diseno",
    diseno,
    datos,
    etiquetas: Object.fromEntries((campos ?? []).map((c) => [c.clave, c.etiqueta])),
    foto: (persona.foto_path && fotos.get(persona.foto_path)) || null,
    imagenes: Object.fromEntries(imagenes),
  };
}
