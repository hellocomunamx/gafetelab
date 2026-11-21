"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ChangeEvent, type DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { asignarFotos } from "@/app/cuenta/acciones";
import { crearEmparejador, type PersonaFoto, type Via } from "@/lib/cuenta/emparejar";
import { prepararFoto, rutaFoto } from "@/lib/cuenta/imagen";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { claseBoton, claseBotonSecundario } from "./Formulario";

type Persona = PersonaFoto & { tieneFoto: boolean };
type Foto = {
  clave: string;
  archivo: string;
  contenido: Blob;
  url: string;
  empleadoId: string;
  via: Via | "manual" | null;
  /** Se reconoció a la persona, pero otra foto de la tanda ya era para ella. */
  choque?: string;
};

const MAXIMO = 500;
const ES_IMAGEN = /\.(jpe?g|png|webp)$/i;
const TIPOS: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
const VIAS: Record<string, string> = {
  archivo: "Por el archivo del Excel",
  numero: "Por número de empleado",
  nombre: "Por nombre",
  manual: "Elegida a mano",
};

/** Saca las imágenes de lo que la persona soltó: fotos sueltas o un ZIP con fotos. */
async function extraer(archivos: File[]): Promise<{ archivo: string; contenido: Blob }[]> {
  const fotos: { archivo: string; contenido: Blob }[] = [];
  for (const a of archivos) {
    if (/\.zip$/i.test(a.name)) {
      const { unzipSync } = await import("fflate");
      const contenido = unzipSync(new Uint8Array(await a.arrayBuffer()), {
        filter: (f) => ES_IMAGEN.test(f.name) && !/(^|\/)(__MACOSX|\.)/.test(f.name),
      });
      for (const [ruta, bytes] of Object.entries(contenido)) {
        const nombre = ruta.split("/").pop()!;
        const tipo = TIPOS[nombre.split(".").pop()!.toLowerCase()];
        fotos.push({ archivo: nombre, contenido: new Blob([bytes as BlobPart], { type: tipo }) });
      }
    } else if (ES_IMAGEN.test(a.name)) {
      fotos.push({ archivo: a.name, contenido: a });
    }
  }
  return fotos;
}

