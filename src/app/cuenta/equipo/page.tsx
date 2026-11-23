import type { Metadata } from "next";
import Link from "next/link";
import { Estatus } from "@/components/cuenta/Entrada";
import { claseBoton, claseBotonSecundario, claseEntrada } from "@/components/cuenta/Formulario";
import { estatusEmpleado } from "@/lib/cuenta/catalogos";
import { ligasDeFotos } from "@/lib/cuenta/fotos";
import { requerirEmpresa } from "@/lib/cuenta/sesion";

export const metadata: Metadata = { title: "Equipo" };

const LIMITE = 500;

export default async function Equipo({
  searchParams,
}: {
  searchParams: Promise<{ estatus?: string; departamento?: string; contrato?: string; foto?: string; q?: string }>;
}) {
  const { supabase, empresa } = await requerirEmpresa();
  const f = await searchParams;

  let consulta = supabase
    .from("empleados")
    .select("id, numero_empleado, nombre, puesto, departamento, tipo_contrato, estatus, foto_path, gafetes(count)", {
      count: "exact",
    })
    .eq("empresa_id", empresa.id)
    .order("nombre")
    .limit(LIMITE);
  if (f.estatus && estatusEmpleado.some((e) => e.id === f.estatus)) consulta = consulta.eq("estatus", f.estatus);
  if (f.departamento) consulta = consulta.eq("departamento", f.departamento);
  if (f.contrato) consulta = consulta.eq("tipo_contrato", f.contrato);
  if (f.foto === "sin") consulta = consulta.is("foto_path", null);
  const q = f.q?.trim().replace(/[%,()]/g, " ").slice(0, 60);
  if (q) consulta = consulta.or(`nombre.ilike.%${q}%,numero_empleado.ilike.%${q}%,puesto.ilike.%${q}%`);

  const [{ data: personas, count }, { data: todas }, { count: porAprobar }] = await Promise.all([
    consulta,
    supabase.from("empleados").select("departamento, tipo_contrato").eq("empresa_id", empresa.id),
    supabase.from("propuestas").select("empleado_id", { count: "exact", head: true }).eq("empresa_id", empresa.id).eq("estado", "pendiente"),
  ]);
  const unicos = (valores: (string | null)[]) =>
    [...new Set(valores.filter((v): v is string => Boolean(v)))].sort((a, b) => a.localeCompare(b, "es"));
  const departamentos = unicos((todas ?? []).map((t) => t.departamento));
  const contratos = unicos((todas ?? []).map((t) => t.tipo_contrato));
  const fotos = await ligasDeFotos(supabase, (personas ?? []).map((p) => p.foto_path));
  const hayFiltros = Boolean(f.estatus || f.departamento || f.contrato || f.foto || q);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold">Equipo</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/cuenta/equipo/importar" className={claseBotonSecundario}>Importar Excel</Link>
          <Link href="/cuenta/equipo/fotos" className={claseBotonSecundario}>Subir fotos</Link>
          <Link href="/cuenta/equipo/ligas" className={claseBotonSecundario}>Liga por persona</Link>
          <Link href="/cuenta/equipo/nuevo" className={claseBoton}>Agregar persona</Link>
        </div>
      </div>

      {porAprobar ? (
        <p className="rounded-tarjeta border border-linea bg-resaltador/30 px-4 py-3 text-sm">
          {porAprobar === 1 ? "1 persona mandó" : `${porAprobar.toLocaleString("es-MX")} personas mandaron`} sus datos desde su liga y{" "}
          {porAprobar === 1 ? "espera" : "esperan"} tu aprobación.{" "}
          <Link href="/cuenta/equipo/ligas" className="font-semibold underline underline-offset-4">Revisar</Link>
        </p>
      ) : null}

      <form className="grid gap-3 rounded-tarjeta border border-linea bg-white p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] lg:items-end">
        <label className="block">
          <span className="text-sm font-semibold">Buscar</span>
          <input name="q" defaultValue={q} placeholder="Nombre, número o puesto" className={claseEntrada} />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Estatus</span>
          <select name="estatus" defaultValue={f.estatus ?? ""} className={claseEntrada}>
            <option value="">Todos</option>
            {estatusEmpleado.map((e) => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>
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
        <label className="block">
          <span className="text-sm font-semibold">Tipo de contrato</span>
          <select name="contrato" defaultValue={f.contrato ?? ""} className={claseEntrada}>
            <option value="">Todos</option>
            {contratos.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-3">
          {f.foto === "sin" ? <input type="hidden" name="foto" value="sin" /> : null}
          <button type="submit" className={claseBotonSecundario}>Filtrar</button>
          {hayFiltros ? <Link href="/cuenta/equipo" className="text-sm underline">Limpiar</Link> : null}
        </div>
      </form>

      <p className="text-sm text-gris">
        {(count ?? 0).toLocaleString("es-MX")} {count === 1 ? "persona" : "personas"}
        {f.foto === "sin" ? " sin fotografía" : ""}
        {hayFiltros ? " con estos filtros" : ""}
        {(count ?? 0) > LIMITE ? `. Se muestran las primeras ${LIMITE}: usa los filtros para acotar.` : ""}
      </p>

      {personas?.length ? (
        <div className="overflow-x-auto rounded-tarjeta border border-linea bg-white">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="bg-papel">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Persona</th>
                <th scope="col" className="px-4 py-3 font-semibold">Número</th>
                <th scope="col" className="px-4 py-3 font-semibold">Puesto</th>
                <th scope="col" className="px-4 py-3 font-semibold">Departamento</th>
                <th scope="col" className="px-4 py-3 font-semibold">Estatus</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Gafetes emitidos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linea">
              {personas.map((p) => (
                <tr key={p.id}>
                  <th scope="row" className="px-4 py-2.5 font-medium">
                    <Link href={`/cuenta/equipo/${p.id}`} className="flex items-center gap-3 hover:underline">
                      {p.foto_path && fotos.get(p.foto_path) ? (
                        // eslint-disable-next-line @next/next/no-img-element -- liga temporal de almacenamiento privado
                        <img src={fotos.get(p.foto_path)} alt="" width={36} height={48} loading="lazy" className="h-12 w-9 rounded object-cover" />
                      ) : (
                        <span aria-hidden className="flex h-12 w-9 items-center justify-center rounded bg-papel text-xs text-gris">Sin foto</span>
                      )}
                      {p.nombre}
                    </Link>
                  </th>
                  <td className="px-4 py-2.5">{p.numero_empleado}</td>
                  <td className="px-4 py-2.5">{p.puesto}</td>
                  <td className="px-4 py-2.5">{p.departamento}</td>
                  <td className="px-4 py-2.5"><Estatus valor={p.estatus} /></td>
                  <td className="px-4 py-2.5 text-right">{p.gafetes[0]?.count ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-tarjeta border border-dashed border-linea bg-white p-8 text-center">
          <p className="font-semibold">
            {hayFiltros ? "Nadie coincide con estos filtros." : "Todavía no hay nadie en tu equipo."}
          </p>
          {hayFiltros ? null : (
            <p className="mt-1 text-gris">
              Sube a todos con un Excel o agrega a la primera persona a mano.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
