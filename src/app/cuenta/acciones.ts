"use server";

import { destinoSeguro } from "@/lib/cuenta/siguiente";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { estadosMexico, regimenesFiscales, usosCfdi } from "@/lib/cuenta/catalogos";
import { constanciaDe, ventanaDeEmision } from "@/lib/cuenta/constancia";
import { CLAVES_DE_CORREO, correoValido } from "@/lib/cuenta/ligas";
import { datosVerificables, modosQr } from "@/lib/cuenta/qr";
import { recordarEmpresa, requerirEmpresa, requerirUsuario } from "@/lib/cuenta/sesion";
import { claveDe, normalizar } from "@/lib/cuenta/texto";
import type { FilaImportada, Resultado } from "@/lib/cuenta/tipos";
import { carta, site } from "@/lib/site";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ERROR_GENERAL = "No pudimos guardar. Intenta de nuevo.";
const SOLO_ADMIN = "Solo quien administra la empresa puede cambiar estos datos.";

const texto = (d: FormData, clave: string, max = 200) =>
  String(d.get(clave) ?? "").trim().slice(0, max);
const opcional = (d: FormData, clave: string, max = 200) => texto(d, clave, max) || null;
const id = (d: FormData, clave = "id") => {
  const v = String(d.get(clave) ?? "");
  return UUID.test(v) ? v : null;
};
const refrescar = () => revalidatePath("/cuenta", "layout");

// --- Empresa ---------------------------------------------------------------

export async function crearEmpresa(_: Resultado, d: FormData): Promise<Resultado> {
  const { supabase } = await requerirUsuario();
  const nombre = texto(d, "nombre", 120);
  if (!nombre) return { error: "Escribe el nombre de tu empresa." };
  const { data, error } = await supabase.rpc("crear_empresa", {
    p_nombre: nombre,
    p_giro: texto(d, "giro", 80),
  });
  if (error || !data) return { error: error?.code === "P0001" ? error.message : ERROR_GENERAL };
  await recordarEmpresa(data);
  refrescar();
  // Si venía del carrito, regresa a pagar. Si no, lo primero que se le pide a una
  // empresa nueva es verificarla; puede dejarlo para después.
  redirect(destinoSeguro(d.get("siguiente")) ?? "/cuenta/verificacion?nueva=1");
}

/** Registra la constancia que la empresa acaba de subir al almacenamiento. Queda en revisión. */
export async function guardarConstancia(entrada: { ruta: string; fecha: string; carta: boolean }): Promise<Resultado> {
  const { supabase, empresa, administra } = await requerirEmpresa();
  if (!administra) return { error: "Solo quien administra la empresa puede verificarla." };
  if (entrada?.carta !== true) return { error: "Acepta la carta de responsabilidad." };
  const ruta = String(entrada?.ruta ?? "");
  const fecha = String(entrada?.fecha ?? "");
  if (!new RegExp(`^${empresa.id}/[0-9a-f-]{36}\\.(pdf|jpg|png)$`).test(ruta) || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return { error: ERROR_GENERAL };
  }
  const { desde, hasta } = ventanaDeEmision();
  if (fecha > hasta) return { error: "La fecha de emisión no puede ser futura." };
  if (fecha < desde) return { error: `La constancia debe tener máximo ${site.constanciaMeses} meses de antigüedad.` };
  const actual = await constanciaDe(supabase, empresa.id);
  if (actual?.estado === "aprobada") return { error: "Tu empresa ya está verificada." };
  if (actual?.estado === "pendiente") return { error: "Ya tienes una verificación en revisión." };
  const { error } = await supabase
    .from("constancias")
    .insert({ empresa_id: empresa.id, metodo: "constancia", ruta, fecha_emision: fecha, carta_version: carta.version });
  if (error) return { error: error.code === "P0001" ? error.message : ERROR_GENERAL };
  refrescar();
  return { ok: "Recibimos tu constancia." };
}

export async function elegirEmpresa(d: FormData) {
  const { supabase } = await requerirUsuario();
  const empresaId = id(d, "empresa");
  if (empresaId) {
    const { data } = await supabase.from("empresas").select("id").eq("id", empresaId).maybeSingle();
    if (data) await recordarEmpresa(data.id);
  }
  refrescar();
  redirect("/cuenta");
}

