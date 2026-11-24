"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { correoAccesoRetirado, correoInvitacion } from "@/lib/cuenta/correo-invitacion";
import { empresasParaInvitar } from "@/lib/cuenta/invitar";
import { LARGO_MINIMO_CONTRASENA } from "@/lib/cuenta/roles";
import {
  COOKIE_EMPRESA,
  origenSolicitud,
  recordarEmpresa,
  requerirEmpresa,
  requerirUsuario,
} from "@/lib/cuenta/sesion";
import type { Resultado } from "@/lib/cuenta/tipos";
import { correoActivo, enviarCorreo } from "@/lib/correo";
import { CORREO_VALIDO } from "@/lib/solicitudes";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ERROR_GENERAL = "No pudimos guardar. Intenta de nuevo.";
/** Códigos con los que la base de datos manda un mensaje pensado para la persona. */
const CON_MENSAJE = ["P0001", "42501"];
const refrescar = () => revalidatePath("/cuenta", "layout");
const id = (d: FormData, clave = "id") => {
  const v = String(d.get(clave) ?? "");
  return UUID.test(v) ? v : null;
};

// --- Usuarios de la empresa ------------------------------------------------

/**
 * Invita a un correo a una o varias empresas, con un rol en cada una, y le
 * manda un solo correo con la liga a su pantalla de invitación.
 */
export async function invitarUsuario(_: Resultado, d: FormData): Promise<Resultado> {
  const { supabase, usuario, empresa } = await requerirEmpresa();
  const correo = String(d.get("correo") ?? "").trim().toLowerCase();
  if (correo.length > 254 || !CORREO_VALIDO.test(correo)) return { error: "Escribe un correo válido." };

  const posibles = await empresasParaInvitar();
  // Con una sola empresa el formulario no muestra la lista: va a la activa.
  const marcadas = d.getAll("empresa").map(String);
  const elegidas = posibles.filter((e) => (marcadas.length ? marcadas.includes(e.id) : e.id === empresa.id));
  if (!elegidas.length) return { error: "Elige al menos una empresa." };

  const invitadas: { id: string; empresa: string; rol: "administrador" | "editor" }[] = [];
  const fallas: string[] = [];
  for (const e of elegidas) {
    const rol = e.roles.find((r) => r === (d.get(`rol_${e.id}`) ?? d.get("rol")));
    if (!rol) {
      fallas.push(`${e.nombre}: no tienes permiso para invitar con ese rol.`);
      continue;
    }
    const { data, error } = await supabase.rpc("invitar_usuario", { p_empresa: e.id, p_correo: correo, p_rol: rol });
    if (error || !data) fallas.push(`${e.nombre}: ${error && CON_MENSAJE.includes(error.code) ? error.message : ERROR_GENERAL}`);
    else invitadas.push({ id: data, empresa: e.nombre, rol });
  }
  refrescar();
  if (!invitadas.length) return { error: fallas.join(" ") };

  const nombres = invitadas.map((i) => i.empresa).join(", ");
  const pendientes = fallas.length ? ` No se pudo en ${fallas.join(" ")}` : "";
  const envio = await mandarCorreoInvitacion(supabase, usuario, correo, invitadas);
  const aviso = `Mándale esta liga para que cree su cuenta o entre: ${envio.liga}`;
  if (envio.estado === "apagado") return { ok: `Invitación guardada para ${correo} (${nombres}). ${aviso}${pendientes}` };
  if (envio.estado === "fallo") {
    return { ok: `Invitación guardada para ${correo}, pero no pudimos enviarle el correo. ${aviso}${pendientes}` };
  }
  return { ok: `Invitación enviada a ${correo} (${nombres}).${pendientes}` };
}

type Invitada = { id: string; empresa: string; rol: "administrador" | "editor" };

