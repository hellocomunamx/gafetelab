import { notFound, redirect } from "next/navigation";
import { InicioPortal } from "@/components/portal/InicioPortal";
import { PantallaEntrada } from "@/components/portal/PantallaEntrada";
import { gafeteDigitalDe } from "@/lib/cuenta/gafete-digital";
import { FORMATO_HANDLE, rutaPortal } from "@/lib/portal/reglas";
import { solicitudesDePersona } from "@/lib/portal/servidor";
import { sesionPortal } from "@/lib/portal/sesion";
import { clienteServicio } from "@/lib/supabase/publico";
import { verificarGafete } from "@/lib/verificacion";

export const dynamic = "force-dynamic";

const ERRORES: Record<string, string> = {
  liga: "Esa liga ya se usó o venció. Pide un código nuevo.",
  limite: "Recibimos muchos intentos seguidos. Espera un minuto y vuelve a intentar.",
};
const AVISOS: Record<string, string> = {
  datos: "Listo. Mandamos tu corrección; te avisamos cuando la revisen.",
  reposicion: "Listo. Mandamos tu solicitud de reposición; te avisamos cuando la revisen.",
  foto: "Listo. Mandamos tu foto nueva; te avisamos cuando la revisen.",
};

export default async function PortalEmpresa({
  params,
  searchParams,
}: {
  params: Promise<{ empresa: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { empresa: handle } = await params;
  const consulta = await searchParams;
  if (!FORMATO_HANDLE.test(handle)) notFound();

  const sesion = await sesionPortal();
  if (sesion && sesion.empresa.handle === handle) {
    if (sesion.debeCambiarNip) redirect(`${rutaPortal(handle)}/nip`);
    const { servicio, persona, empresa } = sesion;
    const [digital, solicitudes] = await Promise.all([
      gafeteDigitalDe(servicio, persona),
      solicitudesDePersona(servicio, persona.id, empresa.id),
    ]);
    const verificado = digital?.verificable ? await verificarGafete(persona.codigo) : null;
    const enviada = typeof consulta.enviada === "string" ? AVISOS[consulta.enviada] : null;
    const aviso = enviada ?? (consulta.nip === "listo" ? "Listo. Tu NIP nuevo quedó guardado." : null);
    const pendiente = (tipo: string) => solicitudes.some((s) => s.tipo === tipo && s.estado === "enviada");
    return (
      <InicioPortal
        handle={handle}
        empresa={empresa.nombre}
        nombre={persona.nombre}
        conNip={sesion.metodo === "nip"}
        digital={digital}
        sello={verificado?.estado ?? null}
        solicitudes={solicitudes}
        aviso={aviso}
        pendientes={{ datos: pendiente("datos"), reposicion: pendiente("reposicion"), foto: pendiente("foto") }}
      />
    );
  }

  const servicio = clienteServicio();
  const { data: empresa } = servicio
    ? await servicio.from("empresas").select("nombre").eq("handle", handle).eq("portal_activo", true).maybeSingle()
    : { data: null };
  if (!empresa) notFound();
  const error = typeof consulta.error === "string" ? ERRORES[consulta.error] : null;

  return <PantallaEntrada handle={handle} empresa={empresa.nombre} error={error} />;
}
