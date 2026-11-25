"use server";

import { destinoSeguro } from "@/lib/cuenta/siguiente";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { estadosMexico, regimenesFiscales, usosCfdi } from "@/lib/cuenta/catalogos";
import { constanciaDe, ventanaDeEmision } from "@/lib/cuenta/constancia";
import { ordenDelArchivo } from "@/lib/cuenta/excel";
import { CLAVES_DE_CORREO, correoValido } from "@/lib/cuenta/ligas";
import { datosVerificables, modosQr } from "@/lib/cuenta/qr";
import { recordarEmpresa, requerirEmpresa, requerirUsuario } from "@/lib/cuenta/sesion";
import { claveDe, normalizar } from "@/lib/cuenta/texto";
import { DATOS_DE_ENTRADA, type FilaImportada, type Resultado } from "@/lib/cuenta/tipos";
import { revisarAviso } from "@/lib/pedidos/abierto";
import { revisarDespues } from "@/lib/seguridad/revisar";
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
export async function guardarConstancia(entrada: {
  ruta: string;
  fecha: string;
  /** true si la fecha salió del PDF del SAT; false si la escribió la persona. */
  fechaLeida: boolean;
  carta: boolean;
}): Promise<Resultado> {
  const { supabase, empresa, administra, esEvento } = await requerirEmpresa();
  if (!administra) return { error: "Solo quien administra la empresa puede verificarla." };
  if (esEvento) return { error: "Los eventos usan la verificación de su organización: verifícala desde tu empresa." };
  if (entrada?.carta !== true) return { error: "Para continuar, debes aceptar la carta de responsabilidad: léela y marca la casilla «Acepto la carta de responsabilidad»." };
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
    .insert({
      empresa_id: empresa.id,
      metodo: "constancia",
      ruta,
      fecha_emision: fecha,
      fecha_leida: entrada?.fechaLeida === true,
      carta_version: carta.version,
    });
  if (error) return { error: error.code === "P0001" ? error.message : ERROR_GENERAL };
  revisarDespues([{ bucket: "constancias", ruta, origen: "verificacion" }]);
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
  redirect(mismaSeccion(d.get("ruta")));
}

/**
 * Al cambiar de empresa se queda en la misma sección. Si estaba en algo de la
 * otra empresa (un diseño, una persona, un pedido), cae a la lista de esa sección.
 */
function mismaSeccion(ruta: unknown): string {
  if (typeof ruta !== "string" || !/^\/cuenta(\/[a-z0-9-]+)*$/i.test(ruta)) return "/cuenta";
  const partes = ruta.split("/");
  const elemento = partes.findIndex((p) => UUID.test(p));
  return elemento === -1 ? ruta : partes.slice(0, elemento).join("/");
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
  // El nombre es opcional: puede haber gafetes genéricos, como «Visitante».
  const nombre = texto(d, "nombre", 160);

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
  const conAlgo =
    nombre || ["numero_empleado", "puesto", "departamento", "tipo_contrato"].some((c) => texto(d, c)) || Object.keys(datos).length;
  if (!conAlgo) return { error: "Escribe al menos un dato: el nombre, el puesto o el número." };
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
  // Un alta nueva puede completar el pedido abierto.
  if (estatus === "activo") await revisarAviso(empresa.id);
  refrescar();
  redirect(`/cuenta/equipo/${data.id}`);
}