/** Manda el correo de invitación con la liga a la pantalla de la primera invitación. */
async function mandarCorreoInvitacion(
  supabase: Awaited<ReturnType<typeof requerirEmpresa>>["supabase"],
  usuario: { id: string; email?: string },
  correo: string,
  invitadas: Invitada[],
): Promise<{ liga: string; estado: "enviado" | "apagado" | "fallo" }> {
  const liga = `${await origenSolicitud()}/invitacion/${invitadas[0].id}`;
  if (!correoActivo()) return { liga, estado: "apagado" };
  const { data: perfil } = await supabase.from("perfiles").select("nombre").eq("id", usuario.id).maybeSingle();
  const mensaje = correoInvitacion({
    empresas: invitadas.map(({ empresa: nombre, rol }) => ({ nombre, rol })),
    invita: perfil?.nombre || usuario.email || "Alguien de tu empresa",
    liga,
  });
  const envio = await enviarCorreo({ para: correo, ...mensaje });
  if (envio.error) {
    console.error("No se pudo enviar la invitación:", envio.error);
    return { liga, estado: "fallo" };
  }
  return { liga, estado: "enviado" };
}

/** Vuelve a mandar el correo de una invitación pendiente de la empresa activa. */
export async function reenviarInvitacion(_: Resultado, d: FormData): Promise<Resultado> {
  const { supabase, usuario, empresa, administra } = await requerirEmpresa();
  const invitacion = id(d);
  if (!invitacion || !administra) return { error: "No tienes permiso para reenviar invitaciones." };
  const { data: inv } = await supabase
    .from("invitaciones")
    .select("correo, rol, creado_en")
    .eq("id", invitacion)
    .eq("empresa_id", empresa.id)
    .maybeSingle();
  if (!inv) return { error: "Esa invitación ya no está pendiente." };
  if (Date.now() - new Date(inv.creado_en).getTime() < 60_000) {
    return { error: "Acabas de enviarla. Espera un minuto para reenviarla." };
  }
  const rol = inv.rol === "administrador" ? "administrador" : "editor";
  // Renueva la fecha de envío; la invitación conserva su id y su liga.
  const { data, error } = await supabase.rpc("invitar_usuario", { p_empresa: empresa.id, p_correo: inv.correo, p_rol: rol });
  if (error || !data) return { error: error && CON_MENSAJE.includes(error.code) ? error.message : ERROR_GENERAL };
  refrescar();
  const envio = await mandarCorreoInvitacion(supabase, usuario, inv.correo, [{ id: data, empresa: empresa.nombre, rol }]);
  if (envio.estado === "enviado") return { ok: "Reenviada." };
  return { error: `No pudimos enviar el correo. Mándale esta liga: ${envio.liga}` };
}

export async function cancelarInvitacion(d: FormData) {
  const { supabase, empresa } = await requerirEmpresa();
  const invitacion = id(d);
  if (invitacion) {
    await supabase.from("invitaciones").delete().eq("id", invitacion).eq("empresa_id", empresa.id);
  }
  refrescar();
}

export async function cambiarRol(d: FormData) {
  const { supabase, empresa } = await requerirEmpresa();
  const usuarioId = id(d, "usuario");
  const rol = d.get("rol");
  if (usuarioId && (rol === "administrador" || rol === "editor")) {
    await supabase.rpc("cambiar_rol_usuario", { p_empresa: empresa.id, p_usuario: usuarioId, p_rol: rol });
  }
  refrescar();
}

/** Quita el acceso de alguien o, si es el propio, sale de la empresa. */
export async function quitarUsuario(d: FormData) {
  const { supabase, usuario, empresa } = await requerirEmpresa();
  const usuarioId = id(d);
  if (!usuarioId) return;
  // Su correo se lee antes de quitarlo: después ya no aparece en la lista.
  const quitado =
    usuarioId === usuario.id
      ? null
      : ((await supabase.rpc("usuarios_de", { p_empresa: empresa.id })).data ?? []).find((u) => u.usuario_id === usuarioId);
  const { error } = await supabase.rpc("quitar_usuario", { p_empresa: empresa.id, p_usuario: usuarioId });
  refrescar();
  if (!error && usuarioId === usuario.id) {
    (await cookies()).delete(COOKIE_EMPRESA);
    redirect("/cuenta");
  }
  if (!error && quitado?.correo && correoActivo()) await avisarAccesoRetirado(supabase, usuario, empresa.nombre, quitado.correo);
}