export async function guardarEmpresa(_: Resultado, d: FormData): Promise<Resultado> {
  const { supabase, empresa } = await requerirEmpresa();
  const nombre = texto(d, "nombre", 120);
  if (!nombre) return { error: "Escribe el nombre de tu empresa." };
  const { data, error } = await supabase
    .from("empresas")
    .update({ nombre, giro: opcional(d, "giro", 80) })
    .eq("id", empresa.id)
    .select("id");
  if (error) return { error: ERROR_GENERAL };
  if (!data.length) return { error: SOLO_ADMIN };
  refrescar();
  return { ok: "Guardado." };
}

// --- Datos de envío --------------------------------------------------------

export async function guardarDireccion(_: Resultado, d: FormData): Promise<Resultado> {
  const { supabase, empresa, administra } = await requerirEmpresa();
  if (!administra) return { error: SOLO_ADMIN };
  const fila = {
    alias: opcional(d, "alias", 60),
    destinatario: texto(d, "destinatario", 120),
    telefono: texto(d, "telefono", 30),
    calle: texto(d, "calle", 160),
    colonia: texto(d, "colonia", 120),
    ciudad: texto(d, "ciudad", 120),
    estado: texto(d, "estado", 60),
    cp: texto(d, "cp", 5),
    referencias: opcional(d, "referencias", 240),
  };
  if (!fila.destinatario || !fila.calle || !fila.colonia || !fila.ciudad) {
    return { error: "Llena destinatario, calle y número, colonia y ciudad." };
  }
  if (!estadosMexico.includes(fila.estado)) return { error: "Elige el estado." };
  if (!/^[0-9]{5}$/.test(fila.cp)) return { error: "El código postal lleva 5 dígitos." };
  if (fila.telefono.replace(/\D/g, "").length < 10) {
    return { error: "Escribe un teléfono de 10 dígitos para la paquetería." };
  }

  const editando = id(d);
  const { count } = await supabase
    .from("direcciones")
    .select("id", { count: "exact", head: true })
    .eq("empresa_id", empresa.id);
  const predeterminada = d.get("predeterminada") === "on" || !count;
  if (predeterminada) {
    await supabase.from("direcciones").update({ predeterminada: false }).eq("empresa_id", empresa.id);
  }
  const { error } = editando
    ? await supabase
        .from("direcciones")
        .update({ ...fila, ...(predeterminada ? { predeterminada } : {}) })
        .eq("id", editando)
    : await supabase.from("direcciones").insert({ ...fila, predeterminada, empresa_id: empresa.id });
  if (error) return { error: ERROR_GENERAL };
  refrescar();
  if (editando) redirect("/cuenta/datos");
  return { ok: "Dirección guardada." };
}

export async function borrarDireccion(d: FormData) {
  const { supabase } = await requerirEmpresa();
  const fila = id(d);
  if (fila) await supabase.from("direcciones").delete().eq("id", fila);
  refrescar();
}

export async function predeterminarDireccion(d: FormData) {
  const { supabase, empresa } = await requerirEmpresa();
  const fila = id(d);
  if (fila) {
    await supabase.from("direcciones").update({ predeterminada: false }).eq("empresa_id", empresa.id);
    await supabase.from("direcciones").update({ predeterminada: true }).eq("id", fila);
  }
  refrescar();
}

// --- Datos de facturación --------------------------------------------------