/** Carga masiva: empareja cada foto con su persona, deja revisar y sube. */
export function SubirFotos({ empresaId, personas }: { empresaId: string; personas: Persona[] }) {
  const router = useRouter();
  const emparejar = useMemo(() => crearEmparejador(personas), [personas]);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [aviso, setAviso] = useState("");
  const [encima, setEncima] = useState(false);
  const [avance, setAvance] = useState<{ hechas: number; total: number }>();
  const [resultado, setResultado] = useState<{ subidas: number; fallas: string[] }>();
  const urls = useRef<string[]>([]);
  const actuales = useRef<Foto[]>([]);
  useEffect(() => {
    actuales.current = fotos;
  }, [fotos]);

  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  async function agregar(archivos: File[]) {
    setAviso("");
    setResultado(undefined);
    let nuevas: Awaited<ReturnType<typeof extraer>>;
    try {
      nuevas = await extraer(archivos);
    } catch {
      return setAviso("No pudimos abrir el ZIP. Prueba a comprimirlo de nuevo o sube las fotos sueltas.");
    }
    if (!nuevas.length) return setAviso("No encontramos fotos. Sube imágenes JPG, PNG o WebP, o un ZIP con ellas.");
    const previas = actuales.current;
    const cupo = Math.max(0, MAXIMO - previas.length);
    if (nuevas.length > cupo) setAviso(`Sube como máximo ${MAXIMO} fotos a la vez. Agregamos las primeras ${cupo}.`);
    const ocupadas = new Set(previas.map((f) => f.empleadoId).filter(Boolean));
    const agregadas = nuevas.slice(0, cupo).map((n, i): Foto => {
      const url = URL.createObjectURL(n.contenido);
      urls.current.push(url);
      const par = emparejar(n.archivo);
      // Si dos fotos apuntan a la misma persona, la segunda se queda por asignar.
      const libre = par && !ocupadas.has(par.id);
      if (libre) ocupadas.add(par.id);
      return {
        clave: `${Date.now()}-${i}-${n.archivo}`,
        archivo: n.archivo,
        contenido: n.contenido,
        url,
        empleadoId: libre ? par.id : "",
        via: libre ? par.via : null,
        choque: par && !libre ? par.id : undefined,
      };
    });
    setFotos([...previas, ...agregadas]);
  }

  const alElegir = (e: ChangeEvent<HTMLInputElement>) => {
    const lista = [...(e.target.files ?? [])];
    e.target.value = "";
    if (lista.length) void agregar(lista);
  };
  const alSoltar = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setEncima(false);
    const lista = [...e.dataTransfer.files];
    if (lista.length) void agregar(lista);
  };

  const asignadas = fotos.filter((f) => f.empleadoId);
  const repetidas = new Set(
    asignadas.map((f) => f.empleadoId).filter((id, i, todas) => todas.indexOf(id) !== i),
  );
  const porPersona = new Map(personas.map((p) => [p.id, p]));
  const subiendo = Boolean(avance);

  async function subir() {
    const pendientes = fotos.filter((f) => f.empleadoId);
    if (!pendientes.length || repetidas.size) return;
    setAviso("");
    setAvance({ hechas: 0, total: pendientes.length });
    const supabase = crearClienteNavegador();
    const listas: { id: string; ruta: string; clave: string }[] = [];
    const fallas: string[] = [];
    let siguiente = 0;
    // Cuatro a la vez: rápido sin saturar la conexión.
    await Promise.all(
      Array.from({ length: 4 }, async () => {
        while (siguiente < pendientes.length) {
          const foto = pendientes[siguiente++];
          try {
            const lista = await prepararFoto(foto.contenido);
            const ruta = rutaFoto(empresaId, foto.empleadoId);
            const { error } = await supabase.storage
              .from("fotos")
              .upload(ruta, lista, { contentType: "image/jpeg", upsert: true });
            if (error) throw error;
            listas.push({ id: foto.empleadoId, ruta, clave: foto.clave });
          } catch {
            fallas.push(foto.archivo);
          }
          setAvance((a) => (a ? { ...a, hechas: a.hechas + 1 } : a));
        }
      }),
    );
    let guardadas = new Set<string>();
    for (let i = 0; i < listas.length; i += 200) {
      const tanda = listas.slice(i, i + 200);
      const r = await asignarFotos(tanda.map(({ id, ruta }) => ({ id, ruta }))).catch(() => ({ error: "x" }));
      if (r.error) fallas.push(...tanda.map((t) => fotos.find((f) => f.clave === t.clave)?.archivo ?? ""));
      else guardadas = new Set([...guardadas, ...tanda.map((t) => t.clave)]);
    }
    setFotos((previas) => previas.filter((f) => !guardadas.has(f.clave)));
    setResultado({ subidas: guardadas.size, fallas: fallas.filter(Boolean) });
    setAvance(undefined);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setEncima(true);
        }}
        onDragLeave={() => setEncima(false)}
        onDrop={alSoltar}
        className={`rounded-tarjeta border-2 border-dashed p-8 text-center transition-colors ${encima ? "border-rojo bg-rojo/5" : "border-linea bg-white"}`}
      >
        <p className="font-titulos text-lg font-extrabold">Arrastra aquí tus fotos o un ZIP</p>
        <p className="mx-auto mt-1 max-w-xl text-sm text-gris">
          Nombra cada archivo con el número de empleado (0042.jpg) o con el nombre completo
          (Ana Martínez.jpg) y se asigna sola. JPG, PNG o WebP; hasta {MAXIMO} a la vez.
        </p>
        <label className={`${claseBoton} mt-4 cursor-pointer`}>
          <input type="file" multiple accept="image/jpeg,image/png,image/webp,.zip,application/zip" onChange={alElegir} disabled={subiendo} className="sr-only" />
          Elegir fotos o ZIP
        </label>
      </div>

      {aviso ? <p role="alert" className="rounded-tarjeta-chica bg-rojo/10 p-4 font-medium text-rojo-oscuro">{aviso}</p> : null}

      {resultado ? (
        <div role="status" className="rounded-tarjeta border border-[#0a7d4f] bg-[#dff3ea] p-5">
          <p className="font-titulos text-lg font-extrabold">
            {resultado.subidas === 1 ? "Se guardó 1 foto." : `Se guardaron ${resultado.subidas} fotos.`}
          </p>
          {resultado.fallas.length ? (
            <p className="mt-1 text-sm text-rojo-oscuro">
              No se pudieron subir: {resultado.fallas.slice(0, 10).join(", ")}
              {resultado.fallas.length > 10 ? "…" : ""}. Revisa que sean imágenes válidas e inténtalo otra vez.
            </p>
          ) : null}
          <Link href="/cuenta/equipo" className={`${claseBotonSecundario} mt-4`}>Ver mi equipo</Link>
        </div>
      ) : null}

      {fotos.length ? (
        <div className="rounded-tarjeta border border-linea bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-titulos text-lg font-extrabold">
                {asignadas.length} de {fotos.length} fotos con persona asignada
              </p>
              {fotos.length > asignadas.length ? (
                <p className="text-sm text-gris">
                  Las que dicen &quot;Sin asignar&quot; no se suben: elige a quién corresponden o quítalas.
                </p>
              ) : null}
              {repetidas.size ? (
                <p className="text-sm font-medium text-rojo-oscuro">
                  Hay dos fotos para la misma persona. Deja solo una para continuar.
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => setFotos([])} disabled={subiendo} className="text-sm underline">
                Quitar todas
              </button>
              <button type="button" onClick={subir} disabled={subiendo || !asignadas.length || repetidas.size > 0} className={claseBoton}>
                {avance
                  ? `Subiendo ${avance.hechas} de ${avance.total}…`
                  : `Subir ${asignadas.length} ${asignadas.length === 1 ? "foto" : "fotos"}`}
              </button>
            </div>
          </div>

          <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[...fotos]
              .sort((a, b) => Number(Boolean(a.empleadoId)) - Number(Boolean(b.empleadoId)))
              .map((f) => {
                const persona = porPersona.get(f.empleadoId);
                const doble = repetidas.has(f.empleadoId);
                return (
                  <li
                    key={f.clave}
                    className={`flex gap-3 rounded-tarjeta-chica border p-3 ${doble ? "border-rojo" : f.empleadoId ? "border-linea" : "border-dashed border-tinta bg-papel"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local */}
                    <img src={f.url} alt="" loading="lazy" className="h-24 w-[4.5rem] shrink-0 rounded object-cover" />
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="truncate font-medium" title={f.archivo}>{f.archivo}</p>
                      <select
                        value={f.empleadoId}
                        disabled={subiendo}
                        aria-label={`Persona de la foto ${f.archivo}`}
                        onChange={(e) =>
                          setFotos((previas) =>
                            previas.map((p) =>
                              p.clave === f.clave
                                ? { ...p, empleadoId: e.target.value, via: e.target.value ? "manual" : null, choque: undefined }
                                : p,
                            ),
                          )
                        }
                        className="mt-1.5 w-full rounded-tarjeta-chica border border-linea bg-white px-2 py-1.5"
                      >
                        <option value="">Sin asignar</option>
                        {personas.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre}{p.numero_empleado ? ` (${p.numero_empleado})` : ""}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gris">
                        {f.via ? (
                          <span>{VIAS[f.via]}</span>
                        ) : f.choque ? (
                          <span>Ya hay otra foto para {porPersona.get(f.choque)?.nombre}</span>
                        ) : (
                          <span>No supimos de quién es</span>
                        )}
                        {persona?.tieneFoto ? <span className="font-semibold text-tinta">Reemplaza su foto actual</span> : null}
                        <button
                          type="button"
                          disabled={subiendo}
                          onClick={() => setFotos((previas) => previas.filter((p) => p.clave !== f.clave))}
                          className="underline"
                        >
                          Quitar
                        </button>
                      </p>
                    </div>
                  </li>
                );
              })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
