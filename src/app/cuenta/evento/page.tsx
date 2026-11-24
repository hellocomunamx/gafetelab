import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { claseBoton, claseBotonSecundario } from "@/components/cuenta/clases";
import { Bloque } from "@/components/cuenta/Entrada";
import { EtiquetaEstado } from "@/components/cuenta/EtiquetaEstado";
import { FormularioEvento } from "@/components/cuenta/FormularioEvento";
import { requerirEmpresa } from "@/lib/cuenta/sesion";
import { normalizar } from "@/lib/diseno/reglas";
import {
  categoriasDe,
  diasParaBorrarDatos,
  estadoEvento,
  fechaEvento,
  hoyIso,
  nombreColor,
  nombreTipoEvento,
  rangoEvento,
  sumarDias,
} from "@/lib/eventos";
import { conteoPorCategoria } from "@/lib/eventos-servidor";
import { borrarDatosAhora, crearDisenosFaltantes, guardarEvento } from "../eventos/acciones";

export const metadata: Metadata = { title: "Evento" };

export default async function Evento({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { supabase, empresa, administra } = await requerirEmpresa();
  if (empresa.tipo !== "evento") redirect("/cuenta/eventos");
  const parametros = await searchParams;
  const categorias = categoriasDe(empresa.categorias);
  const [conteo, { data: reglas }] = await Promise.all([
    conteoPorCategoria(supabase, empresa.id, categorias),
    supabase.from("reglas_diseno").select("valor").eq("empresa_id", empresa.id).eq("campo", "categoria"),
  ]);
  const conDiseno = new Set((reglas ?? []).map((r) => normalizar(r.valor)));
  const sinDiseno = categorias.filter((c) => !conDiseno.has(normalizar(c.nombre)));
  const estado = estadoEvento(empresa);
  const inicio = empresa.evento_inicio ?? hoyIso();
  const fin = empresa.evento_fin ?? inicio;
  const borrado = Boolean(empresa.datos_borrados_en);
  const terminado = fin < hoyIso();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gris">{nombreTipoEvento(empresa.evento_tipo)}</p>
        <h1 className="mt-1 text-3xl font-extrabold">{empresa.nombre}</h1>
        <p className="mt-1">
          {rangoEvento(inicio, fin)}
          {empresa.evento_sede ? ` · ${empresa.evento_sede}` : ""}
        </p>
        <div className="mt-3">
          <EtiquetaEstado estado={estado} />
        </div>
      </div>

      {parametros.nuevo ? (
        <Bloque className="border-[#0a7d4f]">
          <p className="font-semibold text-[#0a5c3b]">¡Listo! Tu evento ya está creado, con un diseño por categoría.</p>
          <ol className="mt-3 list-decimal space-y-1 pl-5">
            <li>
              <Link href="/cuenta/equipo/importar" className="underline">Sube la lista de asistentes en Excel</Link>, con su categoría.
            </li>
            <li>
              Si quieres su foto, <Link href="/cuenta/equipo/ligas" className="underline">mándales su liga</Link> para que la suban.
            </li>
            <li>
              <Link href="/cuenta/disenos" className="underline">Revisa cómo sale cada gafete</Link> y cámbialo si quieres.
            </li>
            <li>
              <Link href="/cuenta/pedidos/nuevo" className="underline">Haz tu pedido</Link> antes del {fechaEvento(empresa.evento_limite ?? inicio)}.
            </li>
          </ol>
        </Bloque>
      ) : null}
      {parametros.borrado ? (
        <Bloque className="border-[#0a7d4f]">
          <p className="font-semibold text-[#0a5c3b]">Listo: borramos los datos personales de los asistentes.</p>
        </Bloque>
      ) : null}

      <Bloque titulo="Categorías">
        {borrado ? (
          <p className="text-gris">Los datos de los asistentes ya se borraron.</p>
        ) : (
          <>
            <ul className="grid gap-2 sm:grid-cols-2">
              {conteo.porCategoria.map((c) => (
                <li key={c.nombre} className="flex items-center gap-3 rounded-tarjeta-chica border border-linea px-3 py-2">
                  <span aria-hidden className="size-6 shrink-0 rounded-full ring-1 ring-linea" style={{ background: c.color }} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{c.nombre}</span>
                    <span className="block text-xs text-gris">Gafete y cordón {nombreColor(c.color).toLocaleLowerCase("es-MX")}</span>
                  </span>
                  <span className="text-sm font-semibold">
                    {c.personas} {c.personas === 1 ? "persona" : "personas"}
                  </span>
                </li>
              ))}
            </ul>
            {conteo.sinCategoria ? (
              <p className="mt-3 rounded-tarjeta-chica bg-resaltador/40 px-3 py-2 text-sm">
                {conteo.sinCategoria === 1 ? "Una persona no tiene" : `${conteo.sinCategoria} personas no tienen`} una categoría de esta
                lista: {conteo.sinCategoria === 1 ? "saldrá" : "saldrán"} con el diseño predeterminado. Revisa su dato «Categoría» en{" "}
                <Link href="/cuenta/equipo" className="underline">Asistentes</Link>.
              </p>
            ) : null}
            {sinDiseno.length ? (
              <form action={crearDisenosFaltantes} className="mt-4 flex flex-wrap items-center gap-3">
                <p className="text-sm">
                  {sinDiseno.map((c) => c.nombre).join(", ")} {sinDiseno.length === 1 ? "todavía no tiene" : "todavía no tienen"} su diseño.
                </p>
                <button type="submit" className={claseBotonSecundario}>
                  Crear {sinDiseno.length === 1 ? "su diseño" : "sus diseños"}
                </button>
              </form>
            ) : (
              <p className="mt-4 text-sm text-gris">
                Cada categoría tiene su diseño en <Link href="/cuenta/disenos" className="underline">Diseños</Link>; a cada persona le
                toca el de su categoría.
              </p>
            )}
          </>
        )}
      </Bloque>

      {administra && !borrado ? (
        <Bloque titulo="Datos del evento">
          <FormularioEvento
            accion={guardarEvento}
            boton="Guardar cambios"
            inicial={{
              nombre: empresa.nombre,
              tipo: empresa.evento_tipo ?? "otro",
              inicio,
              fin,
              limite: empresa.evento_limite ?? inicio,
              sede: empresa.evento_sede ?? "",
              categorias,
            }}
          />
        </Bloque>
      ) : null}

      <Bloque titulo="Datos de los asistentes">
        {borrado ? (
          <p>
            Borramos los nombres, fotografías y datos de los asistentes el {fechaEvento(String(empresa.datos_borrados_en).slice(0, 10))}.
            Tus pedidos y facturas siguen aquí.
          </p>
        ) : (
          <>
            <p>
              Para cuidar los datos de tus asistentes, borramos sus nombres, fotografías y datos {diasParaBorrarDatos} días después de
              que termina el evento: el <strong>{fechaEvento(sumarDias(fin, diasParaBorrarDatos))}</strong>. Tus pedidos y facturas se
              quedan. Los QR de acceso dejan de valer al terminar el último día del evento.
            </p>
            {administra && terminado ? (
              <form action={borrarDatosAhora} className="mt-4 space-y-3">
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" name="confirmo" value="si" required className="mt-1" />
                  <span>Entiendo que los datos de los asistentes se borran para siempre.</span>
                </label>
                <button type="submit" className={claseBoton}>Borrar los datos ya</button>
              </form>
            ) : null}
          </>
        )}
      </Bloque>
    </div>
  );
}
