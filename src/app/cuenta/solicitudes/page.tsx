import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Bandeja, type Pendiente, type Seguimiento } from "@/components/portal/Bandeja";
import { ligasDeFotos } from "@/lib/cuenta/fotos";
import { valorDe } from "@/lib/cuenta/ligas";
import { esRequisito, IMPRESO_VIGENTE } from "@/lib/cuenta/reposicion";
import { requerirEmpresa } from "@/lib/cuenta/sesion";
import { esCausa, estadoVisible, type TipoSolicitud } from "@/lib/portal/solicitudes";

export const metadata: Metadata = { title: "Solicitudes" };

const POR_REVISAR = 40;
const ETIQUETAS: Record<string, string> = { nombre: "Nombre", puesto: "Puesto", departamento: "Área o departamento" };
type Persona = { nombre: string; foto_path: string | null; numero_empleado: string | null; puesto: string | null; departamento: string | null; tipo_contrato: string | null; datos: unknown };
const personaDe = (fila: { empleados: unknown }) => fila.empleados as Persona | null;

export default async function Solicitudes({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const { tipo } = await searchParams;
  const filtro = tipo === "foto" || tipo === "datos" || tipo === "reposicion" ? (tipo as TipoSolicitud) : null;
  const { supabase, empresa } = await requerirEmpresa();
  // Los eventos no tienen portal «Mi gafete» ni solicitudes.
  if (empresa.tipo === "evento") redirect("/cuenta/evento");
  const columnasPersona = "empleados(nombre, foto_path, numero_empleado, puesto, departamento, tipo_contrato, datos)";

  const [fotos, otras, campos, ajuste, enCursoFoto, enCursoOtras, resueltasFoto, resueltasOtras] = await Promise.all([
    supabase
      .from("solicitudes_foto")
      .select(`id, empleado_id, foto_path, con_impreso, creado_en, ${columnasPersona}`, { count: "exact" })
      .eq("empresa_id", empresa.id)
      .eq("estado", "pendiente")
      .order("creado_en")
      .limit(POR_REVISAR),
    supabase
      .from("solicitudes_empleado")
      .select(`id, empleado_id, tipo, datos, causa, nota, requisitos, costo, archivo_path, creado_en, ${columnasPersona}`)
      .eq("empresa_id", empresa.id)
      .eq("estado", "pendiente")
      .order("creado_en")
      .limit(POR_REVISAR),
    supabase.from("campos").select("clave, etiqueta").eq("empresa_id", empresa.id),
    supabase.from("empresas").select("portal_activo").eq("id", empresa.id).maybeSingle(),
    supabase.from("solicitudes_foto").select("id, empleado_id, estado, impresion, motivo, resuelto_en, empleados(nombre)").eq("empresa_id", empresa.id).eq("estado", "aprobada").eq("reposicion_apartada", true).or("impresion.is.null,impresion.neq.entregada").order("resuelto_en", { ascending: false }).limit(30),
    supabase.from("solicitudes_empleado").select("id, tipo, empleado_id, estado, impresion, motivo, resuelto_en, empleados(nombre)").eq("empresa_id", empresa.id).eq("estado", "aprobada").eq("reposicion_apartada", true).or("impresion.is.null,impresion.neq.entregada").order("resuelto_en", { ascending: false }).limit(30),
    supabase.from("solicitudes_foto").select("id, empleado_id, estado, impresion, motivo, resuelto_en, reposicion_apartada, empleados(nombre)").eq("empresa_id", empresa.id).in("estado", ["aprobada", "rechazada"]).order("resuelto_en", { ascending: false }).limit(10),
    supabase.from("solicitudes_empleado").select("id, tipo, empleado_id, estado, impresion, motivo, resuelto_en, reposicion_apartada, empleados(nombre)").eq("empresa_id", empresa.id).in("estado", ["aprobada", "rechazada"]).order("resuelto_en", { ascending: false }).limit(10),
  ]);
  const etiquetas = { ...ETIQUETAS, ...Object.fromEntries((campos.data ?? []).map((c) => [c.clave, c.etiqueta])) };

  // Quién tiene hoy un gafete impreso vigente (para ofrecer reimprimir).
  const ids = [...new Set([...(fotos.data ?? []), ...(otras.data ?? [])].map((p) => p.empleado_id))];
  const { data: impresos } = ids.length
    ? await supabase.from("gafetes").select("empleado_id").in("empleado_id", ids).eq("tipo", "impreso").in("estado", IMPRESO_VIGENTE)
    : { data: [] };
  const conImpreso = new Set((impresos ?? []).map((g) => g.empleado_id));
  const ligas = await ligasDeFotos(supabase, [
    ...(fotos.data ?? []).flatMap((f) => [f.foto_path, personaDe(f)?.foto_path ?? null]),
    ...(otras.data ?? []).map((o) => o.archivo_path),
  ]);

  const pendientes: Pendiente[] = [
    ...(fotos.data ?? []).map((f): Pendiente => {
      const persona = personaDe(f);
      return {
        tipo: "foto",
        id: f.id,
        empleadoId: f.empleado_id,
        persona: persona?.nombre ?? "Persona",
        creada: f.creado_en,
        conImpreso: conImpreso.has(f.empleado_id),
        aceptoImpreso: f.con_impreso,
        anterior: persona?.foto_path ? ligas.get(persona.foto_path) : undefined,
        nueva: f.foto_path ? ligas.get(f.foto_path) : undefined,
      };
    }),
    ...(otras.data ?? []).map((o): Pendiente => {
      const persona = personaDe(o);
      const base = { id: o.id, empleadoId: o.empleado_id, persona: persona?.nombre ?? "Persona", creada: o.creado_en, conImpreso: conImpreso.has(o.empleado_id) };
      if (o.tipo === "reposicion") {
        return {
          ...base,
          tipo: "reposicion",
          causa: esCausa(o.causa) ? o.causa : null,
          requisitos: (o.requisitos ?? []).filter(esRequisito),
          costo: o.costo ?? 0,
          nota: o.nota,
          comprobante: o.archivo_path ? ligas.get(o.archivo_path) : undefined,
        };
      }
      const cambios = o.datos && typeof o.datos === "object" && !Array.isArray(o.datos) ? Object.entries(o.datos as Record<string, unknown>) : [];
      return {
        ...base,
        tipo: "datos",
        nota: o.nota,
        cambios: cambios.map(([clave, valor]) => ({
          etiqueta: etiquetas[clave] ?? clave,
          antes: persona ? valorDe(persona, clave) : "",
          despues: typeof valor === "string" ? valor : "",
        })),
      };
    }),
  ].sort((a, b) => a.creada.localeCompare(b.creada));

  const conteo = { foto: 0, datos: 0, reposicion: 0 };
  for (const p of pendientes) conteo[p.tipo] += 1;

  type FilaSeguimiento = { id: string; empleado_id: string; estado: string; impresion: string | null; motivo: string | null; resuelto_en: string | null; empleados: unknown; tipo?: string };
  const seguimiento = (filas: FilaSeguimiento[] | null, tipo: (f: FilaSeguimiento) => TipoSolicitud): Seguimiento[] =>
    (filas ?? []).map((f) => ({
      id: f.id,
      tipo: tipo(f),
      empleadoId: f.empleado_id,
      persona: (f.empleados as { nombre: string } | null)?.nombre ?? "Persona",
      estado: estadoVisible(f),
      fecha: f.resuelto_en ?? "",
      motivo: f.estado === "rechazada" ? f.motivo : null,
    }));
  const tipoOtra = (f: FilaSeguimiento): TipoSolicitud => (f.tipo === "reposicion" ? "reposicion" : "datos");
  const porFecha = (a: Seguimiento, b: Seguimiento) => b.fecha.localeCompare(a.fecha);

  return (
    <Bandeja
      pendientes={filtro ? pendientes.filter((p) => p.tipo === filtro) : pendientes}
      enCurso={[...seguimiento(enCursoFoto.data, () => "foto"), ...seguimiento(enCursoOtras.data, tipoOtra)].sort(porFecha)}
      resueltas={[...seguimiento(resueltasFoto.data, () => "foto"), ...seguimiento(resueltasOtras.data, tipoOtra)].sort(porFecha).slice(0, 12)}
      filtro={filtro}
      conteo={conteo}
      portalActivo={Boolean(ajuste.data?.portal_activo)}
    />
  );
}
