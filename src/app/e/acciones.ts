"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { avisarSolicitud } from "@/lib/avisos/enviar";
import { registrarCambioFoto, retirarCambioFoto } from "@/lib/cuenta/cambio-foto-servidor";
import { camposPedibles, correoValido } from "@/lib/cuenta/ligas";
import { reposicionDe } from "@/lib/cuenta/reposicion";
import { esColumnaSistema, type Resultado } from "@/lib/cuenta/tipos";
import { correoActivo, enviarCorreo } from "@/lib/correo";
import { correoCodigoPortal } from "@/lib/portal/correos";
import { digitosAleatorios, FORMATO_TOKEN, hashNip, igualesSeguro, nipCorrecto, sha256, tokenAleatorio } from "@/lib/portal/cripto";
import {
  bloqueadoHastaQueLaEmpresa,
  bloqueoTras,
  FORMATO_CODIGO,
  FORMATO_HANDLE,
  FORMATO_NIP,
  INTENTOS_CODIGO,
  limpiarIdAcceso,
  MINUTOS_CODIGO,
  nipDebil,
  rutaPortal,
  urlPortal,
} from "@/lib/portal/reglas";
import { abrirSesion, cerrarSesion, type MetodoAcceso, requerirPortal, sesionPortal } from "@/lib/portal/sesion";
import { esCausa } from "@/lib/portal/solicitudes";
import { tipoReal } from "@/lib/seguridad/archivos";
import { dentroDelLimite, ipActual, MENSAJE_LIMITE } from "@/lib/seguridad/limites";
import { CAMPO_TURNSTILE, MENSAJE_TURNSTILE, verificarTurnstile } from "@/lib/seguridad/turnstile";
import { clienteServicio } from "@/lib/supabase/publico";

export type ResultadoAcceso = Resultado & { paso?: "codigo"; correo?: string };

const ERROR_GENERAL = "Algo salió mal. Intenta de nuevo en un momento.";
const NO_DISPONIBLE = "El portal de esta empresa no está disponible.";

const handleDe = (d: FormData) => {
  const h = String(d.get("empresa") ?? "").trim().toLowerCase();
  return FORMATO_HANDLE.test(h) ? h : null;
};

/** La empresa del portal, solo si lo tiene activo. */
async function empresaDeHandle(handle: string | null) {
  const servicio = clienteServicio();
  if (!servicio || !handle) return null;
  const { data } = await servicio.from("empresas").select("id, nombre, handle").eq("handle", handle).eq("portal_activo", true).maybeSingle();
  return data ? { servicio, empresa: data } : null;
}

/** Entrada general (/e): la persona escribe el ID de su empresa. */
export async function irAEmpresa(_: Resultado, d: FormData): Promise<Resultado> {
  if (!(await dentroDelLimite("LIMITE_ACCESO", `portal-ir:${await ipActual()}`))) return { error: MENSAJE_LIMITE };
  const handle = String(d.get("empresa") ?? "").trim().toLowerCase().replace(/^@/, "");
  const encontrada = FORMATO_HANDLE.test(handle) ? await empresaDeHandle(handle) : null;
  if (!encontrada) return { error: "No encontramos ese ID de empresa. Revísalo con tu empresa." };
  redirect(rutaPortal(handle));
}

// ---------------------------------------------------------------------------
// Con correo: código de 6 dígitos o liga de un solo uso
// ---------------------------------------------------------------------------

const hashCodigo = (empleadoId: string, codigo: string) => sha256(`${empleadoId}:${codigo}`);

/** Personas activas de la empresa con ese correo (casi siempre una). */
async function personasConCorreo(servicio: NonNullable<ReturnType<typeof clienteServicio>>, empresaId: string, correo: string) {
  const { data } = await servicio
    .from("empleados")
    .select("id, nombre, estatus")
    .eq("empresa_id", empresaId)
    .ilike("correo", correo.replace(/[%_\\]/g, "\\$&"))
    .neq("estatus", "baja")
    .order("creado_en", { ascending: false })
    .limit(5);
  return data ?? [];
}

