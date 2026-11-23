"use server";

import { revalidatePath } from "next/cache";
import { type Correo, correoActivo, enviarCorreos } from "@/lib/correo";
import { constanciaDe, puedePedir } from "@/lib/cuenta/constancia";
import { correoLiga } from "@/lib/cuenta/correo-liga";
import { CORREOS_POR_ENVIO, camposPedibles, datosPropuestos, urlDeLiga } from "@/lib/cuenta/ligas";
import { faltanPorCorreo, personasConLiga } from "@/lib/cuenta/ligas-equipo";
import { requerirEmpresa } from "@/lib/cuenta/sesion";
import { esColumnaSistema, type Resultado } from "@/lib/cuenta/tipos";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ERROR_GENERAL = "No pudimos guardar. Intenta de nuevo.";
const refrescar = () => revalidatePath("/cuenta", "layout");
const plural = (n: number, uno: string, varios: string) => `${n.toLocaleString("es-MX")} ${n === 1 ? uno : varios}`;

/** Qué se le pide a cada persona en su liga: campos y fotografía. */
export async function guardarAjusteLiga(_: Resultado, d: FormData): Promise<Resultado> {
  const { supabase, empresa, administra } = await requerirEmpresa();
  if (!administra) return { error: "Solo quien administra la empresa puede cambiar qué se pide." };
  const { data: campos } = await supabase.from("campos").select("clave, etiqueta, tipo").eq("empresa_id", empresa.id);
  const elegidos = camposPedibles(campos ?? []).map((c) => c.clave).filter((clave) => d.get(`pedir_${clave}`) === "on");
  const foto = d.get("pedir_foto") === "on";
  if (!elegidos.length && !foto) return { error: "Elige al menos una cosa que pedir." };
  const { data, error } = await supabase
    .from("empresas")
    .update({ liga_campos: elegidos, liga_foto: foto })
    .eq("id", empresa.id)
    .select("id");
  if (error || !data.length) return { error: ERROR_GENERAL };
  refrescar();
  return { ok: "Guardado." };
}

/** Anota que la liga de una persona ya se le mandó (al copiarla o abrir WhatsApp). */
export async function marcarLigaEnviada(id: string): Promise<void> {
  if (!UUID.test(id)) return;
  const { supabase, empresa } = await requerirEmpresa();
  await supabase.from("empleados").update({ liga_enviada_en: new Date().toISOString() }).eq("id", id).eq("empresa_id", empresa.id);
  refrescar();
}

/** Cambia la liga de una persona por una nueva: la anterior deja de funcionar. */
export async function renovarLiga(d: FormData): Promise<void> {
  const id = String(d.get("id") ?? "");
  if (!UUID.test(id)) return;
  const { supabase, empresa } = await requerirEmpresa();
  // Cualquier valor distinto hace que la base de datos genere una liga nueva.
  await supabase.from("empleados").update({ liga: "renovar", liga_enviada_en: null }).eq("id", id).eq("empresa_id", empresa.id);
  refrescar();
}

type Destino = { id: string; nombre: string; correo: string | null; liga: string };

