"use client";

import { useRouter } from "next/navigation";
import { type ChangeEvent, type DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { type CaraSubida, guardarGafetesListos } from "@/app/cuenta/disenos/acciones";
import { crearEmparejador, type Via } from "@/lib/cuenta/emparejar";
import {
  type CaraLista,
  caraDeArchivo,
  carasListas,
  EXTENSIONES_LISTAS,
  medidaIdeal,
  type Revision,
  revisarGafete,
  rutaGafeteListo,
  type TipoListo,
} from "@/lib/cuenta/listos";
import { extraerImagenes, type ImagenSuelta } from "@/lib/cuenta/zip";
import { crearClienteNavegador } from "@/lib/supabase/client";
import { claseBoton } from "./Formulario";

type Persona = { id: string; nombre: string; numero_empleado: string | null; tiene: CaraLista[] };
type Gafete = {
  clave: string;
  archivo: string;
  contenido: Blob;
  url: string;
  empleadoId: string;
  cara: CaraLista;
  via: Via | "manual" | null;
  ancho: number;
  alto: number;
  /** null: el archivo no se pudo abrir como imagen. */
  revision: Revision | null;
};

const MAXIMO = 500;
/** Arriba de esto la imagen se reduce: sigue sobrada para imprimir y pesa mucho menos. */
const LADO_MAXIMO = 3000;
const LADO_REDUCIDO = 2400;
const PESO_MAXIMO = 8 * 1024 * 1024;
const VIAS: Record<string, string> = {
  numero: "Por número de empleado",
  nombre: "Por nombre",
  manual: "Elegida a mano",
};

/** Deja la imagen lista para guardarse: tal cual si ya sirve, o reducida a JPEG si es enorme o WebP. */
async function preparar(g: Gafete): Promise<{ contenido: Blob; tipo: TipoListo; ancho: number; alto: number }> {
  const tipo = g.contenido.type;
  const directo =
    (tipo === "image/jpeg" || tipo === "image/png") &&
    g.contenido.size <= PESO_MAXIMO &&
    Math.max(g.ancho, g.alto) <= LADO_MAXIMO;
  if (directo) return { contenido: g.contenido, tipo, ancho: g.ancho, alto: g.alto };

  const imagen = await createImageBitmap(g.contenido, { imageOrientation: "from-image" });
  const escala = Math.min(1, LADO_REDUCIDO / Math.max(imagen.width, imagen.height));
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.round(imagen.width * escala);
  lienzo.height = Math.round(imagen.height * escala);
  const ctx = lienzo.getContext("2d");
  if (!ctx) throw new Error("sin lienzo");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, lienzo.width, lienzo.height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
  imagen.close();
  const contenido = await new Promise<Blob>((resolver, rechazar) =>
    lienzo.toBlob((b) => (b ? resolver(b) : rechazar(new Error("sin imagen"))), "image/jpeg", 0.93),
  );
  return { contenido, tipo: "image/jpeg", ancho: lienzo.width, alto: lienzo.height };
}

/** Carga masiva de gafetes terminados: asigna cada archivo a su persona y cara, revisa su medida y sube. */
export function SubirGafetes({ empresaId, personas }: { empresaId: string; personas: Persona[] }) {
  const router = useRouter();
  const emparejar = useMemo(
    () => crearEmparejador(personas.map((p) => ({ ...p, foto_archivo: null }))),
    [personas],
  );
  const [gafetes, setGafetes] = useState<Gafete[]>([]);
  const [aviso, setAviso] = useState("");
  const [encima, setEncima] = useState(false);
  const [leyendo, setLeyendo] = useState(false);
  const [avance, setAvance] = useState<{ hechos: number; total: number }>();
  const [resultado, setResultado] = useState<{ subidos: number; fallas: string[] }>();
  const urls = useRef<string[]>([]);
  const actuales = useRef<Gafete[]>([]);
  useEffect(() => {
    actuales.current = gafetes;
  }, [gafetes]);
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  async function agregar(archivos: File[]) {
    setAviso("");
    setResultado(undefined);
    setLeyendo(true);
    let nuevas: ImagenSuelta[];
    try {
      nuevas = await extraerImagenes(archivos);
    } catch {
      setLeyendo(false);
      return setAviso("No pudimos abrir el ZIP. Prueba a comprimirlo de nuevo o sube las imágenes sueltas.");
    }
    if (!nuevas.length) {
      setLeyendo(false);
      return setAviso("No encontramos imágenes. Sube tus gafetes en JPG o PNG, o un ZIP con ellos.");
    }
    const previas = actuales.current;
    const cupo = Math.max(0, MAXIMO - previas.length);
    if (nuevas.length > cupo) setAviso(`Sube como máximo ${MAXIMO} imágenes a la vez. Agregamos las primeras ${cupo}.`);
    const ocupadas = new Set(previas.filter((g) => g.empleadoId).map((g) => `${g.empleadoId}-${g.cara}`));
    const agregadas: Gafete[] = [];
    for (const [i, n] of nuevas.slice(0, cupo).entries()) {
      const url = URL.createObjectURL(n.contenido);
      urls.current.push(url);
      // Primero el nombre completo (hay números de empleado como "A-1"); si no, sin el final de la cara.
      const conCara = caraDeArchivo(n.archivo);
      const entero = emparejar(n.archivo);
      const par = entero ?? (conCara ? emparejar(conCara.base) : null);
      const cara: CaraLista = entero ? "frente" : (conCara?.cara ?? "frente");
      const libre = par && !ocupadas.has(`${par.id}-${cara}`);
      if (libre) ocupadas.add(`${par.id}-${cara}`);
      let ancho = 0;
      let alto = 0;
      let revision: Revision | null = null;
      try {
        const imagen = await createImageBitmap(n.contenido, { imageOrientation: "from-image" });
        ancho = imagen.width;
        alto = imagen.height;
        imagen.close();
        revision = revisarGafete(ancho, alto);
      } catch {
        revision = null;
      }
      agregadas.push({
        clave: `${Date.now()}-${i}-${n.archivo}`,
        archivo: n.archivo,
        contenido: n.contenido,
        url,
        empleadoId: libre ? par.id : "",
        cara,
        via: libre ? par.via : null,
        ancho,
        alto,
        revision,
      });
    }
    setGafetes([...previas, ...agregadas]);
    setLeyendo(false);
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
  const cambiar = (clave: string, cambios: Partial<Gafete>) =>
    setGafetes((previos) => previos.map((g) => (g.clave === clave ? { ...g, ...cambios } : g)));

  const sirve = (g: Gafete) => Boolean(g.revision && !g.revision.bloquea);
  const porSubir = gafetes.filter((g) => g.empleadoId && sirve(g));
  const llaves = porSubir.map((g) => `${g.empleadoId}-${g.cara}`);
  const repetidas = new Set(llaves.filter((l, i) => llaves.indexOf(l) !== i));
  const noSirven = gafetes.filter((g) => !sirve(g)).length;
  const sinAsignar = gafetes.filter((g) => sirve(g) && !g.empleadoId).length;
  const porPersona = new Map(personas.map((p) => [p.id, p]));
  const subiendo = Boolean(avance);

  async function subir() {
    if (!porSubir.length || repetidas.size) return;
    setAviso("");
    setAvance({ hechos: 0, total: porSubir.length });
    const supabase = crearClienteNavegador();
    const listos: (CaraSubida & { clave: string })[] = [];
    const fallas: string[] = [];
    let siguiente = 0;
    // Tres a la vez: son imágenes grandes.
    await Promise.all(
      Array.from({ length: 3 }, async () => {
        while (siguiente < porSubir.length) {
          const g = porSubir[siguiente++];
          try {
            const lista = await preparar(g);
            const ruta = rutaGafeteListo(empresaId, g.empleadoId, g.cara, EXTENSIONES_LISTAS[lista.tipo]);
            const { error } = await supabase.storage
              .from("gafetes")
              .upload(ruta, lista.contenido, { contentType: lista.tipo, upsert: true });
            if (error) throw error;
            listos.push({ clave: g.clave, empleadoId: g.empleadoId, cara: g.cara, ruta, ancho: lista.ancho, alto: lista.alto });
          } catch {
            fallas.push(g.archivo);
          }
          setAvance((a) => (a ? { ...a, hechos: a.hechos + 1 } : a));
        }
      }),
    );
    let guardados = new Set<string>();
    for (let i = 0; i < listos.length; i += 200) {
      const tanda = listos.slice(i, i + 200);
      const r = await guardarGafetesListos(tanda.map(({ empleadoId, cara, ruta, ancho, alto }) => ({ empleadoId, cara, ruta, ancho, alto }))).catch(() => ({ error: "x" }));
      if (r.error) fallas.push(...tanda.map((t) => gafetes.find((g) => g.clave === t.clave)?.archivo ?? ""));
      else guardados = new Set([...guardados, ...tanda.map((t) => t.clave)]);
    }
    setGafetes((previos) => previos.filter((g) => !guardados.has(g.clave)));
    setResultado({ subidos: guardados.size, fallas: fallas.filter(Boolean) });
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
        <p className="font-titulos text-lg font-extrabold">Arrastra aquí tus gafetes o un ZIP</p>
        <p className="mx-auto mt-1 max-w-2xl text-sm text-gris">
          Una imagen por persona y por cara, en JPG o PNG. Nombra cada archivo con el número de empleado o
          el nombre completo, y termina con -frente o -vuelta si imprimes por los dos lados: 0042-frente.png
          y 0042-vuelta.png. Hasta {MAXIMO} imágenes a la vez.
        </p>
        <label className={`${claseBoton} mt-4 cursor-pointer`}>
          <input type="file" multiple accept="image/jpeg,image/png,image/webp,.zip,application/zip" onChange={alElegir} disabled={subiendo || leyendo} className="sr-only" />
          {leyendo ? "Revisando tus imágenes…" : "Elegir gafetes o ZIP"}
        </label>
      </div>

      {aviso ? <p role="alert" className="rounded-tarjeta-chica bg-rojo/10 p-4 font-medium text-rojo-oscuro">{aviso}</p> : null}

      {resultado ? (
        <div role="status" className="rounded-tarjeta border border-[#0a7d4f] bg-[#dff3ea] p-5">
          <p className="font-titulos text-lg font-extrabold">
            {resultado.subidos === 1 ? "Se guardó 1 imagen." : `Se guardaron ${resultado.subidos} imágenes.`}
          </p>
          <p className="mt-1 text-sm">Ya aparecen abajo, con la persona a la que pertenecen.</p>
          {resultado.fallas.length ? (
            <p className="mt-1 text-sm text-rojo-oscuro">
              No se pudieron subir: {resultado.fallas.slice(0, 10).join(", ")}
              {resultado.fallas.length > 10 ? "…" : ""}. Inténtalo otra vez.
            </p>
          ) : null}
        </div>
      ) : null}

      {gafetes.length ? (
        <div className="rounded-tarjeta border border-linea bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-titulos text-lg font-extrabold">
                {porSubir.length} de {gafetes.length} imágenes listas para subir
              </p>
              {sinAsignar ? (
                <p className="text-sm text-gris">
                  {sinAsignar === 1 ? "Hay 1 sin persona" : `Hay ${sinAsignar} sin persona`}: elige a quién
                  corresponde o quítala. Las que no tienen persona no se suben.
                </p>
              ) : null}
              {noSirven ? (
                <p className="text-sm text-rojo-oscuro">
                  {noSirven === 1 ? "1 imagen no se puede usar" : `${noSirven} imágenes no se pueden usar`}: revisa
                  su aviso, corrígela y vuelve a subirla.
                </p>
              ) : null}
              {repetidas.size ? (
                <p className="text-sm font-medium text-rojo-oscuro">
                  Hay dos imágenes para la misma cara de una persona. Deja solo una para continuar.
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => setGafetes([])} disabled={subiendo} className="text-sm underline">
                Quitar todas
              </button>
              <button type="button" onClick={subir} disabled={subiendo || !porSubir.length || repetidas.size > 0} className={claseBoton}>
                {avance
                  ? `Subiendo ${avance.hechos} de ${avance.total}…`
                  : `Subir ${porSubir.length} ${porSubir.length === 1 ? "imagen" : "imágenes"}`}
              </button>
            </div>
          </div>

          <ul className="mt-4 grid gap-3 lg:grid-cols-2">
            {[...gafetes]
              .sort((a, b) => Number(Boolean(a.empleadoId) && sirve(a)) - Number(Boolean(b.empleadoId) && sirve(b)))
              .map((g) => {
                const persona = porPersona.get(g.empleadoId);
                const doble = repetidas.has(`${g.empleadoId}-${g.cara}`);
                const mala = !sirve(g);
                return (
                  <li
                    key={g.clave}
                    className={`flex gap-3 rounded-tarjeta-chica border p-3 ${doble || mala ? "border-rojo" : g.empleadoId ? "border-linea" : "border-dashed border-tinta bg-papel"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local */}
                    <img src={g.url} alt="" loading="lazy" className="h-24 w-28 shrink-0 rounded bg-papel object-contain" />
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="truncate font-medium" title={g.archivo}>{g.archivo}</p>
                      <select
                        value={g.empleadoId}
                        disabled={subiendo}
                        aria-label={`Persona del gafete ${g.archivo}`}
                        onChange={(e) => cambiar(g.clave, { empleadoId: e.target.value, via: e.target.value ? "manual" : null })}
                        className="mt-1.5 w-full rounded-tarjeta-chica border border-linea bg-white px-2 py-1.5"
                      >
                        <option value="">Sin asignar</option>
                        {personas.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre || "Sin nombre"}{p.numero_empleado ? ` (${p.numero_empleado})` : ""}
                          </option>
                        ))}
                      </select>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5" role="group" aria-label={`Cara del gafete ${g.archivo}`}>
                        {carasListas.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            disabled={subiendo}
                            aria-pressed={g.cara === c.id}
                            onClick={() => cambiar(g.clave, { cara: c.id })}
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${g.cara === c.id ? "border-tinta bg-tinta text-white" : "border-linea bg-white"}`}
                          >
                            {c.nombre}
                          </button>
                        ))}
                        {g.revision ? (
                          <span className="text-xs text-gris">
                            {g.ancho} × {g.alto} px · {g.revision.dpi} dpi
                          </span>
                        ) : null}
                      </div>
                      {g.revision ? (
                        g.revision.avisos.length ? (
                          <ul className={`mt-1.5 space-y-0.5 text-xs ${g.revision.bloquea ? "font-medium text-rojo-oscuro" : "text-[#8a5a00]"}`}>
                            {g.revision.avisos.map((a) => <li key={a}>{a}</li>)}
                          </ul>
                        ) : (
                          <p className="mt-1.5 text-xs font-medium text-[#0a7d4f]">Medida y calidad correctas</p>
                        )
                      ) : (
                        <p className="mt-1.5 text-xs font-medium text-rojo-oscuro">No pudimos abrir esta imagen.</p>
                      )}
                      <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gris">
                        {g.via ? <span>{VIAS[g.via]}</span> : g.empleadoId ? null : <span>No supimos de quién es</span>}
                        {persona?.tiene.includes(g.cara) ? (
                          <span className="font-semibold text-tinta">Reemplaza su {g.cara} actual</span>
                        ) : null}
                        <button
                          type="button"
                          disabled={subiendo}
                          onClick={() => setGafetes((previos) => previos.filter((p) => p.clave !== g.clave))}
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

      <p className="text-sm text-gris">
        Medida ideal: {medidaIdeal.mm} ({medidaIdeal.px} a {medidaIdeal.dpi} dpi), que es el gafete de{" "}
        {medidaIdeal.corteMm} más {medidaIdeal.margenMm} mm de margen de corte por lado. Horizontal o vertical.
      </p>
    </div>
  );
}