/**
 * Manda el código y la liga al correo. Siempre responde lo mismo, exista o no
 * el correo, para no revelar quién trabaja en la empresa.
 */
export async function pedirCodigo(_: ResultadoAcceso, d: FormData): Promise<ResultadoAcceso> {
  const ip = await ipActual();
  if (!(await dentroDelLimite("LIMITE_ACCESO", `portal-correo:${ip}`))) return { error: MENSAJE_LIMITE };
  if (!(await verificarTurnstile(d.get(CAMPO_TURNSTILE), ip))) return { error: MENSAJE_TURNSTILE };
  const correo = correoValido(d.get("correo"));
  if (!correo) return { error: "Escribe tu correo completo." };
  if (!(await dentroDelLimite("LIMITE_ACCESO_CORREO", `portal:${correo}`))) return { error: MENSAJE_LIMITE };
  const encontrada = await empresaDeHandle(handleDe(d));
  if (!encontrada) return { error: NO_DISPONIBLE };
  const { servicio, empresa } = encontrada;
  const respuesta: ResultadoAcceso = { paso: "codigo", correo };

  const [persona] = await personasConCorreo(servicio, empresa.id, correo);
  if (!persona) return respuesta;
  if (!correoActivo()) return { error: ERROR_GENERAL };

  // Un código nuevo invalida los anteriores.
  await servicio.from("codigos_empleado").update({ usado_en: new Date().toISOString() }).eq("empleado_id", persona.id).is("usado_en", null);
  const codigo = digitosAleatorios(6);
  const enlace = tokenAleatorio();
  const { error } = await servicio.from("codigos_empleado").insert({
    empleado_id: persona.id,
    empresa_id: empresa.id,
    codigo_hash: await hashCodigo(persona.id, codigo),
    enlace_hash: await sha256(enlace),
    expira_en: new Date(Date.now() + MINUTOS_CODIGO * 60_000).toISOString(),
  });
  if (error) return { error: ERROR_GENERAL };
  const url = `${urlPortal(empresa.handle!)}/entrar?t=${enlace}`;
  try {
    await enviarCorreo({ para: correo, ...correoCodigoPortal({ empresa: empresa.nombre, nombre: persona.nombre, codigo, url, minutos: MINUTOS_CODIGO }) });
  } catch (falla) {
    console.error("Código del portal:", falla);
    return { error: ERROR_GENERAL };
  }
  return respuesta;
}

async function entrar(opts: { empleadoId: string; empresaId: string; handle: string; metodo: MetodoAcceso; nipTemporal?: boolean }): Promise<never> {
  await abrirSesion(opts);
  redirect(opts.nipTemporal ? `${rutaPortal(opts.handle)}/nip` : rutaPortal(opts.handle));
}

export async function entrarConCodigo(_: ResultadoAcceso, d: FormData): Promise<ResultadoAcceso> {
  if (!(await dentroDelLimite("LIMITE_ACCESO", `portal-codigo:${await ipActual()}`))) return { error: MENSAJE_LIMITE };
  const correo = correoValido(d.get("correo"));
  const codigo = String(d.get("codigo") ?? "").replace(/\D/g, "");
  const invalido: ResultadoAcceso = { error: "El código no es correcto o ya venció. Pide uno nuevo.", paso: "codigo", correo: correo ?? "" };
  if (!correo || !FORMATO_CODIGO.test(codigo)) return { ...invalido, error: "Escribe los 6 números del código." };
  const encontrada = await empresaDeHandle(handleDe(d));
  if (!encontrada) return { error: NO_DISPONIBLE };
  const { servicio, empresa } = encontrada;

  const personas = await personasConCorreo(servicio, empresa.id, correo);
  if (!personas.length) return invalido;
  const { data: vigente } = await servicio
    .from("codigos_empleado")
    .select("id, empleado_id, codigo_hash, intentos")
    .in(
      "empleado_id",
      personas.map((p) => p.id),
    )
    .is("usado_en", null)
    .gt("expira_en", new Date().toISOString())
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!vigente || vigente.intentos >= INTENTOS_CODIGO) return invalido;
  if (!igualesSeguro(await hashCodigo(vigente.empleado_id, codigo), vigente.codigo_hash)) {
    const intentos = vigente.intentos + 1;
    await servicio
      .from("codigos_empleado")
      .update({ intentos, ...(intentos >= INTENTOS_CODIGO ? { usado_en: new Date().toISOString() } : {}) })
      .eq("id", vigente.id);
    return intentos >= INTENTOS_CODIGO ? { ...invalido, error: "Demasiados intentos con este código. Pide uno nuevo." } : invalido;
  }
  const { data: usado } = await servicio
    .from("codigos_empleado")
    .update({ usado_en: new Date().toISOString() })
    .eq("id", vigente.id)
    .is("usado_en", null)
    .select("id");
  if (!usado?.length) return invalido;
  return entrar({ empleadoId: vigente.empleado_id, empresaId: empresa.id, handle: empresa.handle!, metodo: "codigo" });
}

