import type { SupabaseClient } from "@supabase/supabase-js";
import { type Correo, correoActivo, enviarCorreo, enviarCorreos } from "@/lib/correo";
import { urlAbsoluta } from "@/lib/site";
import type { Database } from "@/lib/supabase/tipos";
import { correoAvisoInmediato, correoResumenSemanal, type RenglonResumen } from "./correos";
import { RUTA_CAMBIOS_FOTO, RUTA_LIGAS, RUTA_SOLICITUDES, type TipoAviso } from "./tipos";

type Servicio = SupabaseClient<Database>;

/**
 * Manda el aviso al momento a quienes administran la empresa y eligieron
 * «Al momento» para ese tipo. Nunca detiene lo que la persona estaba haciendo:
 * si el correo falla, solo se anota en el registro.
 */
export async function avisarAlMomento(
  servicio: Servicio,
  opts: { empresaId: string; tipo: TipoAviso; persona: string; conImpreso?: boolean },
): Promise<void> {
  if (!correoActivo()) return;
  try {
    const { data } = await servicio.rpc("destinatarios_aviso", { p_empresa: opts.empresaId });
    const para = (data ?? []).filter((d) => d.tipo === opts.tipo && d.modo === "inmediato" && d.correo);
    if (!para.length) return;
    const url = urlAbsoluta(opts.tipo === "cambio_foto" ? RUTA_CAMBIOS_FOTO : RUTA_LIGAS);
    const correo = correoAvisoInmediato({ tipo: opts.tipo, empresa: para[0].empresa, persona: opts.persona, conImpreso: opts.conImpreso, url });
    await Promise.all(para.map((d) => enviarCorreo({ para: d.correo, ...correo })));
  } catch (falla) {
    console.error("Aviso al momento:", falla);
  }
}

/** Aviso al momento de una solicitud nueva del portal de empleados. */
export async function avisarSolicitud(servicio: Servicio, opts: { empresaId: string; persona: string; que: string }): Promise<void> {
  if (!correoActivo()) return;
  try {
    const { data } = await servicio.rpc("destinatarios_aviso", { p_empresa: opts.empresaId });
    const para = (data ?? []).filter((d) => d.tipo === "solicitudes" && d.modo === "inmediato" && d.correo);
    if (!para.length) return;
    const correo = correoAvisoInmediato({
      tipo: "solicitudes",
      empresa: para[0].empresa,
      persona: opts.persona,
      que: opts.que,
      url: urlAbsoluta(RUTA_SOLICITUDES),
    });
    await Promise.all(para.map((d) => enviarCorreo({ para: d.correo, ...correo })));
  } catch (falla) {
    console.error("Aviso de solicitud:", falla);
  }
}

/** Lunes de la semana de una fecha, en hora de Hermosillo (AAAA-MM-DD). Sirve de llave para no repetir el resumen. */
export function semanaDe(fecha: Date): string {
  const local = new Date(fecha.getTime() - 7 * 3600_000);
  const dia = (local.getUTCDay() + 6) % 7;
  local.setUTCDate(local.getUTCDate() - dia);
  return local.toISOString().slice(0, 10);
}

type Pendientes = { total: number; nombres: string[] };
const NOMBRES_POR_RENGLON = 5;

/** Cuántos pendientes tiene cada empresa, con los primeros nombres. */
async function pendientesPorEmpresa(servicio: Servicio, tabla: "solicitudes_foto" | "propuestas" | "solicitudes_empleado", empresas: string[]) {
  const resultado = new Map<string, Pendientes>();
  if (!empresas.length) return resultado;
  const fecha = tabla === "propuestas" ? "enviado_en" : "creado_en";
  const { data } = await servicio
    .from(tabla)
    .select(`empresa_id, ${fecha}, empleados(nombre)`)
    .in("empresa_id", empresas)
    .eq("estado", "pendiente")
    .order(fecha)
    .limit(5000);
  for (const fila of (data ?? []) as unknown as { empresa_id: string; empleados: { nombre: string } | null }[]) {
    const actual = resultado.get(fila.empresa_id) ?? { total: 0, nombres: [] };
    actual.total += 1;
    if (actual.nombres.length < NOMBRES_POR_RENGLON && fila.empleados?.nombre) actual.nombres.push(fila.empleados.nombre);
    resultado.set(fila.empresa_id, actual);
  }
  return resultado;
}

