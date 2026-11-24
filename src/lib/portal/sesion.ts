import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { clienteServicio } from "@/lib/supabase/publico";
import { FORMATO_TOKEN, sha256, tokenAleatorio } from "./cripto";
import { COOKIE_PORTAL, DIAS_SESION, RUTA_PORTAL, rutaPortal } from "./reglas";

/**
 * Sesión del portal de empleados. Es una cookie propia (`lg_portal`, solo en
 * /e), independiente de Supabase Auth: un empleado nunca tiene cuenta de
 * empresa ni puede ver nada de /cuenta. En la base solo se guarda el SHA-256
 * de la cookie; al salir o al darse de baja la persona, la sesión muere.
 */

export type MetodoAcceso = "codigo" | "enlace" | "nip";

/** Abre la sesión y deja la cookie. Solo desde acciones del servidor. */
export async function abrirSesion(opts: { empleadoId: string; empresaId: string; metodo: MetodoAcceso }) {
  const servicio = clienteServicio();
  if (!servicio) throw new Error("Falta SUPABASE_SECRET_KEY");
  const token = tokenAleatorio();
  const expira = new Date(Date.now() + DIAS_SESION * 86_400_000);
  const { error } = await servicio.from("sesiones_empleado").insert({
    token_hash: await sha256(token),
    empleado_id: opts.empleadoId,
    empresa_id: opts.empresaId,
    metodo: opts.metodo,
    expira_en: expira.toISOString(),
  });
  if (error) throw error;
  (await cookies()).set(COOKIE_PORTAL, token, {
    path: RUTA_PORTAL,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expira,
  });
}

/** Cierra la sesión de este navegador. */
export async function cerrarSesion() {
  const almacen = await cookies();
  const token = almacen.get(COOKIE_PORTAL)?.value;
  const servicio = clienteServicio();
  if (token && servicio && FORMATO_TOKEN.test(token)) {
    await servicio.from("sesiones_empleado").delete().eq("token_hash", await sha256(token));
  }
  almacen.set(COOKIE_PORTAL, "", { path: RUTA_PORTAL, maxAge: 0 });
}

/** La persona y su empresa según la cookie, o null si no hay sesión válida. */
export const sesionPortal = cache(async () => {
  const token = (await cookies()).get(COOKIE_PORTAL)?.value;
  if (!token || !FORMATO_TOKEN.test(token)) return null;
  const servicio = clienteServicio();
  if (!servicio) return null;
  const { data: sesion } = await servicio
    .from("sesiones_empleado")
    .select("id, empleado_id, empresa_id, metodo, expira_en, visto_en")
    .eq("token_hash", await sha256(token))
    .maybeSingle();
  if (!sesion || new Date(sesion.expira_en) < new Date()) return null;

  const [{ data: persona }, { data: empresa }, { data: acceso }] = await Promise.all([
    servicio
      .from("empleados")
      .select("id, empresa_id, codigo, liga, nombre, numero_empleado, puesto, departamento, tipo_contrato, datos, foto_path, estatus, correo")
      .eq("id", sesion.empleado_id)
      .eq("empresa_id", sesion.empresa_id)
      .maybeSingle(),
    servicio.from("empresas").select("id, nombre, handle, portal_activo, reposicion, liga_foto").eq("id", sesion.empresa_id).maybeSingle(),
    servicio.from("accesos_empleado").select("id_acceso, nip_temporal").eq("empleado_id", sesion.empleado_id).maybeSingle(),
  ]);
  // De baja o con el portal apagado, la sesión ya no sirve.
  if (!persona || persona.estatus === "baja" || !empresa?.portal_activo || !empresa.handle) return null;

  // Se anota la última visita, a lo mucho una vez por hora.
  if (Date.now() - new Date(sesion.visto_en).getTime() > 3_600_000) {
    await servicio.from("sesiones_empleado").update({ visto_en: new Date().toISOString() }).eq("id", sesion.id);
  }
  return {
    servicio,
    persona,
    empresa: { ...empresa, handle: empresa.handle },
    metodo: sesion.metodo as MetodoAcceso,
    acceso,
    /** Entró con un NIP que le dio la empresa: debe cambiarlo antes de seguir. */
    debeCambiarNip: sesion.metodo === "nip" && Boolean(acceso?.nip_temporal),
  };
});

export type SesionPortal = NonNullable<Awaited<ReturnType<typeof sesionPortal>>>;

/** Sesión de esta empresa o, si no, a la pantalla de entrada del portal. */
export async function requerirPortal(handle: string, opciones: { permitirNipTemporal?: boolean } = {}): Promise<SesionPortal> {
  const sesion = await sesionPortal();
  if (!sesion || sesion.empresa.handle !== handle) redirect(rutaPortal(handle));
  if (sesion.debeCambiarNip && !opciones.permitirNipTemporal) redirect(`${rutaPortal(handle)}/nip`);
  return sesion;
}