/** La liga del correo: se usa con un botón (POST) para que los revisores de correo no la gasten al abrirla. */
export async function entrarConEnlace(d: FormData): Promise<void> {
  const handle = handleDe(d);
  const token = String(d.get("t") ?? "");
  if (!handle) redirect("/e");
  if (!(await dentroDelLimite("LIMITE_ACCESO", `portal-enlace:${await ipActual()}`))) redirect(`${rutaPortal(handle)}?error=limite`);
  const encontrada = await empresaDeHandle(handle);
  if (!encontrada || !FORMATO_TOKEN.test(token)) redirect(`${rutaPortal(handle)}?error=liga`);
  const { servicio, empresa } = encontrada;
  const { data: usado } = await servicio
    .from("codigos_empleado")
    .update({ usado_en: new Date().toISOString() })
    .eq("enlace_hash", await sha256(token))
    .eq("empresa_id", empresa.id)
    .is("usado_en", null)
    .gt("expira_en", new Date().toISOString())
    .select("empleado_id");
  if (!usado?.length) redirect(`${rutaPortal(handle)}?error=liga`);
  await entrar({ empleadoId: usado[0].empleado_id, empresaId: empresa.id, handle, metodo: "enlace" });
}

// ---------------------------------------------------------------------------
// Sin correo: ID de acceso y NIP
// ---------------------------------------------------------------------------

