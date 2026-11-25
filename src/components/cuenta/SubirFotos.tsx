"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ChangeEvent, type DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { asignarFotos } from "@/app/cuenta/acciones";
import { crearEmparejador, type PersonaFoto, type Via } from "@/lib/cuenta/emparejar";
import { AjustarFoto, type FotoAjustada } from "@/components/AjustarFoto";
import { prepararFoto, rutaFoto } from "@/lib/cuenta/imagen";
import { extraerImagenes, type ImagenSuelta } from "@/lib/cuenta/zip";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { ElegirPersona } from "./ElegirPersona";
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
  /** Encuadre elegido a mano; sin él, la foto se centra sola al subir. */
  ajuste?: Omit<FotoAjustada, "foto"> & { lista: Blob };
};

const MAXIMO = 500;
const VIAS: Record<string, string> = {
  archivo: "Por el archivo del Excel",
  numero: "Por número de empleado",
  nombre: "Por nombre",
  parcial: "Por parte del nombre (revísala)",
  manual: "Elegida a mano",
};

/** Carga masiva: empareja cada foto con su persona, deja revisar y sube. */
export function SubirFotos({ empresaId, personas }: { empresaId: string; personas: Persona[] }) {
  const router = useRouter();
  const emparejar = useMemo(() => crearEmparejador(personas), [personas]);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [aviso, setAviso] = useState("");
  const [encima, setEncima] = useState(false);
  const [avance, setAvance] = useState<{ hechas: number; total: number }>();
  const [resultado, setResultado] = useState<{ subidas: number; fallas: string[] }>();
  /** Foto abierta en el editor de encuadre. */
  const [ajustando, setAjustando] = useState<string>();
  /** Asignar a mano, foto por foto, las que no se reconocieron. */
  const [unaPorUna, setUnaPorUna] = useState(false);
  const [saltadas, setSaltadas] = useState<Set<string>>(new Set());
  const urls = useRef<string[]>([]);
  const actuales = useRef<Foto[]>([]);
  useEffect(() => {
    actuales.current = fotos;
  }, [fotos]);

  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  async function agregar(archivos: File[]) {
    setAviso("");
    setResultado(undefined);
    let nuevas: ImagenSuelta[];
    try {
      nuevas = await extraerImagenes(archivos);
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
  const editando = fotos.find((f) => f.clave === ajustando);
  const ocupadas = new Set(asignadas.map((f) => f.empleadoId));
  const sinAsignar = fotos.filter((f) => !f.empleadoId);
  const actual = unaPorUna ? (sinAsignar.find((f) => !saltadas.has(f.clave)) ?? sinAsignar[0]) : undefined;

  function asignar(clave: string, id: string) {
    setFotos((previas) =>
      previas.map((p) => (p.clave === clave ? { ...p, empleadoId: id, via: id ? "manual" : null, choque: undefined } : p)),
    );
  }
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
            const lista = foto.ajuste?.lista ?? (await prepararFoto(foto.contenido));
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
          Si las nombraste con su número o su nombre, se asignan solas. JPG, PNG o WebP; hasta {MAXIMO} a la
          vez.
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
              {sinAsignar.length ? (
                <p className="text-sm text-gris">
                  Las que no tienen persona no se suben: búscala por su nombre o número, o quítala.
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

          {sinAsignar.length && !unaPorUna ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-tarjeta-chica border border-dashed border-tinta bg-papel p-4 text-sm">
              <p>
                <span className="font-semibold">
                  {sinAsignar.length === 1 ? "1 foto no se reconoció." : `${sinAsignar.length} fotos no se reconocieron.`}
                </span>{" "}
                Pasa por ellas una por una: ves la foto en grande y escribes de quién es.
              </p>
              <button
                type="button"
                disabled={subiendo}
                onClick={() => {
                  setSaltadas(new Set());
                  setUnaPorUna(true);
                }}
                className={claseBotonSecundario}
              >
                Asignar una por una
              </button>
            </div>
          ) : null}

          {actual ? (
            <section aria-label="Asignar una por una" className="mt-4 rounded-tarjeta-chica border-2 border-tinta p-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <p className="font-semibold">
                  Faltan {sinAsignar.length} · <span className="font-normal text-gris">{actual.archivo}</span>
                </p>
                <button type="button" onClick={() => setUnaPorUna(false)} className="underline">
                  Terminar
                </button>
              </div>
              <div className="mt-3 grid gap-4 sm:grid-cols-[12rem_1fr]">
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local */}
                  <img src={actual.url} alt={`Foto ${actual.archivo}`} className="aspect-[3/4] w-full max-w-48 rounded-tarjeta-chica object-cover" />
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <button type="button" onClick={() => setAjustando(actual.clave)} className="underline">Acomodar</button>
                    <button
                      type="button"
                      onClick={() => setSaltadas((s) => new Set(s).add(actual.clave))}
                      disabled={sinAsignar.length < 2}
                      className="underline disabled:opacity-40"
                    >
                      Saltar
                    </button>
                    <button
                      type="button"
                      onClick={() => setFotos((previas) => previas.filter((p) => p.clave !== actual.clave))}
                      className="underline"
                    >
                      Quitar foto
                    </button>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">¿Quién es?</p>
                  <ElegirPersona
                    key={actual.clave}
                    personas={personas}
                    valor=""
                    ocupadas={ocupadas}
                    abierta
                    enfocar
                    etiqueta={`Persona de la foto ${actual.archivo}`}
                    alElegir={(id) => asignar(actual.clave, id)}
                  />
                </div>
              </div>
            </section>
          ) : null}

          <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[...fotos]
              .sort((a, b) => Number(Boolean(a.empleadoId)) - Number(Boolean(b.empleadoId)))
              .map((f) => {
                const persona = porPersona.get(f.empleadoId);
                const doble = repetidas.has(f.empleadoId);
                return (
                  <li
                    key={f.clave}
                    className={`flex min-w-0 gap-3 rounded-tarjeta-chica border p-3 ${doble ? "border-rojo" : f.empleadoId ? "border-linea" : "border-dashed border-tinta bg-papel"}`}
                  >
                    <button
                      type="button"
                      disabled={subiendo}
                      onClick={() => setAjustando(f.clave)}
                      title="Acomodar la foto"
                      className="group relative h-24 w-[4.5rem] shrink-0 overflow-hidden rounded"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local */}
                      <img src={f.url} alt="" loading="lazy" className="size-full object-cover" />
                      <span className="absolute inset-x-0 bottom-0 bg-tinta/75 py-0.5 text-[0.65rem] font-semibold text-white group-hover:bg-tinta">
                        Acomodar
                      </span>
                    </button>
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="truncate font-medium" title={f.archivo}>{f.archivo}</p>
                      <ElegirPersona
                        personas={personas}
                        valor={f.empleadoId}
                        ocupadas={ocupadas}
                        disabled={subiendo}
                        etiqueta={`Persona de la foto ${f.archivo}`}
                        alElegir={(id) => asignar(f.clave, id)}
                      />
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
                        {f.ajuste ? <span>Acomodada a mano</span> : null}
                      </p>
                    </div>
                  </li>
                );
              })}
          </ul>
        </div>
      ) : null}

      {editando ? (
        <AjustarFoto
          fuente={editando.contenido}
          inicial={editando.ajuste?.encuadre}
          espejoInicial={editando.ajuste?.espejo}
          alCancelar={() => setAjustando(undefined)}
          alListo={({ foto: lista, encuadre, espejo }) => {
            const url = URL.createObjectURL(lista);
            urls.current.push(url);
            setFotos((previas) =>
              previas.map((p) => (p.clave === editando.clave ? { ...p, url, ajuste: { lista, encuadre, espejo } } : p)),
            );
            setAjustando(undefined);
          }}
        />
      ) : null}
    </div>
  );
}
