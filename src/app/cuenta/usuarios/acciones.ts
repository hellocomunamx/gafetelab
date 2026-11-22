"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { correoInvitacion } from "@/lib/cuenta/correo-invitacion";
import { LARGO_MINIMO_CONTRASENA, rolesInvitables } from "@/lib/cuenta/roles";
import {
  COOKIE_EMPRESA,
  origenSolicitud,
  recordarEmpresa,
  requerirEmpresa,
  requerirUsuario,
} from "@/lib/cuenta/sesion";
import type { Resultado } from "@/lib/cuenta/tipos";
import { correoActivo, enviarCorreo } from "@/lib/correo";
import { site } from "@/lib/site";
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

/** Invita a un correo a la empresa activa y le avisa por correo. */
export async function invitarUsuario(_: Resultado, d: FormData): Promise<Resultado> {
  const { supabase, usuario, empresa, rol } = await requerirEmpresa();
  const correo = String(d.get("correo") ?? "").trim().toLowerCase();
  if (correo.length > 254 || !CORREO_VALIDO.test(correo)) return { error: "Escribe un correo válido." };
  const rolNuevo = rolesInvitables(rol).find((r) => r === d.get("rol"));
  if (!rolNuevo) return { error: "No tienes permiso para invitar con ese rol." };

  const { error } = await supabase.rpc("invitar_usuario", {
    p_empresa: empresa.id,
    p_correo: correo,
    p_rol: rolNuevo,
  });
  if (error) return { error: CON_MENSAJE.includes(error.code) ? error.message : ERROR_GENERAL };
  refrescar();

  const liga = `${await origenSolicitud()}/entrar?correo=${encodeURIComponent(correo)}`;
  const aviso = `Avísale que entre a ${site.dominio}/entrar con ese correo para aceptarla.`;
  if (!correoActivo()) return { ok: `Invitación guardada para ${correo}. ${aviso}` };
  const { data: perfil } = await supabase.from("perfiles").select("nombre").eq("id", usuario.id).maybeSingle();
  const mensaje = correoInvitacion({
    empresa: empresa.nombre,
    rol: rolNuevo,
    invita: perfil?.nombre || usuario.email || "Alguien de tu empresa",
    liga,
  });
  const envio = await enviarCorreo({ para: correo, ...mensaje });
  if (envio.error) {
    console.error("No se pudo enviar la invitación:", envio.error);
    return { ok: `Invitación guardada para ${correo}, pero no pudimos enviarle el correo. ${aviso}` };
  }
  return { ok: `Invitación enviada a ${correo}.` };
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
  const { error } = await supabase.rpc("quitar_usuario", { p_empresa: empresa.id, p_usuario: usuarioId });
  refrescar();
  if (!error && usuarioId === usuario.id) {
    (await cookies()).delete(COOKIE_EMPRESA);
    redirect("/cuenta");
  }
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