export async function entrarConNip(_: Resultado, d: FormData): Promise<Resultado> {
  const ip = await ipActual();
  if (!(await dentroDelLimite("LIMITE_ACCESO", `portal-nip:${ip}`))) return { error: MENSAJE_LIMITE };
  if (!(await verificarTurnstile(d.get(CAMPO_TURNSTILE), ip))) return { error: MENSAJE_TURNSTILE };
  const idAcceso = limpiarIdAcceso(d.get("id_acceso"));
  const nip = String(d.get("nip") ?? "").replace(/\D/g, "");
  if (!idAcceso || !FORMATO_NIP.test(nip)) return { error: "Escribe tu ID de acceso y tu NIP de 6 números." };
  const encontrada = await empresaDeHandle(handleDe(d));
  if (!encontrada) return { error: NO_DISPONIBLE };
  const { servicio, empresa } = encontrada;
  const incorrecto = { error: "El ID de acceso o el NIP no son correctos." };

  const { data: acceso } = await servicio
    .from("accesos_empleado")
    .select("empleado_id, id_acceso, nip_hash, nip_temporal, intentos, bloqueado_hasta, empleados(estatus)")
    .eq("empresa_id", empresa.id)
    .ilike("id_acceso", idAcceso.replace(/[%_\\]/g, "\\$&"))
    .maybeSingle();
  const activo = acceso && (acceso.empleados as { estatus: string } | null)?.estatus !== "baja";

  if (acceso?.bloqueado_hasta && new Date(acceso.bloqueado_hasta) > new Date()) {
    return {
      error: bloqueadoHastaQueLaEmpresa(acceso.bloqueado_hasta)
        ? `Tu acceso está bloqueado por seguridad. Pide a ${empresa.nombre} que te dé un NIP nuevo.`
        : "Tu acceso está bloqueado por seguridad unos minutos. Intenta más tarde.",
    };
  }
  // Siempre se calcula el hash, exista o no el ID: así no se nota cuáles existen.
  const correcto = await nipCorrecto(nip, activo ? acceso.nip_hash : null);
  if (!acceso || !activo) return incorrecto;
  if (!correcto) {
    const intentos = acceso.intentos + 1;
    const hasta = bloqueoTras(intentos);
    await servicio
      .from("accesos_empleado")
      .update({ intentos, ...(hasta ? { bloqueado_hasta: hasta.toISOString() } : {}), actualizado_en: new Date().toISOString() })
      .eq("empleado_id", acceso.empleado_id);
    if (hasta) {
      return {
        error: bloqueadoHastaQueLaEmpresa(hasta.toISOString())
          ? `Demasiados intentos. Tu acceso quedó bloqueado: pide a ${empresa.nombre} un NIP nuevo.`
          : "Demasiados intentos. Tu acceso quedó bloqueado unos minutos por seguridad.",
      };
    }
    return incorrecto;
  }
  await servicio
    .from("accesos_empleado")
    .update({ intentos: 0, bloqueado_hasta: null, ultimo_ingreso: new Date().toISOString() })
    .eq("empleado_id", acceso.empleado_id);
  return entrar({ empleadoId: acceso.empleado_id, empresaId: empresa.id, handle: empresa.handle!, metodo: "nip", nipTemporal: acceso.nip_temporal });
}

/** Cambia el NIP. Obligatorio la primera vez (el que dio la empresa es temporal). */
export async function cambiarNip(_: Resultado, d: FormData): Promise<Resultado> {
  const sesion = await sesionPortal();
  if (!sesion || sesion.metodo !== "nip" || !sesion.acceso) return { error: "Vuelve a entrar con tu NIP." };
  if (!(await dentroDelLimite("LIMITE_ACCESO", `portal-cambio-nip:${await ipActual()}`))) return { error: MENSAJE_LIMITE };
  const actual = String(d.get("actual") ?? "").replace(/\D/g, "");
  const nuevo = String(d.get("nuevo") ?? "").replace(/\D/g, "");
  const confirma = String(d.get("confirma") ?? "").replace(/\D/g, "");
  const { servicio, persona, empresa } = sesion;
  const { data: acceso } = await servicio.from("accesos_empleado").select("id_acceso, nip_hash").eq("empleado_id", persona.id).maybeSingle();
  if (!acceso) return { error: ERROR_GENERAL };
  if (!(await nipCorrecto(actual, acceso.nip_hash))) return { error: "Tu NIP actual no es correcto." };
  if (nuevo !== confirma) return { error: "Los dos NIP nuevos no coinciden." };
  const debil = nipDebil(nuevo, `${acceso.id_acceso}${persona.numero_empleado ?? ""}`);
  if (debil) return { error: debil };
  if (nuevo === actual) return { error: "El NIP nuevo tiene que ser distinto." };
  const { error } = await servicio
    .from("accesos_empleado")
    .update({ nip_hash: await hashNip(nuevo), nip_temporal: false, nip_cambiado_en: new Date().toISOString(), actualizado_en: new Date().toISOString() })
    .eq("empleado_id", persona.id);
  if (error) return { error: ERROR_GENERAL };
  redirect(`${rutaPortal(empresa.handle)}?nip=listo`);
}

export async function salir(d: FormData): Promise<void> {
  await cerrarSesion();
  redirect(handleDe(d) ? rutaPortal(handleDe(d)!) : "/e");
}

// ---------------------------------------------------------------------------
// Solicitudes
// ---------------------------------------------------------------------------

const refrescar = (handle: string) => {
  revalidatePath(rutaPortal(handle));
  revalidatePath("/cuenta/solicitudes");
};