/**
 * El resumen semanal: a cada administrador que eligió «Resumen semanal» (es lo
 * que trae por omisión) le llega un solo correo con lo pendiente de todas las
 * empresas que administra. Si no hay nada pendiente, no le llega nada. Si el
 * cron se dispara dos veces en la misma semana, no se repite.
 */
export async function enviarResumenSemanal(servicio: Servicio, ahora = new Date()) {
  if (!correoActivo()) return { enviados: 0, error: "Falta RESEND_API_KEY" };
  const { data: filas, error } = await servicio.rpc("destinatarios_aviso", {});
  if (error) return { enviados: 0, error: error.message };
  const semanales = (filas ?? []).filter((f) => f.modo === "semanal" && f.correo);
  const empresas = [...new Set(semanales.map((f) => f.empresa_id))];
  const [fotos, datos, solicitudes] = await Promise.all([
    pendientesPorEmpresa(servicio, "solicitudes_foto", empresas),
    pendientesPorEmpresa(servicio, "propuestas", empresas),
    pendientesPorEmpresa(servicio, "solicitudes_empleado", empresas),
  ]);

  // Por persona: sus empresas y qué tipos quiere ver de cada una.
  const porUsuario = new Map<string, { correo: string; nombre: string | null; empresas: Map<string, RenglonResumen> }>();
  for (const f of semanales) {
    const pendientes = (f.tipo === "cambio_foto" ? fotos : f.tipo === "solicitudes" ? solicitudes : datos).get(f.empresa_id);
    if (!pendientes?.total) continue;
    const usuario = porUsuario.get(f.usuario_id) ?? { correo: f.correo, nombre: f.nombre, empresas: new Map() };
    const renglon = usuario.empresas.get(f.empresa_id) ?? { empresa: f.empresa };
    if (f.tipo === "cambio_foto") renglon.cambiosFoto = { ...pendientes, url: urlAbsoluta(RUTA_CAMBIOS_FOTO) };
    else if (f.tipo === "solicitudes") renglon.solicitudes = { ...pendientes, url: urlAbsoluta(RUTA_SOLICITUDES) };
    else renglon.datosLiga = { ...pendientes, url: urlAbsoluta(RUTA_LIGAS) };
    usuario.empresas.set(f.empresa_id, renglon);
    porUsuario.set(f.usuario_id, usuario);
  }

  const semana = semanaDe(ahora);
  const correos: Correo[] = [];
  const ids: string[] = [];
  for (const [usuarioId, u] of porUsuario) {
    // Se anota antes de mandar: si ya estaba anotado esta semana, no se repite.
    const { data: nueva } = await servicio
      .from("resumenes_enviados")
      .upsert({ usuario_id: usuarioId, semana }, { onConflict: "usuario_id,semana", ignoreDuplicates: true })
      .select("usuario_id");
    if (!nueva?.length) continue;
    ids.push(usuarioId);
    correos.push({ para: u.correo, ...correoResumenSemanal({ nombre: u.nombre, renglones: [...u.empresas.values()] }) });
  }
  const resultado = await enviarCorreos(correos);
  // Los que no alcanzaron a salir se quitan para que el siguiente intento los mande.
  const sinSalir = ids.slice(resultado.enviados);
  if (sinSalir.length) await servicio.from("resumenes_enviados").delete().eq("semana", semana).in("usuario_id", sinSalir);
  return resultado;
}