export async function guardarDatosFiscales(_: Resultado, d: FormData): Promise<Resultado> {
  const { supabase, empresa, administra } = await requerirEmpresa();
  if (!administra) return { error: SOLO_ADMIN };
  const fila = {
    rfc: texto(d, "rfc", 13).toUpperCase().replace(/[\s-]/g, ""),
    razon_social: texto(d, "razon_social", 200),
    regimen_fiscal: texto(d, "regimen_fiscal", 3),
    cp_fiscal: texto(d, "cp_fiscal", 5),
    uso_cfdi: texto(d, "uso_cfdi", 4),
    correo: texto(d, "correo", 254).toLowerCase(),
  };
  if (!/^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/.test(fila.rfc)) {
    return { error: "Revisa el RFC: lleva 12 caracteres (empresa) o 13 (persona)." };
  }
  if (!fila.razon_social) return { error: "Escribe el nombre o razón social como aparece en tu constancia." };
  if (!regimenesFiscales.some((r) => r.clave === fila.regimen_fiscal)) return { error: "Elige el régimen fiscal." };
  if (!/^[0-9]{5}$/.test(fila.cp_fiscal)) return { error: "El código postal fiscal lleva 5 dígitos." };
  if (!usosCfdi.some((u) => u.clave === fila.uso_cfdi)) return { error: "Elige el uso del CFDI." };
  if (!CORREO.test(fila.correo)) return { error: "Escribe el correo donde quieres recibir tus facturas." };

  const editando = id(d);
  const { count } = await supabase
    .from("datos_fiscales")
    .select("id", { count: "exact", head: true })
    .eq("empresa_id", empresa.id);
  const predeterminado = d.get("predeterminado") === "on" || !count;
  if (predeterminado) {
    await supabase.from("datos_fiscales").update({ predeterminado: false }).eq("empresa_id", empresa.id);
  }
  const { error } = editando
    ? await supabase
        .from("datos_fiscales")
        .update({ ...fila, ...(predeterminado ? { predeterminado } : {}) })
        .eq("id", editando)
    : await supabase.from("datos_fiscales").insert({ ...fila, predeterminado, empresa_id: empresa.id });
  if (error) return { error: ERROR_GENERAL };
  refrescar();
  if (editando) redirect("/cuenta/datos");
  return { ok: "Datos de facturación guardados." };
}

export async function borrarDatosFiscales(d: FormData) {
  const { supabase } = await requerirEmpresa();
  const fila = id(d);
  if (fila) await supabase.from("datos_fiscales").delete().eq("id", fila);
  refrescar();
}

// --- Equipo ----------------------------------------------------------------

const ESTATUS = ["activo", "pendiente", "baja"];
/** Fecha de hoy (AAAA-MM-DD) en la hora de Sonora, no en UTC. */
const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Hermosillo" }).format(new Date());

export async function guardarEmpleado(_: Resultado, d: FormData): Promise<Resultado> {
  const { supabase, empresa } = await requerirEmpresa();
  const nombre = texto(d, "nombre", 160);
  if (!nombre) return { error: "Escribe el nombre de la persona." };

  const { data: campos } = await supabase
    .from("campos")
    .select("clave, tipo")
    .eq("empresa_id", empresa.id)
    .eq("de_sistema", false);
  const editando = id(d);
  const anterior = editando
    ? (await supabase.from("empleados").select("datos").eq("id", editando).maybeSingle()).data
    : null;
  const datos: Record<string, string> = {
    ...((anterior?.datos as Record<string, string> | null) ?? {}),
  };
  for (const c of campos ?? []) {
    const valor = texto(d, `dato_${c.clave}`, 200);
    if (valor) datos[c.clave] = valor;
    else delete datos[c.clave];
  }

  const correo = texto(d, "correo", 200);
  if (correo && !correoValido(correo)) return { error: "Revisa el correo de la persona: no parece válido." };

  const estatus = ESTATUS.includes(texto(d, "estatus")) ? texto(d, "estatus") : "activo";
  const fila = {
    nombre,
    correo: correoValido(correo),
    numero_empleado: opcional(d, "numero_empleado", 40),
    puesto: opcional(d, "puesto", 120),
    departamento: opcional(d, "departamento", 120),
    tipo_contrato: opcional(d, "tipo_contrato", 60),
    datos,
  };

  if (editando) {
    const { error } = await supabase.from("empleados").update(fila).eq("id", editando);
    if (error) {
      return { error: error.code === "23505" ? "Ya hay otra persona con ese número de empleado." : ERROR_GENERAL };
    }
    refrescar();
    return { ok: "Guardado." };
  }

  const { data, error } = await supabase
    .from("empleados")
    .insert({ ...fila, estatus, empresa_id: empresa.id })
    .select("id")
    .single();
  if (error || !data) {
    return { error: error?.code === "23505" ? "Ya hay una persona con ese número de empleado." : ERROR_GENERAL };
  }
  refrescar();
  redirect(`/cuenta/equipo/${data.id}`);
}

