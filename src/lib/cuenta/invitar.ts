import { rolesInvitables } from "@/lib/cuenta/roles";
import { type Rol, requerirEmpresa } from "@/lib/cuenta/sesion";

/** Empresas donde la persona puede invitar, con los roles que puede dar en cada una. */
export async function empresasParaInvitar() {
  const { supabase, usuario, empresas } = await requerirEmpresa();
  const { data: membresias } = await supabase.from("miembros").select("empresa_id, rol").eq("usuario_id", usuario.id);
  return empresas
    .map((e) => {
      const rol = membresias?.find((m) => m.empresa_id === e.id)?.rol as Rol | undefined;
      return { id: e.id, nombre: e.nombre, roles: rol ? rolesInvitables(rol) : [] };
    })
    .filter((e) => e.roles.length > 0);
}
