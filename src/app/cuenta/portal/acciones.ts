"use server";

import { revalidatePath } from "next/cache";
import { requerirEmpresa } from "@/lib/cuenta/sesion";
import type { Resultado } from "@/lib/cuenta/tipos";
import { digitosAleatorios, hashNip } from "@/lib/portal/cripto";
import { FORMATO_ID_ACCESO, limpiarIdAcceso, nipDebil, RUTA_PORTAL_EMPRESA, validarHandle } from "@/lib/portal/reglas";
import { clienteServicio } from "@/lib/supabase/publico";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ERROR_GENERAL = "No pudimos guardar. Intenta de nuevo.";
const SOLO_ADMIN = "Solo quien administra la empresa puede cambiar esto.";

/** Un NIP inicial al azar que no sea fácil de adivinar. */
function nipInicial(idAcceso: string): string {
  for (;;) {
    const nip = digitosAleatorios(6);
    if (!nipDebil(nip, idAcceso)) return nip;
  }
}

/** Dirección del portal (handle) y si está encendido. */
export async function guardarPortal(_: Resultado, d: FormData): Promise<Resultado> {
  const { supabase, empresa, administra } = await requerirEmpresa();
  if (!administra) return { error: SOLO_ADMIN };
  const validado = validarHandle(String(d.get("handle") ?? ""));
  if ("error" in validado) return validado;
  const activo = d.get("activo") === "si";
  const { data, error } = await supabase
    .from("empresas")
    .update({ handle: validado.handle, portal_activo: activo })
    .eq("id", empresa.id)
    .select("id");
  if (error?.code === "23505") return { error: "Otra empresa ya usa esa dirección. Elige otra." };
  if (error || !data?.length) return { error: ERROR_GENERAL };
  revalidatePath(RUTA_PORTAL_EMPRESA);
  return { ok: activo ? "Guardado. El portal está abierto." : "Guardado. El portal está cerrado: nadie puede entrar." };
}

export type ResultadoNips = Resultado & { lista?: { nombre: string; idAcceso: string; nip: string }[] };

async function prepararAccesos(empresaId: string, personas: { id: string; nombre: string; idAcceso: string }[]) {
  const servicio = clienteServicio();
  if (!servicio) return { error: ERROR_GENERAL } as ResultadoNips;
  const lista: NonNullable<ResultadoNips["lista"]> = [];
  for (const p of personas) {
    const nip = nipInicial(p.idAcceso);
    const { error } = await servicio.from("accesos_empleado").upsert(
      {
        empleado_id: p.id,
        empresa_id: empresaId,
        id_acceso: p.idAcceso,
        nip_hash: await hashNip(nip),
        nip_temporal: true,
        intentos: 0,
        bloqueado_hasta: null,
        actualizado_en: new Date().toISOString(),
      },
      { onConflict: "empleado_id" },
    );
    if (error?.code === "23505") return { error: `El ID de acceso «${p.idAcceso}» ya lo tiene otra persona.`, lista } as ResultadoNips;
    if (error) return { error: ERROR_GENERAL, lista } as ResultadoNips;
    // Un NIP nuevo cierra las sesiones abiertas de esa persona.
    await servicio.from("sesiones_empleado").delete().eq("empleado_id", p.id);
    lista.push({ nombre: p.nombre, idAcceso: p.idAcceso, nip });
  }
  return { lista } as ResultadoNips;
}

/**
 * Da (o restablece) el NIP inicial de una persona. También desbloquea su
 * acceso y cierra sus sesiones. El NIP se muestra una sola vez.
 */
export async function darNip(_: ResultadoNips, d: FormData): Promise<ResultadoNips> {
  const { supabase, empresa, administra } = await requerirEmpresa();
  if (!administra) return { error: SOLO_ADMIN };
  const id = String(d.get("empleado") ?? "");
  if (!UUID.test(id)) return { error: ERROR_GENERAL };
  const { data: persona } = await supabase
    .from("empleados")
    .select("id, nombre, numero_empleado, estatus")
    .eq("id", id)
    .eq("empresa_id", empresa.id)
    .maybeSingle();
  if (!persona || persona.estatus === "baja") return { error: "Esa persona ya no está en tu equipo." };
  const idAcceso = limpiarIdAcceso(d.get("id_acceso")) || limpiarIdAcceso(persona.numero_empleado);
  if (!idAcceso) return { error: "Escribe un ID de acceso: su número de empleado o algo que solo ella o él sepa." };
  if (!FORMATO_ID_ACCESO.test(idAcceso)) return { error: "El ID de acceso lleva solo letras, números, punto, guion o guion bajo." };
  const resultado = await prepararAccesos(empresa.id, [{ id: persona.id, nombre: persona.nombre, idAcceso }]);
  revalidatePath(RUTA_PORTAL_EMPRESA);
  return resultado.error ? resultado : { ...resultado, ok: "Listo. Dale estos datos en persona: el NIP no se vuelve a mostrar." };
}

/** NIP inicial para todas las personas activas sin correo y sin acceso, con su número de empleado como ID. */
export async function darNipsATodos(): Promise<ResultadoNips> {
  const { supabase, empresa, administra } = await requerirEmpresa();
  if (!administra) return { error: SOLO_ADMIN };
  const [{ data: personas }, { data: accesos }] = await Promise.all([
    supabase.from("empleados").select("id, nombre, numero_empleado, correo").eq("empresa_id", empresa.id).eq("estatus", "activo").is("correo", null).order("nombre").limit(1000),
    supabase.from("accesos_empleado").select("empleado_id").eq("empresa_id", empresa.id),
  ]);
  const conAcceso = new Set((accesos ?? []).map((a) => a.empleado_id));
  const sinAcceso = (personas ?? [])
    .filter((p) => !conAcceso.has(p.id))
    .map((p) => ({ id: p.id, nombre: p.nombre, idAcceso: limpiarIdAcceso(p.numero_empleado) }));
  const conNumero = sinAcceso.filter((p) => FORMATO_ID_ACCESO.test(p.idAcceso));
  const sinNumero = sinAcceso.length - conNumero.length;
  if (!conNumero.length) {
    return { error: sinNumero ? "A quienes les falta acceso tampoco tienen número de empleado: dales su NIP uno por uno." : "Todas las personas sin correo ya tienen su NIP." };
  }
  const resultado = await prepararAccesos(empresa.id, conNumero);
  revalidatePath(RUTA_PORTAL_EMPRESA);
  if (resultado.error) return resultado;
  return {
    ...resultado,
    ok: `Listo: ${conNumero.length} NIP nuevos.${sinNumero ? ` ${sinNumero} sin número de empleado: dales su NIP uno por uno.` : ""} Imprime o guarda esta lista ahora: no se vuelve a mostrar.`,
  };
}

/** Quita el acceso con NIP (por ejemplo, ya tiene correo registrado). */
export async function quitarNip(d: FormData): Promise<void> {
  const { supabase, empresa, administra } = await requerirEmpresa();
  const id = String(d.get("empleado") ?? "");
  if (!administra || !UUID.test(id)) return;
  const { data: persona } = await supabase.from("empleados").select("id").eq("id", id).eq("empresa_id", empresa.id).maybeSingle();
  const servicio = clienteServicio();
  if (!persona || !servicio) return;
  await servicio.from("accesos_empleado").delete().eq("empleado_id", persona.id);
  await servicio.from("sesiones_empleado").delete().eq("empleado_id", persona.id).eq("metodo", "nip");
  revalidatePath(RUTA_PORTAL_EMPRESA);
}