export async function cambiarEstatus(d: FormData) {
  const { supabase } = await requerirEmpresa();
  const fila = id(d);
  const estatus = texto(d, "estatus");
  if (fila && ESTATUS.includes(estatus)) {
    await supabase
      .from("empleados")
      .update({ estatus, fecha_baja: estatus === "baja" ? hoy() : null })
      .eq("id", fila);
  }
  refrescar();
}

export async function borrarEmpleado(d: FormData) {
  const { supabase } = await requerirEmpresa();
  const fila = id(d);
  if (fila) {
    const { data } = await supabase.from("empleados").select("foto_path").eq("id", fila).maybeSingle();
    if (data?.foto_path) await supabase.storage.from("fotos").remove([data.foto_path]);
    const { data: listo } = await supabase
      .from("gafetes_listos")
      .select("frente_path, vuelta_path")
      .eq("empleado_id", fila)
      .maybeSingle();
    const caras = [listo?.frente_path, listo?.vuelta_path].filter((r): r is string => Boolean(r));
    if (caras.length) await supabase.storage.from("gafetes").remove(caras);
    await supabase.from("empleados").delete().eq("id", fila);
  }
  refrescar();
  redirect("/cuenta/equipo");
}

/**
 * Importa personas leídas de un Excel. Quien ya existe (mismo número de empleado o,
 * si no tiene número, mismo nombre) se actualiza; el resto se agrega.
 */
export async function importarEmpleados(
  filas: FilaImportada[],
): Promise<Resultado & { nuevas?: number; actualizadas?: number }> {
  const { supabase, empresa } = await requerirEmpresa();
  if (!Array.isArray(filas) || filas.length === 0) return { error: "El archivo no trae personas." };
  if (filas.length > 2000) return { error: "Sube como máximo 2,000 personas por archivo." };

  const corto = (v: unknown, max: number) => {
    const t = typeof v === "string" || typeof v === "number" ? String(v).trim().slice(0, max) : "";
    return t || null;
  };
  const { data: campos } = await supabase
    .from("campos")
    .select("clave")
    .eq("empresa_id", empresa.id)
    .eq("de_sistema", false);
  const claves = new Set((campos ?? []).map((c) => c.clave));

  const { data: existentes } = await supabase
    .from("empleados")
    .select("id, nombre, numero_empleado, correo, datos")
    .eq("empresa_id", empresa.id);
  type Previa = NonNullable<typeof existentes>[number];
  const porNumero = new Map<string, Previa>();
  // Quien no tiene número se reconoce por su nombre, si nadie más se llama igual.
  const porNombre = new Map<string, Previa | null>();
  for (const e of existentes ?? []) {
    if (e.numero_empleado) porNumero.set(e.numero_empleado, e);
    else porNombre.set(normalizar(e.nombre), porNombre.has(normalizar(e.nombre)) ? null : e);
  }

  // Por persona existente (id) o por número nuevo, para que un renglón repetido no duplique.
  const cambios = new Map<string, Record<string, unknown>>();
  const altas = new Map<string, Record<string, unknown>>();
  const sinNumero: Record<string, unknown>[] = [];
  for (const f of filas) {
    const nombre = corto(f?.nombre, 160);
    if (!nombre) return { error: "Hay renglones sin nombre. Corrige el archivo y vuelve a subirlo." };
    const numero = corto(f.numero_empleado, 40);
    const previa = (numero ? porNumero.get(numero) : undefined) ?? porNombre.get(normalizar(nombre)) ?? undefined;
    const datos: Record<string, string> = { ...((previa?.datos as Record<string, string> | null) ?? {}) };
    for (const [clave, valor] of Object.entries(f.datos ?? {})) {
      const v = corto(valor, 200);
      if (claves.has(clave) && v) datos[clave] = v;
    }
    const archivo = corto(f.foto_archivo, 160);
    if (archivo) datos.foto_archivo = archivo;
    const fila = {
      empresa_id: empresa.id,
      nombre,
      numero_empleado: numero ?? previa?.numero_empleado ?? null,
      puesto: corto(f.puesto, 120),
      departamento: corto(f.departamento, 120),
      tipo_contrato: corto(f.tipo_contrato, 60),
      // El correo llega en su columna o, si la empresa lo tiene como campo propio, de ahí.
      correo:
        correoValido(f.correo) ??
        CLAVES_DE_CORREO.map((clave) => correoValido(f.datos?.[clave])).find(Boolean) ??
        previa?.correo ??
        null,
      datos,
    };
    if (previa) cambios.set(previa.id, { ...fila, id: previa.id });
    else if (numero) altas.set(numero, fila);
    else sinNumero.push(fila);
  }

  if (cambios.size) {
    const { error } = await supabase.from("empleados").upsert([...cambios.values()] as never, { onConflict: "id" });
    if (error) {
      return {
        error: error.code === "23505" ? "Dos personas del archivo quedarían con el mismo número de empleado." : ERROR_GENERAL,
      };
    }
  }
  const nuevas = [...altas.values(), ...sinNumero];
  if (nuevas.length) {
    const { error } = await supabase.from("empleados").insert(nuevas as never);
    if (error) return { error: ERROR_GENERAL };
  }
  refrescar();
  return { ok: "Listo.", nuevas: nuevas.length, actualizadas: cambios.size };
}