/** Manda la liga por correo a las personas indicadas y anota a quién sí le salió. */
async function mandar(destinos: Destino[]): Promise<Resultado & { enviados?: number }> {
  const { supabase, empresa, usuario } = await requerirEmpresa();
  if (!correoActivo()) return { error: "El envío por correo todavía no está activo. Mientras, copia la liga o mándala por WhatsApp." };
  if (!puedePedir(await constanciaDe(supabase, empresa.id))) {
    return { error: "Para mandar correos desde la plataforma necesitas tu constancia aprobada. Mientras, copia la liga o mándala por WhatsApp." };
  }
  const conCorreo = destinos.filter((p): p is Destino & { correo: string } => Boolean(p.correo)).slice(0, CORREOS_POR_ENVIO);
  if (!conCorreo.length) return { error: "No hay a quién mandarle: falta su correo." };

  const [{ data: ajuste }, { data: rechazadas }] = await Promise.all([
    supabase.from("empresas").select("liga_campos, liga_foto").eq("id", empresa.id).maybeSingle(),
    supabase.from("propuestas").select("empleado_id, motivo").eq("empresa_id", empresa.id).eq("estado", "rechazada").limit(5000),
  ]);
  const motivoDe = new Map((rechazadas ?? []).map((r) => [r.empleado_id, r.motivo || "Revisa tus datos y tu foto."]));
  const conDatos = Boolean(ajuste?.liga_campos.length);
  const conFoto = ajuste?.liga_foto ?? true;

  const correos: Correo[] = conCorreo.map((p) => ({
    para: p.correo,
    responderA: usuario.email ?? undefined,
    ...correoLiga({ nombre: p.nombre, empresa: empresa.nombre, liga: urlDeLiga(p.liga), conDatos, conFoto, correccion: motivoDe.get(p.id) }),
  }));
  const { enviados, error } = await enviarCorreos(correos);

  const ahora = new Date().toISOString();
  const ids = conCorreo.slice(0, enviados).map((p) => p.id);
  for (let i = 0; i < ids.length; i += 200) {
    await supabase.from("empleados").update({ liga_enviada_en: ahora }).in("id", ids.slice(i, i + 200)).eq("empresa_id", empresa.id);
  }
  refrescar();
  if (error) {
    console.error("Ligas por correo:", error);
    const faltan = conCorreo.length - enviados;
    return {
      enviados,
      error: enviados
        ? `Salieron ${plural(enviados, "correo", "correos")} y ${plural(faltan, "quedó pendiente", "quedaron pendientes")}. Vuelve a intentar más tarde: puede ser el límite diario de envíos.`
        : "No pudimos mandar los correos. Vuelve a intentar más tarde: puede ser el límite diario de envíos.",
    };
  }
  return { enviados, ok: enviados === 1 ? "Correo enviado." : `Se enviaron ${plural(enviados, "correo", "correos")}.` };
}

/** Manda (o vuelve a mandar) su liga por correo a una persona. */
export async function enviarLigaPorCorreo(id: string): Promise<Resultado> {
  if (!UUID.test(id)) return { error: ERROR_GENERAL };
  const { supabase, empresa } = await requerirEmpresa();
  const { data } = await supabase
    .from("empleados")
    .select("id, nombre, correo, liga, estatus")
    .eq("id", id)
    .eq("empresa_id", empresa.id)
    .maybeSingle();
  if (!data || data.estatus === "baja") return { error: "Esta persona está de baja." };
  return mandar([data]);
}

/** Manda su liga por correo a todas las personas que tienen correo y a quienes no se les ha mandado. */
export async function enviarLigasPorCorreo(): Promise<Resultado> {
  const { supabase, empresa } = await requerirEmpresa();
  const faltan = faltanPorCorreo(await personasConLiga(supabase, empresa.id));
  if (!faltan.length) return { error: "Ya se le mandó su liga a todas las personas que tienen correo." };
  const resultado = await mandar(faltan);
  const restan = faltan.length - (resultado.enviados ?? 0);
  if (resultado.ok && restan > 0) {
    return { ok: `${resultado.ok} Faltan ${plural(restan, "persona", "personas")}: vuelve a oprimir el botón para seguir.` };
  }
  return resultado;
}

// --- Aprobar o rechazar lo que mandó cada persona ---------------------------

