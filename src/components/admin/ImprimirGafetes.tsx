"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { claseBoton } from "@/components/cuenta/Formulario";
import { aPng, dibujarCara } from "@/lib/admin/lienzo";
import type { Pagina } from "@/lib/admin/pdf";
import { letrasListas } from "@/lib/diseno/texto";
import type { Diseno } from "@/lib/diseno/tipos";
import { medidas } from "@/lib/materiales";

export type CaraListaParaImprimir = { url: string; formato: "jpg" | "png"; ancho: number; alto: number };

export type PersonaParaImprimir = {
  id: string;
  nombre: string;
  numero: string | null;
  /** Lo que le falta para que su gafete salga completo. Vacío si no le falta nada. */
  faltan: string[];
  /** Solo con un diseño: sus datos, lo que lleva su código QR y la liga de su foto. */
  datos?: Record<string, string>;
  qr?: string;
  foto?: string;
  /** Solo con gafetes listos: sus imágenes. */
  frente?: CaraListaParaImprimir;
  vuelta?: CaraListaParaImprimir;
};

export type FuenteDeImpresion =
  | { tipo: "diseno"; diseno: Diseno; etiquetas: Record<string, string>; imagenes: Record<string, string> }
  | { tipo: "listos" };

type Orden = "seguidas" | "separadas" | "separadas_inversa";
type Archivo = { nombre: string; url: string; paginas: number; peso: number };

/** Resolución del dibujo: el doble de la de la impresora, para que las letras lleguen nítidas. */
const DPI = 600;
/** Gafetes por archivo: mantiene cada PDF manejable. */
const POR_ARCHIVO = 50;

const ORDENES: { id: Orden; titulo: string; texto: string }[] = [
  {
    id: "seguidas",
    titulo: "Frente y vuelta seguidos",
    texto: "Para impresora de doble cara: frente 1, vuelta 1, frente 2, vuelta 2.",
  },
  {
    id: "separadas",
    titulo: "Frentes y vueltas aparte",
    texto: "Un archivo de frentes y otro de vueltas, en el mismo orden. Imprimes, volteas las tarjetas y repites.",
  },
  {
    id: "separadas_inversa",
    titulo: "Aparte, vueltas al revés",
    texto: "Igual, pero las vueltas van de la última a la primera, por si la pila sale invertida.",
  },
];

const chip = (activo: boolean) =>
  `rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
    activo ? "border-tinta bg-tinta text-white" : "border-linea bg-white hover:border-tinta"
  }`;
const nombreArchivo = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "gafetes";
const megas = (bytes: number) => `${(bytes / 1024 / 1024).toLocaleString("es-MX", { maximumFractionDigits: 1 })} MB`;

async function bajar(url: string): Promise<Blob> {
  const respuesta = await fetch(url);
  if (!respuesta.ok) throw new Error("sin archivo");
  return respuesta.blob();
}
const bajarImagen = async (url: string) => createImageBitmap(await bajar(url), { imageOrientation: "from-image" });

/**
 * Arma el PDF de impresión en el navegador de la administradora: una página por
 * cara, al tamaño exacto de la tarjeta. Solo existe en el panel de administración.
 */
