import type { Metadata } from "next";
import Link from "next/link";
import { Confirmar } from "@/components/cuenta/Confirmar";
import { SubirGafetes } from "@/components/cuenta/SubirGafetes";
import { ligasDe } from "@/lib/cuenta/fotos";
import { avisosDeGafete, type CaraGuardada, type CaraLista } from "@/lib/cuenta/listos";
import { requerirEmpresa } from "@/lib/cuenta/sesion";
import { quitarGafeteListo } from "../acciones";

export const metadata: Metadata = { title: "Ya tengo mis gafetes listos" };

const POR_PAGINA = 24;
const VISTAS = ["todos", "avisos", "faltan"] as const;
type Vista = (typeof VISTAS)[number];

const cara = (ruta: string | null, ancho: number | null, alto: number | null): CaraGuardada | null =>
  ruta && ancho && alto ? { ruta, ancho, alto } : null;

export default async function GafetesListos({
  searchParams,
}: {
  searchParams: Promise<{ ver?: string; pagina?: string }>;
}) {
  const f = await searchParams;
  const { supabase, empresa } = await requerirEmpresa();
  const [{ data: equipo }, { data: filas }] = await Promise.all([
    supabase
      .from("empleados")
      .select("id, nombre, numero_empleado")
      .eq("empresa_id", empresa.id)
      .neq("estatus", "baja")
      .order("nombre")
      .limit(5000),
    supabase
      .from("gafetes_listos")
      .select("empleado_id, frente_path, frente_ancho, frente_alto, vuelta_path, vuelta_ancho, vuelta_alto")
      .eq("empresa_id", empresa.id)
      .limit(5000),
  ]);
  const listos = new Map(
    (filas ?? []).map((g) => {
      const frente = cara(g.frente_path, g.frente_ancho, g.frente_alto);
      const vuelta = cara(g.vuelta_path, g.vuelta_ancho, g.vuelta_alto);
      return [g.empleado_id, { frente, vuelta, avisos: avisosDeGafete(frente, vuelta) }] as const;
    }),
  );
  const personas = (equipo ?? []).map((p) => ({ ...p, listo: listos.get(p.id) }));
  const conGafete = personas.filter((p) => p.listo);
  const conAvisos = conGafete.filter((p) => p.listo!.avisos.length);
  const faltan = personas.filter((p) => !p.listo);

  const vista: Vista = VISTAS.find((v) => v === f.ver) ?? "todos";
  const lista = vista === "avisos" ? conAvisos : vista === "faltan" ? faltan : conGafete;
  const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  const pagina = Math.min(paginas, Math.max(1, Number.parseInt(f.pagina ?? "1", 10) || 1));
  const visibles = lista.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const ligas = await ligasDe(
    supabase,
    "gafetes",
    visibles.flatMap((p) => [p.listo?.frente?.ruta, p.listo?.vuelta?.ruta]),
  );

  const liga = (cambios: { ver?: Vista; pagina?: number }) => {
    const sp = new URLSearchParams();
    const ver = cambios.ver ?? vista;
    if (ver !== "todos") sp.set("ver", ver);
    if (cambios.pagina && cambios.pagina > 1) sp.set("pagina", String(cambios.pagina));
    const cola = sp.toString();
    return `/cuenta/disenos/listos${cola ? `?${cola}` : ""}#equipo`;
  };
  const pestana = (activa: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-semibold ${activa ? "bg-tinta text-white" : "hover:bg-white"}`;
  const subida = personas.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    numero_empleado: p.numero_empleado,
    tiene: (["frente", "vuelta"] as CaraLista[]).filter((c) => p.listo?.[c]),
  }));

  return (
    <div className="space-y-5">
      <p className="text-sm"><Link href="/cuenta/disenos" className="underline">Diseños</Link> / Ya tengo mis gafetes listos</p>
      <h1 className="text-3xl font-extrabold">Ya tengo mis gafetes listos</h1>
      <p className="max-w-2xl text-gris">
        Si ya tienes el gafete terminado de cada persona, con su nombre y su foto en el diseño, súbelos de
        forma masiva. Cada imagen se asigna sola a su persona por el nombre del archivo, revisamos su
        medida y su calidad, y se imprimen tal cual, sin pasar por el editor.
      </p>

      {personas.length ? (
        <SubirGafetes empresaId={empresa.id} personas={subida} />
      ) : (
        <div className="rounded-tarjeta border border-dashed border-linea bg-white p-8 text-center">
          <p className="font-semibold">Primero sube a tu equipo.</p>
          <p className="mt-1 text-gris">
            Así sabemos de quién es cada gafete.{" "}
            <Link href="/cuenta/equipo/importar" className="underline">Importa tu Excel</Link> o{" "}
            <Link href="/cuenta/equipo/nuevo" className="underline">agrega a una persona</Link>.
          </p>
        </div>
      )}

      {personas.length ? (
        <section id="equipo" className="scroll-mt-28 space-y-4 pt-4">
          <h2 className="text-xl font-extrabold">
            {conGafete.length.toLocaleString("es-MX")} de {personas.length.toLocaleString("es-MX")}{" "}
            {personas.length === 1 ? "persona tiene" : "personas tienen"} su gafete listo
          </h2>
          <nav aria-label="Qué ver" className="inline-flex flex-wrap gap-1 rounded-full bg-linea/60 p-1">
            <Link href={liga({ ver: "todos" })} className={pestana(vista === "todos")}>Con gafete ({conGafete.length})</Link>
            <Link href={liga({ ver: "avisos" })} className={pestana(vista === "avisos")}>Con avisos ({conAvisos.length})</Link>
            <Link href={liga({ ver: "faltan" })} className={pestana(vista === "faltan")}>Les falta ({faltan.length})</Link>
          </nav>

          {vista === "faltan" ? (
            visibles.length ? (
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {visibles.map((p) => (
                  <li key={p.id} className="rounded-tarjeta-chica border border-linea bg-white px-4 py-3 text-sm">
                    <Link href={`/cuenta/equipo/${p.id}`} className="font-semibold hover:underline">{p.nombre}</Link>
                    {p.numero_empleado ? <span className="text-gris"> · {p.numero_empleado}</span> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-tarjeta border border-linea bg-white p-6 text-center font-semibold text-[#0a7d4f]">
                Todo tu equipo activo ya tiene su gafete listo.
              </p>
            )
          ) : visibles.length ? (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibles.map((p) => {
                const g = p.listo!;
                return (
                  <li key={p.id} className="flex flex-col rounded-tarjeta border border-linea bg-white p-4">
                    <div className="flex items-center justify-center gap-2 rounded-tarjeta-chica bg-papel p-3">
                      {(["frente", "vuelta"] as const).map((c) => {
                        const url = g[c] ? ligas.get(g[c].ruta) : undefined;
                        return url ? (
                          // eslint-disable-next-line @next/next/no-img-element -- liga temporal de almacenamiento privado
                          <img
                            key={c}
                            src={url}
                            alt={`${c === "frente" ? "Frente" : "Vuelta"} del gafete de ${p.nombre}`}
                            loading="lazy"
                            className="max-h-36 min-w-0 flex-1 rounded object-contain drop-shadow"
                          />
                        ) : null;
                      })}
                    </div>
                    <Link href={`/cuenta/equipo/${p.id}`} className="mt-3 font-semibold hover:underline">{p.nombre}</Link>
                    <p className="text-sm text-gris">
                      {p.numero_empleado ? `${p.numero_empleado} · ` : ""}
                      {g.frente && g.vuelta ? "Frente y vuelta" : g.frente ? "Solo frente" : "Solo vuelta"}
                    </p>
                    {g.avisos.length ? (
                      <ul className="mt-2 space-y-0.5 rounded-tarjeta-chica bg-resaltador/30 px-2.5 py-1.5 text-sm">
                        {g.avisos.map((a) => <li key={a}>{a}</li>)}
                      </ul>
                    ) : (
                      <p className="mt-2 text-sm text-[#0a7d4f]">Medida y calidad correctas</p>
                    )}
                    <div className="mt-auto flex flex-wrap items-start gap-x-4 gap-y-2 pt-3">
                      <Confirmar accion={quitarGafeteListo} id={p.id} texto="Quitar gafete" confirmar="Sí, quitarlo">
                        Se borran sus imágenes. Para cambiarlas no hace falta quitarlas: sube las nuevas y se
                        reemplazan.
                      </Confirmar>
                      {g.frente && g.vuelta ? (
                        <form action={quitarGafeteListo}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="cara" value="vuelta" />
                          <button type="submit" className="text-sm underline underline-offset-4">Quitar solo la vuelta</button>
                        </form>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-tarjeta border border-dashed border-linea bg-white p-6 text-center text-gris">
              {vista === "avisos"
                ? "Ningún gafete tiene avisos."
                : "Todavía no subes ningún gafete. Arrastra tus imágenes al recuadro de arriba."}
            </p>
          )}

          {paginas > 1 ? (
            <nav aria-label="Páginas" className="flex items-center justify-center gap-4 text-sm">
              {pagina > 1 ? <Link href={liga({ pagina: pagina - 1 })} className="underline">Anterior</Link> : null}
              <span className="text-gris">Página {pagina} de {paginas}</span>
              {pagina < paginas ? <Link href={liga({ pagina: pagina + 1 })} className="underline">Siguiente</Link> : null}
            </nav>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