/** Registra en cada persona la ruta de la foto que el navegador ya subió. */
export async function asignarFotos(pares: { id: string; ruta: string }[]): Promise<Resultado> {
  const { supabase, empresa } = await requerirEmpresa();
  if (!Array.isArray(pares) || pares.length > 500) return { error: "Demasiadas fotos a la vez." };
  for (const p of pares) {
    if (!UUID.test(p?.id) || p.ruta !== `${empresa.id}/${p.id}.jpg`) return { error: "Foto no válida." };
  }
  const fallas = await Promise.all(
    pares.map((p) =>
      supabase
        .from("empleados")
        .update({ foto_path: p.ruta })
        .eq("id", p.id)
        .eq("empresa_id", empresa.id)
        .then((r) => r.error),
    ),
  );
  refrescar();
  return fallas.some(Boolean) ? { error: "Algunas fotos no se pudieron asignar." } : { ok: "Fotos guardadas." };
}

export async function quitarFoto(d: FormData) {
  const { supabase } = await requerirEmpresa();
  const fila = id(d);
  if (fila) {
    const { data } = await supabase.from("empleados").select("foto_path").eq("id", fila).maybeSingle();
    if (data?.foto_path) await supabase.storage.from("fotos").remove([data.foto_path]);
    await supabase.from("empleados").update({ foto_path: null }).eq("id", fila);
  }
  refrescar();
}

// --- Campos ----------------------------------------------------------------

export async function agregarCampo(_: Resultado, d: FormData): Promise<Resultado> {
  const { supabase, empresa } = await requerirEmpresa();
  const etiqueta = texto(d, "etiqueta", 60);
  if (!etiqueta) return { error: "Escribe el nombre del campo." };
  const { data: actuales } = await supabase
    .from("campos")
    .select("clave, etiqueta, orden")
    .eq("empresa_id", empresa.id);
  if ((actuales?.length ?? 0) >= 30) return { error: "Llegaste al máximo de 30 campos." };
  if ((actuales ?? []).some((c) => normalizar(c.etiqueta) === normalizar(etiqueta))) {
    return { error: "Ya tienes un campo con ese nombre." };
  }
  const usadas = new Set((actuales ?? []).map((c) => c.clave));
  const base = claveDe(etiqueta);
  let clave = base;
  for (let i = 2; usadas.has(clave) || clave === "foto_archivo"; i++) clave = `${base.slice(0, 36)}_${i}`;
  const { error } = await supabase.from("campos").insert({
    empresa_id: empresa.id,
    clave,
    etiqueta,
    tipo: texto(d, "tipo") === "fecha" ? "fecha" : "texto",
    cara: texto(d, "cara") === "vuelta" ? "vuelta" : "frente",
    en_gafete: true,
    orden: Math.max(0, ...(actuales ?? []).map((c) => c.orden)) + 1,
  });
  if (error) return { error: ERROR_GENERAL };
  refrescar();
  return { ok: "Campo agregado." };
}

