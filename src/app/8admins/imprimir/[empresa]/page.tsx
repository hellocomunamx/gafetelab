import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ImprimirGafetes,
  type CaraListaParaImprimir,
  type FuenteDeImpresion,
  type PersonaParaImprimir,
} from "@/components/admin/ImprimirGafetes";
import { palabrasSensibles, textosDeDiseno } from "@/lib/admin/alertas";
import { RUTA_ADMIN } from "@/lib/admin/ruta";
import { requerirAdmin } from "@/lib/admin/sesion";
import { camposDe } from "@/lib/cuenta/consultas";
import { ligasDe } from "@/lib/cuenta/fotos";
import { contenidoQr } from "@/lib/cuenta/qr";
import { datosDePersona, disenoDeFila, faltantes } from "@/lib/diseno/datos";
import { rutasDe } from "@/lib/diseno/limpiar";

export const metadata: Metadata = { title: "PDF de impresión" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIMITE = 5000;
const chip = (activo: boolean) =>
  `rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
    activo ? "border-tinta bg-tinta text-white" : "border-linea bg-white hover:border-tinta"
  }`;
const formato = (ruta: string) => (ruta.toLowerCase().endsWith(".png") ? "png" : "jpg");

export default async function Imprimir({
  params,
  searchParams,
}: {
  params: Promise<{ empresa: string }>;
  searchParams: Promise<{ fuente?: string }>;
}) {
  const { empresa: empresaId } = await params;
  if (!UUID.test(empresaId)) notFound();
  const { servicio } = await requerirAdmin();
  if (!servicio) {
    return (
      <p role="alert" className="rounded-tarjeta border border-rojo/30 bg-white p-4">
        Falta configurar <code>SUPABASE_SECRET_KEY</code> en el servidor para armar los PDF de impresión.
      </p>
    );
  }

  const [{ data: empresa }, campos, { data: disenos }, { data: equipo }, { data: listos }] = await Promise.all([
    servicio
      .from("empresas")
      .select("id, nombre, qr_modo, qr_mostrar, qr_vigencia, qr_liga, qr_dato")
      .eq("id", empresaId)
      .maybeSingle(),
    camposDe(servicio, empresaId),
    servicio
      .from("disenos")
      .select("id, nombre, orientacion, frente, vuelta, predeterminado")
      .eq("empresa_id", empresaId)
      .order("predeterminado", { ascending: false })
      .order("creado_en"),
    servicio
      .from("empleados")
      .select("id, codigo, nombre, numero_empleado, puesto, departamento, tipo_contrato, datos, foto_path")
      .eq("empresa_id", empresaId)
      .eq("estatus", "activo")
      .order("nombre")
      .limit(LIMITE),
    servicio.from("gafetes_listos").select("*").eq("empresa_id", empresaId),
  ]);
  if (!empresa) notFound();

  const activos = equipo ?? [];
  const elegida = (await searchParams).fuente;
  const fila =
    elegida === "listos" ? undefined : (disenos?.find((d) => d.id === elegida) ?? (listos?.length && !disenos?.length ? undefined : disenos?.[0]));
  const usaListos = !fila && Boolean(listos?.length);

  let fuente: FuenteDeImpresion | null = null;
  let personas: PersonaParaImprimir[] = [];
  let alertas: string[] = [];

  if (fila) {
    const diseno = disenoDeFila(fila);
    const etiquetas = Object.fromEntries(campos.map((c) => [c.clave, c.etiqueta]));
    const [imagenes, fotos] = await Promise.all([
      ligasDe(servicio, "disenos", [...rutasDe(diseno.frente), ...rutasDe(diseno.vuelta)]),
      ligasDe(servicio, "fotos", activos.map((p) => p.foto_path)),
    ]);
    fuente = { tipo: "diseno", diseno, etiquetas, imagenes: Object.fromEntries(imagenes) };
    personas = activos.map((p) => {
      const datos = datosDePersona(p, campos);
      const qr = contenidoQr(empresa, { codigo: p.codigo, valores: datos });
      const foto = (p.foto_path && fotos.get(p.foto_path)) || undefined;
      return {
        id: p.id,
        nombre: p.nombre,
        numero: p.numero_empleado,
        datos,
        qr,
        foto,
        faltan: faltantes(diseno, datos, Boolean(foto), campos, qr),
      };
    });
    alertas = palabrasSensibles([
      empresa.nombre,
      ...textosDeDiseno(fila),
      ...activos.flatMap((p) => [p.puesto, p.departamento]),
    ]);
  } else if (usaListos) {
    const porPersona = new Map((listos ?? []).map((g) => [g.empleado_id, g]));
    const ligas = await ligasDe(servicio, "gafetes", (listos ?? []).flatMap((g) => [g.frente_path, g.vuelta_path]));
    const cara = (ruta: string | null, ancho: number | null, alto: number | null): CaraListaParaImprimir | undefined => {
      const url = ruta ? ligas.get(ruta) : undefined;
      return ruta && url && ancho && alto ? { url, formato: formato(ruta), ancho, alto } : undefined;
    };
    fuente = { tipo: "listos" };
    personas = activos.flatMap((p) => {
      const g = porPersona.get(p.id);
      if (!g) return [];
      const frente = cara(g.frente_path, g.frente_ancho, g.frente_alto);
      const vuelta = cara(g.vuelta_path, g.vuelta_ancho, g.vuelta_alto);
      return [{ id: p.id, nombre: p.nombre, numero: p.numero_empleado, frente, vuelta, faltan: frente ? [] : ["El frente"] }];
    });
    alertas = palabrasSensibles([empresa.nombre]);
  }

  return (
    <div className="space-y-5">
      <p className="text-sm">
        <Link href={RUTA_ADMIN} className="underline">Empresas</Link> / {empresa.nombre}
      </p>
      <h1 className="text-3xl font-extrabold">PDF de impresión</h1>

      {(disenos?.length ?? 0) + (listos?.length ? 1 : 0) > 1 ? (
        <nav aria-label="Qué imprimir" className="flex flex-wrap gap-2">
          {(disenos ?? []).map((d) => (
            <Link key={d.id} href={`${RUTA_ADMIN}/imprimir/${empresa.id}?fuente=${d.id}`} aria-current={fila?.id === d.id ? "page" : undefined} className={chip(fila?.id === d.id)}>
              {d.nombre}
            </Link>
          ))}
          {listos?.length ? (
            <Link href={`${RUTA_ADMIN}/imprimir/${empresa.id}?fuente=listos`} aria-current={usaListos ? "page" : undefined} className={chip(usaListos)}>
              Gafetes listos ({listos.length})
            </Link>
          ) : null}
        </nav>
      ) : null}

      {alertas.length ? (
        <p role="alert" className="rounded-tarjeta bg-resaltador/30 p-4 text-sm">
          <strong>Revisa antes de producir.</strong> Aquí se menciona: {alertas.join(", ")}. Confirma que la
          empresa tiene derecho a usar esos nombres.
          {usaListos ? " Además, el texto de estos gafetes ya terminados no se puede leer de forma automática: revísalos a ojo." : ""}
        </p>
      ) : usaListos ? (
        <p className="rounded-tarjeta border border-linea bg-white p-4 text-sm text-gris">
          Estos gafetes los subió la empresa ya terminados y su texto no se puede leer de forma automática.
          Revísalos a ojo antes de producir.
        </p>
      ) : null}

      {fuente && personas.length ? (
        <ImprimirGafetes key={fila?.id ?? "listos"} empresa={empresa.nombre} fuente={fuente} personas={personas} />
      ) : (
        <p className="rounded-tarjeta border border-dashed border-linea bg-white p-8 text-center font-semibold">
          {fuente ? "Esta empresa no tiene personas activas con gafete para imprimir." : "Esta empresa todavía no tiene diseños ni gafetes listos."}
        </p>
      )}
      {activos.length >= LIMITE ? (
        <p className="text-sm text-gris">Se muestran las primeras {LIMITE.toLocaleString("es-MX")} personas activas.</p>
      ) : null}
    </div>
  );
}