export function ImprimirGafetes({
  empresa,
  fuente,
  personas,
}: {
  empresa: string;
  fuente: FuenteDeImpresion;
  personas: PersonaParaImprimir[];
}) {
  const completas = useMemo(() => personas.filter((p) => !p.faltan.length).map((p) => p.id), [personas]);
  const [elegidas, setElegidas] = useState<Set<string>>(() => new Set(completas));
  const [orden, setOrden] = useState<Orden>("seguidas");
  const [girarVuelta, setGirarVuelta] = useState(false);
  const [avance, setAvance] = useState<{ hechos: number; total: number }>();
  const [archivos, setArchivos] = useState<Archivo[]>([]);
  const [aviso, setAviso] = useState("");
  const [muestraDe, setMuestraDe] = useState<{ id: string; url: string }>();
  const ligas = useRef<string[]>([]);
  useEffect(() => () => ligas.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const conVuelta =
    fuente.tipo === "diseno" ? Boolean(fuente.diseno.vuelta) : personas.some((p) => elegidas.has(p.id) && p.vuelta);
  const lista = personas.filter((p) => elegidas.has(p.id));
  const incompletas = personas.length - completas.length;
  const trabajando = Boolean(avance);

  // Imágenes del diseño: se bajan una sola vez y sirven para todas las personas.
  const imagenesDiseno = useRef<Promise<Record<string, ImageBitmap>> | null>(null);
  const cargarImagenes = () => {
    if (fuente.tipo !== "diseno") return Promise.resolve({});
    imagenesDiseno.current ??= Promise.all(
      Object.entries(fuente.imagenes).map(async ([ruta, url]) => [ruta, await bajarImagen(url)] as const),
    ).then((pares) => Object.fromEntries(pares));
    return imagenesDiseno.current;
  };

  /** Las páginas de una persona: su frente y, si lleva, su vuelta (o una en blanco para conservar el par). */
  async function paginasDe(p: PersonaParaImprimir): Promise<{ frente: Pagina; vuelta: Pagina | null }> {
    if (fuente.tipo === "diseno") {
      const letras = await letrasListas();
      if (!letras) throw new Error("sin letras");
      const imagenes = await cargarImagenes();
      const foto = p.foto ? await bajarImagen(p.foto) : null;
      const datos = { datos: p.datos ?? {}, etiquetas: fuente.etiquetas, qr: p.qr ?? "", foto, imagenes };
      const { diseno } = fuente;
      const vertical = diseno.orientacion === "vertical";
      const frente: Pagina = {
        tipo: "dibujo",
        png: await aPng(dibujarCara(diseno.frente, diseno.orientacion, datos, letras, DPI)),
        vertical,
        girar: false,
      };
      const vuelta: Pagina | null = diseno.vuelta
        ? {
            tipo: "dibujo",
            png: await aPng(dibujarCara(diseno.vuelta, diseno.orientacion, datos, letras, DPI)),
            vertical,
            girar: girarVuelta,
          }
        : null;
      foto?.close();
      return { frente, vuelta };
    }
    const cara = async (c: CaraListaParaImprimir, girar: boolean): Promise<Pagina> => ({
      tipo: "listo",
      bytes: new Uint8Array(await (await bajar(c.url)).arrayBuffer()),
      formato: c.formato,
      ancho: c.ancho,
      alto: c.alto,
      girar,
    });
    const vertical = p.frente ? p.frente.alto > p.frente.ancho : false;
    return {
      frente: p.frente ? await cara(p.frente, false) : { tipo: "blanca", vertical },
      vuelta: p.vuelta ? await cara(p.vuelta, girarVuelta) : conVuelta ? { tipo: "blanca", vertical } : null,
    };
  }

  // Muestra: el primer gafete elegido, dibujado igual que saldrá en el PDF.
  const primera = lista[0];
  useEffect(() => {
    let vigente = true;
    if (!primera || fuente.tipo !== "diseno") return;
    void (async () => {
      try {
        const letras = await letrasListas();
        if (!letras) return;
        const imagenes = await cargarImagenes();
        const foto = primera.foto ? await bajarImagen(primera.foto) : null;
        const lienzo = dibujarCara(
          fuente.diseno.frente,
          fuente.diseno.orientacion,
          { datos: primera.datos ?? {}, etiquetas: fuente.etiquetas, qr: primera.qr ?? "", foto, imagenes },
          letras,
          300,
        );
        foto?.close();
        if (vigente) setMuestraDe({ id: primera.id, url: lienzo.toDataURL("image/png") });
      } catch {
        // Sin muestra: el PDF avisa si algo no se puede bajar.
      }
    })();
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo cambia con la primera persona o el diseño
  }, [primera?.id, fuente]);

  const muestra = muestraDe && muestraDe.id === primera?.id ? muestraDe.url : undefined;

  async function generar() {
    if (!lista.length || trabajando) return;
    setAviso("");
    ligas.current.forEach((u) => URL.revokeObjectURL(u));
    ligas.current = [];
    setArchivos([]);
    setAvance({ hechos: 0, total: lista.length });
    const { armarPdf } = await import("@/lib/admin/pdf");
    const base = `gafetes-${nombreArchivo(empresa)}-${fuente.tipo === "diseno" ? nombreArchivo(fuente.diseno.nombre) : "listos"}`;
    const partes = Math.ceil(lista.length / POR_ARCHIVO);
    const nuevos: Archivo[] = [];
    const guardar = async (paginas: Pagina[], nombre: string) => {
      const bytes = await armarPdf(paginas, nombre);
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
      ligas.current.push(url);
      nuevos.push({ nombre: `${nombre}.pdf`, url, paginas: paginas.length, peso: bytes.byteLength });
      setArchivos([...nuevos]);
    };
    try {
      for (let parte = 0; parte < partes; parte++) {
        const tanda = lista.slice(parte * POR_ARCHIVO, (parte + 1) * POR_ARCHIVO);
        const frentes: Pagina[] = [];
        const vueltas: Pagina[] = [];
        for (const p of tanda) {
          let paginas;
          try {
            paginas = await paginasDe(p);
          } catch {
            throw new Error(`No se pudo armar el gafete de ${p.nombre}. Recarga la página e inténtalo otra vez.`);
          }
          frentes.push(paginas.frente);
          if (paginas.vuelta) vueltas.push(paginas.vuelta);
          setAvance((a) => (a ? { ...a, hechos: a.hechos + 1 } : a));
        }
        const cola = partes > 1 ? `-${parte + 1}-de-${partes}` : "";
        if (!vueltas.length) {
          await guardar(frentes, `${base}${cola}`);
        } else if (orden === "seguidas") {
          await guardar(frentes.flatMap((f, i) => [f, vueltas[i]]), `${base}${cola}`);
        } else {
          await guardar(frentes, `${base}-frentes${cola}`);
          await guardar(orden === "separadas_inversa" ? [...vueltas].reverse() : vueltas, `${base}-vueltas${cola}`);
        }
      }
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "No se pudo armar el PDF.");
    }
    setAvance(undefined);
  }

  const alternar = (id: string) =>
    setElegidas((previas) => {
      const nuevas = new Set(previas);
      if (nuevas.has(id)) nuevas.delete(id);
      else nuevas.add(id);
      return nuevas;
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="min-w-0 space-y-5">
        {conVuelta ? (
          <fieldset className="rounded-tarjeta border border-linea bg-white p-5">
            <legend className="px-1 font-semibold">Orden de las páginas</legend>
            <div className="flex flex-wrap gap-2">
              {ORDENES.map((o) => (
                <button key={o.id} type="button" aria-pressed={orden === o.id} onClick={() => setOrden(o.id)} className={chip(orden === o.id)}>
                  {o.titulo}
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm text-gris">{ORDENES.find((o) => o.id === orden)?.texto}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button type="button" aria-pressed={girarVuelta} onClick={() => setGirarVuelta((v) => !v)} className={chip(girarVuelta)}>
                Girar la vuelta 180°
              </button>
              <span className="text-sm text-gris">Actívalo si en tu prueba la vuelta sale de cabeza.</span>
            </div>
          </fieldset>
        ) : null}

        <div className="rounded-tarjeta border border-linea bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-semibold">
              {lista.length.toLocaleString("es-MX")} de {personas.length.toLocaleString("es-MX")} personas elegidas
            </p>
            <div className="flex flex-wrap gap-2 text-sm">
              <button type="button" onClick={() => setElegidas(new Set(completas))} className="underline underline-offset-4">
                Solo completas
              </button>
              <button type="button" onClick={() => setElegidas(new Set(personas.map((p) => p.id)))} className="underline underline-offset-4">
                Todas
              </button>
              <button type="button" onClick={() => setElegidas(new Set())} className="underline underline-offset-4">
                Ninguna
              </button>
            </div>
          </div>
          {incompletas ? (
            <p className="mt-1 text-sm text-gris">
              {incompletas === 1 ? "A 1 persona le falta algo" : `A ${incompletas} personas les falta algo`} y no{" "}
              {incompletas === 1 ? "está elegida" : "están elegidas"}. Si la incluyes, ese espacio sale vacío.
            </p>
          ) : null}
          <ul className="mt-4 max-h-[28rem] divide-y divide-linea overflow-y-auto rounded-tarjeta-chica border border-linea">
            {personas.map((p) => (
              <li key={p.id}>
                <label className="flex cursor-pointer items-start gap-3 px-3 py-2 hover:bg-papel">
                  <input type="checkbox" checked={elegidas.has(p.id)} onChange={() => alternar(p.id)} className="mt-1 size-4 shrink-0 accent-tinta" />
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="font-medium">{p.nombre}</span>
                    {p.numero ? <span className="text-gris"> · {p.numero}</span> : null}
                    {p.faltan.length ? (
                      <span className="block text-rojo-oscuro">Le falta: {p.faltan.join(", ").toLocaleLowerCase("es-MX")}</span>
                    ) : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <aside className="space-y-4 self-start rounded-tarjeta border border-linea bg-white p-5">
        {muestra ? (
          <div>
            <p className="text-sm font-semibold">Así sale el primero</p>
            {/* eslint-disable-next-line @next/next/no-img-element -- imagen generada en el navegador */}
            <img src={muestra} alt={`Frente del gafete de ${primera?.nombre ?? ""}`} className="mt-2 max-h-72 w-full rounded border border-linea object-contain" />
          </div>
        ) : null}
        <button type="button" onClick={generar} disabled={!lista.length || trabajando} className={`${claseBoton} w-full`}>
          {avance ? `Armando ${avance.hechos} de ${avance.total}…` : "Armar PDF de impresión"}
        </button>
        {aviso ? <p role="alert" className="rounded-tarjeta-chica bg-rojo/10 p-3 text-sm font-medium text-rojo-oscuro">{aviso}</p> : null}
        {archivos.length ? (
          <div role="status">
            <p className="text-sm font-semibold">{trabajando ? "Archivos hasta ahora" : "Listo. Descarga tus archivos:"}</p>
            <ul className="mt-2 space-y-2 text-sm">
              {archivos.map((a) => (
                <li key={a.nombre}>
                  <a href={a.url} download={a.nombre} className="font-semibold text-rojo underline underline-offset-4">
                    {a.nombre}
                  </a>
                  <span className="block text-gris">
                    {a.paginas} {a.paginas === 1 ? "página" : "páginas"} · {megas(a.peso)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="text-sm text-gris">
          Cada página mide {medidas.ancho} × {medidas.alto} mm, el tamaño exacto de la tarjeta CR80, de orilla a
          orilla. En Vista Previa imprime al 100 %, sin ajustar al papel. Los archivos se arman en tu
          computadora y no se guardan en ningún lado.
        </p>
      </aside>
    </div>
  );
}