/** Pasa a la ficha de la persona lo que propuso desde su liga. */
async function aprobar(id: string): Promise<string | null> {
  const { supabase, empresa } = await requerirEmpresa();
  const [{ data: propuesta }, { data: campos }] = await Promise.all([
    supabase.from("propuestas").select("*").eq("empleado_id", id).eq("empresa_id", empresa.id).eq("estado", "pendiente").maybeSingle(),
    supabase.from("campos").select("clave, etiqueta, tipo").eq("empresa_id", empresa.id),
  ]);
  if (!propuesta) return "Esa propuesta ya se resolvió.";
  const { data: persona } = await supabase.from("empleados").select("datos").eq("id", id).eq("empresa_id", empresa.id).maybeSingle();
  if (!persona) return "Esa persona ya no está en tu equipo.";

  const propuestos = datosPropuestos(propuesta.datos);
  const columnas: Record<string, string | null> = {};
  const datos = { ...datosPropuestos(persona.datos) };
  for (const campo of camposPedibles(campos ?? [])) {
    if (!(campo.clave in propuestos)) continue;
    const valor = propuestos[campo.clave].trim();
    if (campo.clave === "nombre") {
      if (valor) columnas.nombre = valor.slice(0, 160);
    } else if (esColumnaSistema(campo.clave)) columnas[campo.clave] = valor || null;
    else if (valor) datos[campo.clave] = valor;
    else delete datos[campo.clave];
  }

  const cambios: Record<string, unknown> = { ...columnas, datos };
  if (propuesta.foto_path) {
    // La foto pasa de la carpeta de pendientes a su lugar de siempre.
    const destino = `${empresa.id}/${id}.jpg`;
    const { data: archivo } = await supabase.storage.from("fotos").download(propuesta.foto_path);
    if (!archivo) return "No pudimos leer la foto que mandó. Pídele que la suba de nuevo.";
    const { error } = await supabase.storage.from("fotos").upload(destino, archivo, { contentType: "image/jpeg", upsert: true });
    if (error) return ERROR_GENERAL;
    cambios.foto_path = destino;
  }
  const { error } = await supabase.from("empleados").update(cambios as never).eq("id", id).eq("empresa_id", empresa.id);
  if (error) return error.code === "23505" ? "Ya hay otra persona con ese número de empleado. Corrígelo en su ficha o pide una corrección." : ERROR_GENERAL;

  if (propuesta.foto_path) await supabase.storage.from("fotos").remove([propuesta.foto_path]);
  await supabase
    .from("propuestas")
    .update({ estado: "aprobada", foto_path: null, motivo: null, resuelto_en: new Date().toISOString() })
    .eq("empleado_id", id);
  return null;
}

export async function aprobarPropuesta(_: Resultado, d: FormData): Promise<Resultado> {
  const id = String(d.get("id") ?? "");
  if (!UUID.test(id)) return { error: ERROR_GENERAL };
  const error = await aprobar(id);
  refrescar();
  return error ? { error } : { ok: "Aprobada." };
}

/** Aprueba de un jalón todo lo que está por aprobar (hasta 200 a la vez). */
export async function aprobarTodas(): Promise<Resultado> {
  const { supabase, empresa } = await requerirEmpresa();
  const { data } = await supabase
    .from("propuestas")
    .select("empleado_id")
    .eq("empresa_id", empresa.id)
    .eq("estado", "pendiente")
    .order("enviado_en")
    .limit(200);
  let aprobadas = 0;
  let fallas = 0;
  for (const p of data ?? []) {
    if (await aprobar(p.empleado_id)) fallas += 1;
    else aprobadas += 1;
  }
  refrescar();
  if (fallas) return { error: `Se aprobaron ${aprobadas} y ${fallas} no se pudieron: revísalas una por una.` };
  return { ok: aprobadas === 1 ? "Se aprobó 1 persona." : `Se aprobaron ${aprobadas} personas.` };
}

/** Rechaza lo que mandó una persona y le deja dicho qué corregir: lo ve al abrir su liga. */
export async function rechazarPropuesta(_: Resultado, d: FormData): Promise<Resultado> {
  const id = String(d.get("id") ?? "");
  if (!UUID.test(id)) return { error: ERROR_GENERAL };
  const motivo = String(d.get("motivo") ?? "").trim().slice(0, 300);
  if (!motivo) return { error: "Escribe qué tiene que corregir." };
  const { supabase, empresa } = await requerirEmpresa();
  const { data: propuesta } = await supabase
    .from("propuestas")
    .select("foto_path")
    .eq("empleado_id", id)
    .eq("empresa_id", empresa.id)
    .eq("estado", "pendiente")
    .maybeSingle();
  if (!propuesta) return { error: "Esa propuesta ya se resolvió." };
  if (propuesta.foto_path) await supabase.storage.from("fotos").remove([propuesta.foto_path]);
  const { error } = await supabase
    .from("propuestas")
    .update({ estado: "rechazada", motivo, foto_path: null, resuelto_en: new Date().toISOString() })
    .eq("empleado_id", id);
  if (error) return { error: ERROR_GENERAL };
  refrescar();
  return { ok: "Le pediste una corrección." };
}
