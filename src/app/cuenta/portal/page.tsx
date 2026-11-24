import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ConfigPortal, type PersonaAcceso } from "@/components/portal/ConfigPortal";
import { requerirEmpresa } from "@/lib/cuenta/sesion";
import { estadoBloqueo, sugerirHandle, urlPortal } from "@/lib/portal/reglas";

export const metadata: Metadata = { title: "Portal Mi gafete" };

const MAXIMO = 500;

export default async function PortalEmpresa() {
  const { supabase, empresa, administra } = await requerirEmpresa();
  // Los eventos no tienen portal «Mi gafete» ni solicitudes.
  if (empresa.tipo === "evento") redirect("/cuenta/evento");
  const [{ data: ajuste }, { data: personas, count }, { data: accesos }] = await Promise.all([
    supabase.from("empresas").select("handle, portal_activo").eq("id", empresa.id).maybeSingle(),
    supabase
      .from("empleados")
      .select("id, nombre, numero_empleado, correo", { count: "exact" })
      .eq("empresa_id", empresa.id)
      .eq("estatus", "activo")
      .order("nombre")
      .limit(MAXIMO),
    supabase.from("accesos_empleado").select("empleado_id, id_acceso, nip_temporal, bloqueado_hasta, ultimo_ingreso").eq("empresa_id", empresa.id),
  ]);
  const porPersona = new Map((accesos ?? []).map((a) => [a.empleado_id, a]));
  const lista: PersonaAcceso[] = (personas ?? []).map((p) => {
    const a = porPersona.get(p.id);
    return {
      id: p.id,
      nombre: p.nombre,
      numero: p.numero_empleado,
      correo: p.correo,
      acceso: a
        ? {
            idAcceso: a.id_acceso,
            temporal: a.nip_temporal,
            bloqueado: estadoBloqueo(a.bloqueado_hasta),
            ultimoIngreso: a.ultimo_ingreso,
          }
        : null,
    };
  });
  const handle = ajuste?.handle ?? null;
  return (
    <ConfigPortal
      empresa={empresa.nombre}
      handle={handle}
      sugerido={sugerirHandle(empresa.nombre)}
      activo={Boolean(ajuste?.portal_activo)}
      administra={administra}
      url={handle ? urlPortal(handle) : null}
      personas={lista}
      total={count ?? lista.length}
    />
  );
}