/** Cambio de foto desde el portal: igual que desde la liga, pero sin pedir gafete digital. */
export async function solicitarFotoPortal(d: FormData): Promise<Resultado> {
  const sesion = await sesionPortal();
  if (!sesion || sesion.debeCambiarNip) return { error: "Tu sesión terminó. Vuelve a entrar." };
  if (!(await dentroDelLimite("LIMITE_FORMULARIOS", `portal-foto:${await ipActual()}`))) return { error: MENSAJE_LIMITE };
  const resultado = await registrarCambioFoto(sesion.servicio, sesion.persona, sesion.empresa, d);
  if (resultado.ok) refrescar(sesion.empresa.handle);
  return resultado;
}

export async function cancelarFotoPortal(): Promise<Resultado> {
  const sesion = await sesionPortal();
  if (!sesion) return { error: "Tu sesión terminó. Vuelve a entrar." };
  const resultado = await retirarCambioFoto(sesion.servicio, sesion.persona.id);
  refrescar(sesion.empresa.handle);
  return resultado;
}

/** Corrección de datos: la persona propone los valores nuevos; la empresa aprueba. */
export async function corregirDatos(_: Resultado, d: FormData): Promise<Resultado> {
  const handle = handleDe(d);
  if (!handle) return { error: ERROR_GENERAL };
  const { servicio, persona, empresa } = await requerirPortal(handle);
  if (!(await dentroDelLimite("LIMITE_FORMULARIOS", `portal-datos:${await ipActual()}`))) return { error: MENSAJE_LIMITE };
  const { data: campos } = await servicio.from("campos").select("clave, etiqueta, tipo").eq("empresa_id", empresa.id);
  const permitidos = new Set(["nombre", "puesto", "departamento", ...camposPedibles(campos ?? []).map((c) => c.clave)]);
  const datosActuales = persona.datos && typeof persona.datos === "object" && !Array.isArray(persona.datos) ? (persona.datos as Record<string, unknown>) : {};

  const cambios: Record<string, string> = {};
  for (const clave of permitidos) {
    const valor = d.get(`campo_${clave}`);
    if (typeof valor !== "string") continue;
    const limpio = valor.trim().replace(/\s+/g, " ").slice(0, 160);
    const antes = esColumnaSistema(clave) ? (persona[clave] ?? "") : typeof datosActuales[clave] === "string" ? (datosActuales[clave] as string) : "";
    if (limpio !== antes) cambios[clave] = limpio;
  }
  if ("nombre" in cambios && !cambios.nombre) return { error: "Tu nombre no puede quedar vacío." };
  if (!Object.keys(cambios).length) return { error: "No cambiaste ningún dato." };
  const nota = String(d.get("nota") ?? "").trim().slice(0, 500) || null;

  const { data: abierta } = await servicio
    .from("solicitudes_empleado")
    .select("id")
    .eq("empleado_id", persona.id)
    .eq("tipo", "datos")
    .eq("estado", "pendiente")
    .maybeSingle();
  const { error } = abierta
    ? await servicio.from("solicitudes_empleado").update({ datos: cambios, nota, creado_en: new Date().toISOString() }).eq("id", abierta.id)
    : await servicio.from("solicitudes_empleado").insert({ empresa_id: empresa.id, empleado_id: persona.id, tipo: "datos", datos: cambios, nota });
  if (error) return { error: ERROR_GENERAL };
  if (!abierta) await avisarSolicitud(servicio, { empresaId: empresa.id, persona: persona.nombre, que: "corregir sus datos" });
  refrescar(handle);
  redirect(`${rutaPortal(handle)}?enviada=datos`);
}

const PESO_MAXIMO_COMPROBANTE = 1_500_000;

