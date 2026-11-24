import { notFound } from "next/navigation";
import { cache } from "react";
import { requerirUsuario } from "@/lib/cuenta/sesion";
import { clienteServicio } from "@/lib/supabase/publico";
import { crearClienteServidor } from "@/lib/supabase/server";

/** ¿La sesión es de alguien que administra la plataforma? Si la consulta falla, no. */
export const esAdminPlataforma = cache(async () => {
  const { supabase } = await requerirUsuario();
  const { data } = await supabase.rpc("es_admin_plataforma");
  return data === true;
});

/**
 * Solo para quien administra LaGafetería. A cualquier otra persona, con sesión
 * o sin ella, le responde "no existe", para no anunciar que hay un panel.
 *
 * `servicio` es el cliente con la llave secreta, que ve los datos de todas las
 * empresas: se crea hasta después de comprobar que es administradora. Es null
 * si falta SUPABASE_SECRET_KEY.
 */
export const requerirAdmin = cache(async () => {
  const sesion = await crearClienteServidor();
  const { data } = await sesion.auth.getUser();
  if (!data.user) notFound();
  const { data: es } = await sesion.rpc("es_admin_plataforma");
  if (es !== true) notFound();
  // La administradora también acepta los términos, como cualquier cuenta.
  const { supabase, usuario } = await requerirUsuario();
  return { supabase, usuario, servicio: clienteServicio() };
});