/** Avisa por correo a quien le quitaron el acceso. Si falla, no detiene nada. */
async function avisarAccesoRetirado(
  supabase: Awaited<ReturnType<typeof requerirEmpresa>>["supabase"],
  usuario: { id: string; email?: string },
  empresa: string,
  correo: string,
) {
  const { data: perfil } = await supabase.from("perfiles").select("nombre").eq("id", usuario.id).maybeSingle();
  const mensaje = correoAccesoRetirado({
    empresa,
    quien: perfil?.nombre || usuario.email || `Quien administra ${empresa}`,
    contacto: perfil?.nombre ? (usuario.email ?? null) : null,
    liga: `${await origenSolicitud()}/cuenta`,
  });
  const envio = await enviarCorreo({ para: correo, ...mensaje });
  if (envio.error) console.error("No se pudo avisar del acceso retirado:", envio.error);
}

// --- Invitaciones que me hicieron ------------------------------------------

export async function aceptarInvitacion(d: FormData) {
  const { supabase } = await requerirUsuario();
  const invitacion = id(d);
  if (invitacion) {
    const { data } = await supabase.rpc("aceptar_invitacion", { p_invitacion: invitacion });
    if (data) await recordarEmpresa(data);
  }
  refrescar();
  redirect("/cuenta");
}

export async function rechazarInvitacion(d: FormData) {
  const { supabase } = await requerirUsuario();
  const invitacion = id(d);
  // La regla de acceso solo deja borrar las invitaciones dirigidas a mi correo.
  if (invitacion) await supabase.from("invitaciones").delete().eq("id", invitacion);
  refrescar();
  redirect("/cuenta/invitaciones");
}

// --- Mi acceso ---------------------------------------------------------------

export async function guardarPerfil(_: Resultado, d: FormData): Promise<Resultado> {
  const { supabase, usuario } = await requerirUsuario();
  const nombre = String(d.get("nombre") ?? "").trim().slice(0, 120);
  const { error } = await supabase.from("perfiles").upsert({ id: usuario.id, nombre: nombre || null });
  if (error) return { error: ERROR_GENERAL };
  refrescar();
  return { ok: "Guardado." };
}

/** Enciende o apaga las novedades y promociones. Es de cada persona, no de la empresa. */
export async function guardarPublicidad(_: Resultado, d: FormData): Promise<Resultado> {
  const { supabase, usuario } = await requerirUsuario();
  const quiere = d.get("publicidad") === "on";
  const { error } = await supabase.from("perfiles").upsert({ id: usuario.id, publicidad: quiere });
  if (error) return { error: ERROR_GENERAL };
  refrescar();
  return { ok: quiere ? "Listo. Te mandaremos novedades y promociones." : "Listo. Ya no te mandaremos promociones." };
}

/** Crea o cambia la contraseña de la cuenta. La liga y el código por correo siguen funcionando. */
export async function guardarContrasena(_: Resultado, d: FormData): Promise<Resultado> {
  const { supabase } = await requerirUsuario();
  const contrasena = String(d.get("contrasena") ?? "");
  if (contrasena.length < LARGO_MINIMO_CONTRASENA) {
    return { error: `Usa al menos ${LARGO_MINIMO_CONTRASENA} caracteres.` };
  }
  if (contrasena.length > 72) return { error: "Usa 72 caracteres o menos." };
  if (contrasena !== String(d.get("repetir") ?? "")) return { error: "Las dos contraseñas no coinciden." };

  const { error } = await supabase.auth.updateUser({
    password: contrasena,
    data: { con_contrasena: true },
  });
  if (error) {
    if (error.code === "same_password") return { error: "Esa ya es tu contraseña. Escribe una distinta." };
    if (error.code === "weak_password") return { error: "Esa contraseña es muy fácil de adivinar. Prueba con otra." };
    if (error.code === "reauthentication_needed") {
      return { error: "Por seguridad, sal, vuelve a entrar con tu liga por correo y cámbiala enseguida." };
    }
    return { error: ERROR_GENERAL };
  }
  refrescar();
  return { ok: "Listo. Ya puedes entrar con tu correo y tu contraseña." };
}