export async function cambiarEstatus(d: FormData) {
  const { supabase, empresa } = await requerirEmpresa();
  const fila = id(d);
  const estatus = texto(d, "estatus");
  if (fila && ESTATUS.includes(estatus)) {
    await supabase
      .from("empleados")
      .update({ estatus, fecha_baja: estatus === "baja" ? hoy() : null })
      .eq("id", fila);
    await revisarAviso(empresa.id);
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
  const { data: campos } = await supabase.from("campos").select("clave, de_sistema").eq("empresa_id", empresa.id);
  const claves = new Set((campos ?? []).filter((c) => !c.de_sistema).map((c) => c.clave));
  // Un dato de entrada que la empresa quitó no viene en su Excel: se conserva lo que ya tenía.
  const enLista = new Set((campos ?? []).map((c) => c.clave));

  const { data: existentes } = await supabase
    .from("empleados")
    .select("id, nombre, numero_empleado, puesto, departamento, tipo_contrato, correo, datos")
    .eq("empresa_id", empresa.id);
  type Previa = NonNullable<typeof existentes>[number];
  const porNumero = new Map<string, Previa>();
  // Quien no tiene número se reconoce por su nombre, si nadie más se llama igual.
  const porNombre = new Map<string, Previa | null>();
  for (const e of existentes ?? []) {
    if (e.numero_empleado) porNumero.set(e.numero_empleado, e);
    else if (e.nombre) porNombre.set(normalizar(e.nombre), porNombre.has(normalizar(e.nombre)) ? null : e);
  }

  // Por persona existente (id) o por número nuevo, para que un renglón repetido no duplique.
  const cambios = new Map<string, Record<string, unknown>>();
  const altas = new Map<string, Record<string, unknown>>();
  const sinNumero: Record<string, unknown>[] = [];
  for (const f of filas) {
    if (!f || typeof f !== "object") return { error: "El archivo no se leyó bien. Vuelve a subirlo." };
    // Sin nombre se sube como gafete genérico.
    const nombre = corto(f.nombre, 160) ?? "";
    const numero = corto(f.numero_empleado, 40);
    const previa = (numero ? porNumero.get(numero) : undefined) ?? (nombre ? porNombre.get(normalizar(nombre)) : undefined) ?? undefined;
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
      puesto: enLista.has("puesto") ? corto(f.puesto, 120) : (previa?.puesto ?? null),
      departamento: enLista.has("departamento") ? corto(f.departamento, 120) : (previa?.departamento ?? null),
      tipo_contrato: enLista.has("tipo_contrato") ? corto(f.tipo_contrato, 60) : (previa?.tipo_contrato ?? null),
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
    await revisarAviso(empresa.id);
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
  revisarDespues(pares.filter((_, i) => !fallas[i]).map((p) => ({ bucket: "fotos", ruta: p.ruta, origen: "foto" as const })));
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

type CampoActual = { clave: string; etiqueta: string; orden: number };

/**
 * Agrega un dato a la empresa. Si se llama como un dato de entrada que la
 * empresa quitó, lo recupera con lo ya capturado. Suma el dato a `actuales`.
 */
async function insertarCampo(
  supabase: Awaited<ReturnType<typeof requerirEmpresa>>["supabase"],
  empresaId: string,
  actuales: CampoActual[],
  etiqueta: string,
  tipo: "texto" | "fecha",
): Promise<{ error: string } | { clave: string; recuperado: boolean }> {
  if (actuales.length >= 30) return { error: "Llegaste al máximo de 30 campos." };
  if (actuales.some((c) => normalizar(c.etiqueta) === normalizar(etiqueta))) {
    return { error: `Ya tienes un campo llamado «${etiqueta}».` };
  }
  const orden = Math.max(0, ...actuales.map((c) => c.orden)) + 1;
  const deEntrada = DATOS_DE_ENTRADA.find(
    (x) => normalizar(x.etiqueta) === normalizar(etiqueta) && !actuales.some((c) => c.clave === x.clave),
  );
  if (deEntrada) {
    const { error } = await supabase.from("campos").insert({
      empresa_id: empresaId,
      clave: deEntrada.clave,
      etiqueta,
      tipo: deEntrada.tipo,
      cara: deEntrada.cara,
      en_gafete: false,
      de_sistema: true,
      orden,
    });
    if (error) return { error: ERROR_GENERAL };
    actuales.push({ clave: deEntrada.clave, etiqueta, orden });
    return { clave: deEntrada.clave, recuperado: true };
  }
  // Las claves de los datos de entrada quedan reservadas aunque se hayan quitado.
  const usadas = new Set([...actuales.map((c) => c.clave), ...DATOS_DE_ENTRADA.map((x) => x.clave), "nombre"]);
  const base = claveDe(etiqueta);
  let clave = base;
  for (let i = 2; usadas.has(clave) || clave === "foto_archivo"; i++) clave = `${base.slice(0, 36)}_${i}`;
  const { error } = await supabase.from("campos").insert({
    empresa_id: empresaId,
    clave,
    etiqueta,
    tipo,
    // De entrada, un dato nuevo se propone impreso en la vuelta; cada diseño decide.
    cara: "vuelta",
    en_gafete: true,
    orden,
  });
  if (error) return { error: ERROR_GENERAL };
  actuales.push({ clave, etiqueta, orden });
  return { clave, recuperado: false };
}

export async function agregarCampo(_: Resultado, d: FormData): Promise<Resultado> {
  const { supabase, empresa } = await requerirEmpresa();
  const etiqueta = texto(d, "etiqueta", 60);
  if (!etiqueta) return { error: "Escribe el nombre del campo." };
  const { data } = await supabase.from("campos").select("clave, etiqueta, orden").eq("empresa_id", empresa.id);
  const r = await insertarCampo(supabase, empresa.id, data ?? [], etiqueta, texto(d, "tipo") === "fecha" ? "fecha" : "texto");
  if ("error" in r) return { error: r.error };
  refrescar();
  return { ok: r.recuperado ? "Campo agregado, con lo que ya tenías capturado." : "Campo agregado." };
}

/**
 * Antes de importar un Excel: agrega a «Tus datos» las columnas nuevas que la
 * empresa confirmó y, si lo pidió, acomoda sus datos en el orden del archivo.
 * Devuelve los datos ya actualizados para leer el archivo con ellos.
 */
export async function camposDesdeExcel(
  nuevos: { etiqueta: string; tipo: string }[],
  encabezados: string[] | null,
): Promise<{ error?: string; campos?: { clave: string; etiqueta: string; tipo: string }[] }> {
  const { supabase, empresa } = await requerirEmpresa();
  if (!Array.isArray(nuevos) || nuevos.length > 30) return { error: ERROR_GENERAL };
  const { data } = await supabase.from("campos").select("clave, etiqueta, orden").eq("empresa_id", empresa.id);
  const actuales: CampoActual[] = data ?? [];
  for (const n of nuevos) {
    const etiqueta = typeof n?.etiqueta === "string" ? n.etiqueta.trim().slice(0, 60) : "";
    if (!etiqueta || actuales.some((c) => normalizar(c.etiqueta) === normalizar(etiqueta))) continue;
    const r = await insertarCampo(supabase, empresa.id, actuales, etiqueta, n.tipo === "fecha" ? "fecha" : "texto");
    if ("error" in r) {
      refrescar();
      return { error: r.error };
    }
  }

  const leer = async () =>
    (await supabase.from("campos").select("id, clave, etiqueta, tipo").eq("empresa_id", empresa.id).order("orden").order("creado_en")).data ?? [];
  let campos = await leer();
  if (Array.isArray(encabezados) && encabezados.length) {
    const delArchivo = ordenDelArchivo(encabezados.map((e) => String(e ?? "").slice(0, 200)).slice(0, 200), campos);
    const resto = campos.filter((c) => !delArchivo.includes(c.clave));
    const enOrden = [...delArchivo.map((clave) => campos.find((c) => c.clave === clave)!), ...resto];
    const fallas = await Promise.all(
      enOrden.map((c, i) => supabase.from("campos").update({ orden: i + 1 }).eq("id", c.id).then((r) => r.error)),
    );
    if (fallas.some(Boolean)) {
      refrescar();
      return { error: ERROR_GENERAL };
    }
    campos = await leer();
  }
  refrescar();
  return { campos: campos.map(({ clave, etiqueta, tipo }) => ({ clave, etiqueta, tipo })) };
}

/**
 * Guarda el nombre y el orden (en el Excel) de los datos, y quita los que la
 * persona marcó con la ×. Qué va impreso lo decide cada diseño. El orden se
 * vuelve a numerar del 1 en adelante, sin repetirse.
 */
export async function guardarCampos(_: Resultado, d: FormData): Promise<Resultado> {
  const { supabase, empresa } = await requerirEmpresa();
  const { data: campos } = await supabase
    .from("campos")
    .select("id, clave, etiqueta, orden")
    .eq("empresa_id", empresa.id)
    .order("orden")
    .order("creado_en");
  const pedidos = new Set(d.getAll("quitar").map(String));
  const quitar = (campos ?? []).filter((c) => pedidos.has(c.id) && c.clave !== "nombre");
  const quedan = (campos ?? [])
    .filter((c) => !quitar.includes(c))
    .map((c, i) => {
      const lugar = Number(texto(d, `orden_${c.id}`));
      return { ...c, etiqueta: texto(d, `etiqueta_${c.id}`, 60) || c.etiqueta, lugar: lugar > 0 ? lugar : 1000 + i };
    })
    .sort((a, b) => a.lugar - b.lugar);

  const vistos = new Map<string, string>();
  for (const c of quedan) {
    const n = normalizar(c.etiqueta);
    if (vistos.has(n)) {
      return { error: `Tienes dos datos llamados «${c.etiqueta}». Cambia el nombre de uno para que tu Excel no tenga columnas repetidas.` };
    }
    vistos.set(n, c.id);
  }

  if (quitar.length) {
    const { data: borrados, error } = await supabase
      .from("campos")
      .delete()
      .in("id", quitar.map((c) => c.id))
      .eq("empresa_id", empresa.id)
      .select("id");
    if (error) return { error: ERROR_GENERAL };
    if ((borrados?.length ?? 0) < quitar.length) {
      refrescar();
      return { error: "Uno de los datos no se pudo quitar todavía. Intenta de nuevo en un rato." };
    }
  }

  const fallas = await Promise.all(
    quedan.map((c, i) =>
      supabase
        .from("campos")
        .update({ orden: i + 1, etiqueta: c.etiqueta })
        .eq("id", c.id)
        .then((r) => r.error),
    ),
  );
  refrescar();
  if (fallas.some(Boolean)) return { error: ERROR_GENERAL };
  return { ok: quitar.length ? "Campos guardados. Quitamos lo que marcaste." : "Campos guardados." };
}

/** Vuelve a poner en la lista un dato de entrada que la empresa quitó. */
export async function recuperarCampo(d: FormData) {
  const { supabase, empresa } = await requerirEmpresa();
  const dato = DATOS_DE_ENTRADA.find((x) => x.clave === d.get("clave"));
  if (!dato) return;
  const { data: actuales } = await supabase.from("campos").select("clave, etiqueta, orden").eq("empresa_id", empresa.id);
  if ((actuales ?? []).some((c) => c.clave === dato.clave)) return;
  const ocupado = (actuales ?? []).some((c) => normalizar(c.etiqueta) === normalizar(dato.etiqueta));
  await supabase.from("campos").insert({
    empresa_id: empresa.id,
    clave: dato.clave,
    etiqueta: ocupado ? `${dato.etiqueta} 2` : dato.etiqueta,
    tipo: dato.tipo,
    cara: dato.cara,
    en_gafete: false,
    de_sistema: true,
    orden: Math.max(0, ...(actuales ?? []).map((c) => c.orden)) + 1,
  });
  refrescar();
}

/** Guarda a dónde lleva el código QR de los gafetes de la empresa. */
export async function guardarQr(_: Resultado, d: FormData): Promise<Resultado> {
  const { supabase, empresa, administra } = await requerirEmpresa();
  if (!administra) return { error: "Solo quien administra la empresa puede cambiar qué muestra el QR." };
  const modo = modosQr.find((m) => m.id === d.get("qr_modo"))?.id;
  if (!modo) return { error: "Elige qué muestra tu QR." };
  const { data: campos } = await supabase.from("campos").select("clave, etiqueta, tipo").eq("empresa_id", empresa.id);
  const claves = (tipos: string[]) => (campos ?? []).filter((c) => tipos.includes(c.tipo)).map((c) => c.clave);

  const cambios: {
    qr_modo: string;
    qr_mostrar?: string[];
    qr_vigencia?: string | null;
    qr_liga?: string;
    qr_dato?: string;
  } = { qr_modo: modo };
  if (modo === "verificacion") {
    const mostrar = datosVerificables(campos ?? [])
      .map((v) => v.clave)
      .filter((clave) => d.get(`mostrar_${clave}`) === "on");
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