/** Reposición por pérdida, robo o daño, con los requisitos que fijó la empresa. */
export async function pedirReposicion(_: Resultado, d: FormData): Promise<Resultado> {
  const handle = handleDe(d);
  if (!handle) return { error: ERROR_GENERAL };
  const { servicio, persona, empresa } = await requerirPortal(handle);
  if (!(await dentroDelLimite("LIMITE_FORMULARIOS", `portal-reposicion:${await ipActual()}`))) return { error: MENSAJE_LIMITE };
  const causa = d.get("causa");
  if (!esCausa(causa)) return { error: "Elige qué le pasó a tu gafete." };
  const politica = reposicionDe(empresa.reposicion);
  const aceptados = d.getAll("requisitos").map(String);
  const faltan = politica.requisitos.filter((r) => {
    // La carta y el acta solo aplican si se perdió o se lo robaron; entregar el anterior, si no se perdió.
    if (r === "carta_extravio" && causa === "dano") return false;
    if (r === "acta_robo" && causa !== "robo") return false;
    if (r === "entregar_anterior" && causa !== "dano") return false;
    return !aceptados.includes(r);
  });
  if (faltan.length) return { error: "Confirma cada requisito de tu empresa." };
  if (politica.costo > 0 && d.get("acepto_costo") !== "on") return { error: "Confirma que sabes el costo de la reposición." };
  const nota = String(d.get("nota") ?? "").trim().slice(0, 500) || null;

  // Comprobante opcional (foto de la carta o de la denuncia). Llega ya convertido a JPEG.
  const archivo = d.get("comprobante");
  let bytes: Uint8Array | null = null;
  if (archivo instanceof Blob && archivo.size) {
    if (archivo.size > PESO_MAXIMO_COMPROBANTE) return { error: "La foto del documento pesa demasiado." };
    bytes = new Uint8Array(await archivo.arrayBuffer());
    if (tipoReal(bytes) !== "jpeg") return { error: "Sube una foto (JPG o PNG) del documento." };
  }

  const { data: abierta } = await servicio
    .from("solicitudes_empleado")
    .select("id")
    .eq("empleado_id", persona.id)
    .eq("tipo", "reposicion")
    .eq("estado", "pendiente")
    .maybeSingle();
  if (abierta) return { error: "Ya tienes una reposición en revisión." };
  const { data: nueva, error } = await servicio
    .from("solicitudes_empleado")
    .insert({
      empresa_id: empresa.id,
      empleado_id: persona.id,
      tipo: "reposicion",
      causa,
      nota,
      requisitos: aceptados.filter((r) => politica.requisitos.includes(r as never)),
      costo: politica.costo,
    })
    .select("id")
    .single();
  if (error || !nueva) return { error: ERROR_GENERAL };
  if (bytes) {
    const ruta = `${empresa.id}/solicitudes/${nueva.id}.jpg`;
    const { error: errorArchivo } = await servicio.storage.from("fotos").upload(ruta, bytes, { contentType: "image/jpeg", upsert: true });
    if (!errorArchivo) await servicio.from("solicitudes_empleado").update({ archivo_path: ruta }).eq("id", nueva.id);
  }
  await avisarSolicitud(servicio, { empresaId: empresa.id, persona: persona.nombre, que: "reponer su gafete" });
  refrescar(handle);
  redirect(`${rutaPortal(handle)}?enviada=reposicion`);
}

/** La persona retira una solicitud que sigue en revisión. */
export async function cancelarSolicitud(d: FormData): Promise<void> {
  const handle = handleDe(d);
  const id = String(d.get("id") ?? "");
  if (!handle) redirect("/e");
  const { servicio, persona } = await requerirPortal(handle);
  if (/^[0-9a-f-]{36}$/i.test(id)) {
    const { data } = await servicio
      .from("solicitudes_empleado")
      .update({ estado: "cancelada", resuelto_en: new Date().toISOString() })
      .eq("id", id)
      .eq("empleado_id", persona.id)
      .eq("estado", "pendiente")
      .select("archivo_path");
    const ruta = data?.[0]?.archivo_path;
    if (ruta) await servicio.storage.from("fotos").remove([ruta]);
  }
  refrescar(handle);
  redirect(rutaPortal(handle));
}