/** Guarda de una vez qué campos van en el gafete, en qué cara y en qué orden. */
export async function guardarCampos(_: Resultado, d: FormData): Promise<Resultado> {
  const { supabase, empresa } = await requerirEmpresa();
  const { data: campos } = await supabase
    .from("campos")
    .select("id, clave, de_sistema")
    .eq("empresa_id", empresa.id);
  const fallas = await Promise.all(
    (campos ?? []).map((c) => {
      const etiqueta = texto(d, `etiqueta_${c.id}`, 60);
      return supabase
        .from("campos")
        .update({
          // El nombre siempre va en el gafete.
          en_gafete: c.clave === "nombre" || d.get(`en_${c.id}`) === "on",
          cara: texto(d, `cara_${c.id}`) === "vuelta" ? "vuelta" : "frente",
          orden: Math.min(99, Math.max(0, Number(texto(d, `orden_${c.id}`)) || 0)),
          ...(etiqueta ? { etiqueta } : {}),
        })
        .eq("id", c.id)
        .then((r) => r.error);
    }),
  );
  refrescar();
  return fallas.some(Boolean) ? { error: ERROR_GENERAL } : { ok: "Campos guardados." };
}

/** Guarda a dónde lleva el código QR de los gafetes de la empresa. */
export async function guardarQr(_: Resultado, d: FormData): Promise<Resultado> {
  const { supabase, empresa, administra } = await requerirEmpresa();
  if (!administra) return { error: "Solo quien administra la empresa puede cambiar qué muestra el QR." };
  const modo = modosQr.find((m) => m.id === d.get("qr_modo"))?.id;
  if (!modo) return { error: "Elige qué muestra tu QR." };
  const { data: campos } = await supabase.from("campos").select("clave, tipo").eq("empresa_id", empresa.id);
  const claves = (tipos: string[]) => (campos ?? []).filter((c) => tipos.includes(c.tipo)).map((c) => c.clave);

  const cambios: {
    qr_modo: string;
    qr_mostrar?: string[];
    qr_vigencia?: string | null;
    qr_liga?: string;
    qr_dato?: string;
  } = { qr_modo: modo };
  if (modo === "verificacion") {
    const mostrar = datosVerificables.map((v) => v.clave).filter((clave) => d.get(`mostrar_${clave}`) === "on");
    if (!mostrar.some((clave) => clave !== "empresa")) {
      return { error: "Elige al menos un dato de la persona para mostrar." };
    }
    cambios.qr_mostrar = mostrar;
    const vigencia = texto(d, "qr_vigencia", 40);
    cambios.qr_vigencia = claves(["fecha"]).includes(vigencia) ? vigencia : null;
  } else if (modo === "liga") {
    const liga = texto(d, "qr_liga", 300);
    let valida = false;
    try {
      valida = new URL(liga.replaceAll("{numero}", "1").replaceAll("{codigo}", "1")).protocol === "https:";
    } catch {
      valida = false;
    }
    if (!valida || /\s/.test(liga)) return { error: "Escribe una liga completa que empiece con https://" };
    cambios.qr_liga = liga;
  } else {
    const dato = texto(d, "qr_dato", 40);
    if (!claves(["texto", "fecha"]).includes(dato)) return { error: "Elige qué dato lleva el código." };
    cambios.qr_dato = dato;
  }

  const { data, error } = await supabase.from("empresas").update(cambios).eq("id", empresa.id).select("id");
  if (error) return { error: ERROR_GENERAL };
  if (!data.length) return { error: SOLO_ADMIN };
  refrescar();
  return { ok: "Guardado. Tus gafetes ya usan este código QR." };
}

export async function borrarCampo(d: FormData) {
  const { supabase } = await requerirEmpresa();
  const fila = id(d);
  if (fila) await supabase.from("campos").delete().eq("id", fila).eq("de_sistema", false);
  refrescar();
}
