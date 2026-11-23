import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { claseBotonSecundario, claseEntrada } from "@/components/cuenta/clases";
import { GafeteSvg } from "@/components/diseno/GafeteSvg";
import { camposDe } from "@/lib/cuenta/consultas";
import { ligasDe } from "@/lib/cuenta/fotos";
import { contenidoQr, resumenQr } from "@/lib/cuenta/qr";
import { requerirEmpresa } from "@/lib/cuenta/sesion";
import { datosDePersona, disenoDeFila, faltantes } from "@/lib/diseno/datos";
import { rutasDe } from "@/lib/diseno/limpiar";

export const metadata: Metadata = { title: "Vista previa del equipo" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const POR_PAGINA = 24;
const LIMITE = 2000;

export default async function VistaPrevia({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ departamento?: string; q?: string; ver?: string; pagina?: string }>;
}) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const f = await searchParams;
  const { supabase, empresa } = await requerirEmpresa();

  let consulta = supabase
    .from("empleados")
    .select("id, codigo, nombre, numero_empleado, puesto, departamento, tipo_contrato, datos, foto_path")
    .eq("empresa_id", empresa.id)
    .neq("estatus", "baja")
    .order("nombre")
    .limit(LIMITE);
  if (f.departamento) consulta = consulta.eq("departamento", f.departamento);
  const q = f.q?.trim().replace(/[%,()]/g, " ").slice(0, 60);
  if (q) consulta = consulta.or(`nombre.ilike.%${q}%,numero_empleado.ilike.%${q}%,puesto.ilike.%${q}%`);

  const [{ data: fila }, campos, { data: equipo }, { data: todas }] = await Promise.all([
    supabase.from("disenos").select("id, nombre, orientacion, frente, vuelta").eq("id", id).eq("empresa_id", empresa.id).maybeSingle(),
    camposDe(supabase, empresa.id),
    consulta,
    supabase.from("empleados").select("departamento").eq("empresa_id", empresa.id).neq("estatus", "baja"),
  ]);
  if (!fila) notFound();
  const diseno = disenoDeFila(fila);
  const etiquetas = Object.fromEntries(campos.map((c) => [c.clave, c.etiqueta]));
  const departamentos = [...new Set((todas ?? []).map((t) => t.departamento).filter((d): d is string => Boolean(d)))].sort(
    (a, b) => a.localeCompare(b, "es"),
  );

  const personas = (equipo ?? []).map((p) => {
    const datos = datosDePersona(p, campos);
    const qr = contenidoQr(empresa, { codigo: p.codigo, valores: datos });
    return { ...p, datos, qr, faltan: faltantes(diseno, datos, Boolean(p.foto_path), campos, qr) };
  });
  const incompletas = personas.filter((p) => p.faltan.length);
  const soloIncompletas = f.ver === "incompletos";
  const lista = soloIncompletas ? incompletas : personas;
  const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  const pagina = Math.min(paginas, Math.max(1, Number.parseInt(f.pagina ?? "1", 10) || 1));
  const visibles = lista.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const [imagenes, fotos] = await Promise.all([
    ligasDe(supabase, "disenos", [...rutasDe(diseno.frente), ...rutasDe(diseno.vuelta)]),
    ligasDe(supabase, "fotos", visibles.map((p) => p.foto_path)),
  ]);
  const ligasImagenes = Object.fromEntries(imagenes);

  const liga = (cambios: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    const todo = { departamento: f.departamento, q, ver: soloIncompletas ? "incompletos" : undefined, ...cambios };
    for (const [k, v] of Object.entries(todo)) if (v) sp.set(k, v);
    const cola = sp.toString();
    return `/cuenta/disenos/${id}/vista${cola ? `?${cola}` : ""}`;
  };
  const hayFiltros = Boolean(f.departamento || q);
  const vertical = diseno.orientacion === "vertical";
  const pestana = (activa: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-semibold ${activa ? "bg-tinta text-white" : "hover:bg-white"}`;

  return (
    <div className="space-y-5">
      <p className="text-sm">
        <Link href="/cuenta/disenos" className="underline">Diseños</Link> /{" "}
        <Link href={`/cuenta/disenos/${id}`} className="underline">{diseno.nombre}</Link> / Vista previa
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold">Así queda cada gafete</h1>
        <Link href={`/cuenta/disenos/${id}`} className={claseBotonSecundario}>Editar diseño</Link>
      </div>

      <dl className="grid grid-cols-2 gap-4 sm:max-w-md">
        <div className="rounded-tarjeta border border-linea bg-white p-4">
          <dt className="font-titulos text-3xl font-extrabold">{(personas.length - incompletas.length).toLocaleString("es-MX")}</dt>
          <dd className="text-sm text-gris">{personas.length - incompletas.length === 1 ? "gafete listo" : "gafetes listos"}</dd>
        </div>
        <div className="rounded-tarjeta border border-linea bg-white p-4">
          <dt className="font-titulos text-3xl font-extrabold">{incompletas.length.toLocaleString("es-MX")}</dt>
          <dd className="text-sm text-gris">{incompletas.length === 1 ? "le falta algo" : "les falta algo"}</dd>
        </div>
      </dl>

      <form className="grid gap-3 rounded-tarjeta border border-linea bg-white p-4 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
        <label className="block">
          <span className="text-sm font-semibold">Buscar</span>
          <input name="q" defaultValue={q} placeholder="Nombre, número o puesto" className={claseEntrada} />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Departamento</span>
          <select name="departamento" defaultValue={f.departamento ?? ""} className={claseEntrada}>
            <option value="">Todos</option>
            {departamentos.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-3">
          {soloIncompletas ? <input type="hidden" name="ver" value="incompletos" /> : null}
          <button type="submit" className={claseBotonSecundario}>Filtrar</button>
          {hayFiltros ? <Link href={liga({ departamento: undefined, q: undefined })} className="text-sm underline">Limpiar</Link> : null}
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-full bg-linea/60 p-1">
          <Link href={liga({ ver: undefined, pagina: undefined })} aria-current={soloIncompletas ? undefined : "page"} className={pestana(!soloIncompletas)}>
            Todos ({personas.length.toLocaleString("es-MX")})
          </Link>
          <Link href={liga({ ver: "incompletos", pagina: undefined })} aria-current={soloIncompletas ? "page" : undefined} className={pestana(soloIncompletas)}>
            Les falta algo ({incompletas.length.toLocaleString("es-MX")})
          </Link>
        </div>
        {(equipo?.length ?? 0) >= LIMITE ? (
          <p className="text-sm text-gris">Se revisan las primeras {LIMITE.toLocaleString("es-MX")} personas: filtra por departamento.</p>
        ) : null}
      </div>

      {visibles.length ? (
        <ul className={`grid gap-5 ${vertical ? "grid-cols-2 md:grid-cols-3 xl:grid-cols-4" : "sm:grid-cols-2 xl:grid-cols-3"}`}>
          {visibles.map((p) => (
            <li key={p.id} className="flex flex-col rounded-tarjeta border border-linea bg-white p-3">
              <div className={`grid gap-2 rounded-tarjeta-chica bg-papel p-3 ${diseno.vuelta && vertical ? "grid-cols-2" : ""}`}>
                <GafeteSvg
                  cara={diseno.frente}
                  orientacion={diseno.orientacion}
                  datos={p.datos}
                  etiquetas={etiquetas}
                  foto={(p.foto_path && fotos.get(p.foto_path)) || null}
                  qr={p.qr}
                  imagenes={ligasImagenes}
                  titulo={`Gafete de ${p.nombre}, frente`}
                  className="w-full drop-shadow"
                />
                {diseno.vuelta ? (
                  <GafeteSvg
                    cara={diseno.vuelta}
                    orientacion={diseno.orientacion}
                    datos={p.datos}
                    etiquetas={etiquetas}
                    foto={(p.foto_path && fotos.get(p.foto_path)) || null}
                  qr={p.qr}
                    imagenes={ligasImagenes}
                    titulo={`Gafete de ${p.nombre}, vuelta`}
                    className="w-full drop-shadow"
                  />
                ) : null}
              </div>
              <Link href={`/cuenta/equipo/${p.id}`} className="mt-2 font-semibold hover:underline">{p.nombre}</Link>
              {p.faltan.length ? (
                <p className="mt-1 rounded-tarjeta-chica bg-resaltador/30 px-2.5 py-1.5 text-sm">
                  Le falta: {p.faltan.join(", ").toLocaleLowerCase("es-MX").replaceAll("código qr", "código QR")}.{" "}
                  <Link href={`/cuenta/equipo/${p.id}`} className="font-semibold underline underline-offset-4">Completar</Link>
                </p>
              ) : (
                <p className="mt-1 text-sm text-[#0a7d4f]">Listo para imprimir</p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-tarjeta border border-dashed border-linea bg-white p-8 text-center">
          <p className="font-semibold">
            {soloIncompletas && personas.length
              ? "A nadie le falta nada. Todos los gafetes están listos."
              : hayFiltros
                ? "Nadie coincide con estos filtros."
                : "Todavía no hay nadie en tu equipo."}
          </p>
          {personas.length || hayFiltros ? null : (
            <Link href="/cuenta/equipo/importar" className="mt-2 inline-block font-semibold text-rojo underline underline-offset-4">
              Subir a mi equipo con Excel
            </Link>
          )}
        </div>
      )}

      {paginas > 1 ? (
        <nav aria-label="Páginas" className="flex items-center justify-center gap-4 text-sm">
          {pagina > 1 ? (
            <Link href={liga({ pagina: String(pagina - 1) })} className="font-semibold underline underline-offset-4">Anterior</Link>
          ) : null}
          <span className="text-gris">Página {pagina} de {paginas}</span>
          {pagina < paginas ? (
            <Link href={liga({ pagina: String(pagina + 1) })} className="font-semibold underline underline-offset-4">Siguiente</Link>
          ) : null}
        </nav>
      ) : null}

      <p className="text-sm text-gris">
        El código QR de cada gafete ya es el de esa persona. {resumenQr(empresa, etiquetas)} Lo cambias en{" "}
        <Link href="/cuenta/campos#qr" className="underline">Qué muestra tu QR</Link>. Si un texto largo no cabe, la
        letra se reduce sola para que entre.
      </p>
    </div>
  );
}
