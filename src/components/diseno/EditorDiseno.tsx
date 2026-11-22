"use client";

import Link from "next/link";
import {
  type ChangeEvent,
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { guardarDiseno } from "@/app/cuenta/disenos/acciones";
import { claseBoton, claseBotonSecundario } from "@/components/cuenta/Formulario";
import { subirImagenDiseno } from "@/lib/diseno/subir";
import { acomodar } from "@/lib/diseno/texto";
import {
  type Alineacion,
  type Cara,
  caraVacia,
  type Diseno,
  type Elemento,
  MAX_ELEMENTOS,
  nuevoId,
  type Orientacion,
  tamano,
} from "@/lib/diseno/tipos";
import { medidas } from "@/lib/materiales";
import { GafeteSvg, textoDe, useMedidor } from "./GafeteSvg";
import { PanelElemento } from "./PanelElemento";

type CampoEditor = { clave: string; etiqueta: string; tipo: string };
type PersonaMuestra = { id: string; nombre: string; datos: Record<string, string>; foto: string | null };
type Esquina = "nw" | "ne" | "sw" | "se";
type Arrastre = {
  id: string;
  modo: "mover" | Esquina;
  inicio: { x: number; y: number };
  original: { x: number; y: number; w: number; h: number };
  movido: boolean;
};
type Estado = Pick<Diseno, "orientacion" | "frente" | "vuelta">;

const AZUL = "#2563eb";
const VERDE = "#0a7d4f";
const ROJO = "#e63b2e";
const MINIMO = 2;
const IMAN = 0.7;
const botonPanel =
  "flex w-full items-center justify-between gap-2 rounded-tarjeta-chica border border-linea bg-white px-3 py-2 text-left text-sm font-medium hover:border-tinta disabled:opacity-50";
const redondear = (n: number) => Math.round(n * 10) / 10;

function nombreDe(e: Elemento, etiquetas: Record<string, string>): string {
  if (e.tipo === "texto") return e.campo ? (etiquetas[e.campo] ?? e.campo) : `"${(e.texto ?? "").slice(0, 24)}"`;
  return { foto: "Fotografía", qr: "Código QR", imagen: "Imagen", forma: "Forma" }[e.tipo];
}

/** Editor libre de un diseño: se arrastran campos, textos, foto, QR, imágenes y formas. */
export function EditorDiseno({
  inicial,
  empresaId,
  campos,
  personas,
  muestra,
  imagenesIniciales,
}: {
  inicial: Diseno;
  empresaId: string;
  campos: CampoEditor[];
  /** Personas reales para probar el diseño. */
  personas: PersonaMuestra[];
  /** Datos de ejemplo para cuando no hay equipo. */
  muestra: Record<string, string>;
  imagenesIniciales: Record<string, string>;
}) {
  const [nombre, setNombre] = useState(inicial.nombre);
  const [estado, setEstado] = useState<Estado>({
    orientacion: inicial.orientacion,
    frente: inicial.frente,
    vuelta: inicial.vuelta,
  });
  const [lado, setLado] = useState<"frente" | "vuelta">("frente");
  const [sel, setSel] = useState<string | null>(null);
  const [guias, setGuias] = useState(true);
  const [iman, setIman] = useState<{ x?: number; y?: number }>({});
  const [personaId, setPersonaId] = useState(personas[0]?.id ?? "");
  const [imagenes, setImagenes] = useState(imagenesIniciales);
  const [sucio, setSucio] = useState(false);
  const [aviso, setAviso] = useState<{ ok?: string; error?: string }>({});
  const [ocupado, setOcupado] = useState<"" | "guardando" | "subiendo">("");
  const [puedeDeshacer, setPuedeDeshacer] = useState(false);

  const svg = useRef<SVGSVGElement>(null);
  const arrastre = useRef<Arrastre | null>(null);
  const pasado = useRef<Estado[]>([]);
  /** Espejo del estado, para encadenar cambios dentro de un mismo evento. */
  const actual = useRef(estado);
  const medir = useMedidor();

  const { w: W, h: H } = tamano(estado.orientacion);
  const s = medidas.sangrado;
  const m = medidas.margenSeguro;
  const cara: Cara = (lado === "vuelta" ? estado.vuelta : estado.frente) ?? caraVacia();
  const elegido = cara.elementos.find((e) => e.id === sel) ?? null;
  const persona = personas.find((p) => p.id === personaId);
  const datos = persona?.datos ?? muestra;
  const etiquetas = useMemo(() => Object.fromEntries(campos.map((c) => [c.clave, c.etiqueta])), [campos]);
  const camposTexto = useMemo(() => campos.filter((c) => c.tipo === "texto" || c.tipo === "fecha"), [campos]);

  // Avisar antes de salir con cambios sin guardar.
  useEffect(() => {
    if (!sucio) return;
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [sucio]);

  /** Guarda el estado actual para poder deshacer. */
  const recordar = useCallback((previo: Estado) => {
    pasado.current = [...pasado.current.slice(-80), previo];
    setPuedeDeshacer(true);
  }, []);

  /** Cambia el diseño. `historial: false` se usa mientras se arrastra (ya se recordó al empezar). */
  const cambiar = useCallback(
    (fn: (previo: Estado) => Estado, historial = true) => {
      const previo = actual.current;
      const siguiente = fn(previo);
      if (siguiente === previo) return;
      if (historial) recordar(previo);
      actual.current = siguiente;
      setEstado(siguiente);
      setSucio(true);
      setAviso({});
    },
    [recordar],
  );

  const cambiarCara = useCallback(
    (fn: (c: Cara) => Cara, historial = true) =>
      cambiar((previo) => ({ ...previo, [lado]: fn(previo[lado] ?? caraVacia()) }), historial),
    [cambiar, lado],
  );

  const cambiarElemento = useCallback(
    (id: string, parche: Partial<Elemento>, historial = true) =>
      cambiarCara(
        (c) => ({ ...c, elementos: c.elementos.map((e) => (e.id === id ? ({ ...e, ...parche } as Elemento) : e)) }),
        historial,
      ),
    [cambiarCara],
  );

  function deshacer() {
    const previo = pasado.current.pop();
    if (!previo) return;
    actual.current = previo;
    setEstado(previo);
    setPuedeDeshacer(pasado.current.length > 0);
    setSucio(true);
    if (lado === "vuelta" && !previo.vuelta) setLado("frente");
  }

  function agregar(nuevo: Elemento) {
    if (cara.elementos.length >= MAX_ELEMENTOS) {
      return setAviso({ error: `Cada cara admite hasta ${MAX_ELEMENTOS} elementos.` });
    }
    cambiarCara((c) => ({ ...c, elementos: [...c.elementos, nuevo] }));
    setSel(nuevo.id);
  }

  /** La posición, si ahí no hay nada más que formas de fondo. */
  function huecoEn(x: number, y: number, w: number, h: number): { x: number; y: number } | null {
    const choca = cara.elementos.some(
      (e) => e.tipo !== "forma" && x < e.x + e.w && x + w > e.x && y < e.y + e.h && y + h > e.y,
    );
    return choca ? null : { x, y };
  }

  /** Primer hueco libre de la zona segura donde cabe una caja de ese tamaño. */
  function hueco(w: number, h: number): { x: number; y: number } | null {
    for (let y = m; y <= H - m - h; y += 1) {
      for (let x = m; x <= W - m - w; x += 2) {
        const lugar = huecoEn(x, y, w, h);
        if (lugar) return lugar;
      }
    }
    return null;
  }

  /** Dónde poner un texto nuevo: debajo del último renglón si cabe; si no, en el primer hueco. */
  function lugarTexto(h: number): { x: number; y: number; w: number; alinear: Alineacion } {
    const textos = cara.elementos.filter((e) => e.tipo === "texto");
    const ultimo = textos.reduce<Elemento | null>((a, e) => (!a || e.y + e.h > a.y + a.h ? e : a), null);
    if (ultimo) {
      const y = redondear(ultimo.y + ultimo.h + 0.8);
      if (y + h <= H - m && huecoEn(ultimo.x, y, ultimo.w, h)) {
        return { x: ultimo.x, y, w: ultimo.w, alinear: ultimo.tipo === "texto" ? ultimo.alinear : "izquierda" };
      }
    }
    const w = Math.min(40, W - m * 2);
    return { ...(hueco(w, h) ?? hueco(22, h) ?? { x: m, y: m }), w: hueco(w, h) ? w : 22, alinear: "izquierda" };
  }

  const agregarCampo = (clave: string) => {
    const h = clave === "nombre" ? 10.6 : 4.4;
    agregar({
      id: nuevoId(), tipo: "texto", campo: clave, conEtiqueta: false, fuente: "inter",
      tam: clave === "nombre" ? 4.4 : 3.2, negrita: clave === "nombre", color: "#1b1f3b",
      ...lugarTexto(h), h,
    });
  };
  const agregarTexto = () =>
    agregar({
      id: nuevoId(), tipo: "texto", texto: "Tu texto", fuente: "inter", tam: 3.5, negrita: false,
      color: "#1b1f3b", ...lugarTexto(4.8), h: 4.8,
    });
  const agregarFoto = () =>
    agregar({ id: nuevoId(), tipo: "foto", radio: 2, ...(hueco(22, 29.3) ?? { x: m + 2, y: m + 8 }), w: 22, h: 29.3 });
  const agregarQr = () =>
    agregar({ id: nuevoId(), tipo: "qr", ...(huecoEn(W - m - 14, H - m - 14, 14, 14) ?? hueco(14, 14) ?? { x: W - m - 14, y: H - m - 14 }), w: 14, h: 14 });
  const agregarForma = () => agregar({ id: nuevoId(), tipo: "forma", color: ROJO, radio: 0, x: -s, y: -s, w: W + s * 2, h: 14 });

  async function subir(evento: ChangeEvent<HTMLInputElement>, destino: "imagen" | "fondo") {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!archivo) return;
    setOcupado("subiendo");
    setAviso({});
    try {
      const { ruta, url, ancho, alto } = await subirImagenDiseno(archivo, empresaId, destino === "fondo" ? 2400 : 1400);
      setImagenes((previas) => ({ ...previas, [ruta]: url }));
      if (destino === "fondo") cambiarCara((c) => ({ ...c, imagen: ruta }));
      else {
        const w = Math.min(30, W - m * 2);
        agregar({ id: nuevoId(), tipo: "imagen", ruta, ajuste: "contener", x: m, y: m, w, h: redondear((w * alto) / ancho) });
      }
    } catch (e) {
      setAviso({ error: e instanceof Error ? e.message : "No pudimos subir la imagen." });
    } finally {
      setOcupado("");
    }
  }

  // --- Arrastrar y cambiar de tamaño ---------------------------------------

  const aMm = (evento: PointerEvent) => {
    const lienzo = svg.current;
    const matriz = lienzo?.getScreenCTM();
    if (!lienzo || !matriz) return { x: 0, y: 0 };
    const punto = lienzo.createSVGPoint();
    punto.x = evento.clientX;
    punto.y = evento.clientY;
    return punto.matrixTransform(matriz.inverse());
  };

  function empezar(id: string, modo: Arrastre["modo"], evento: PointerEvent) {
    const e = cara.elementos.find((x) => x.id === id);
    if (!e) return;
    evento.stopPropagation();
    evento.preventDefault();
    setSel(id);
    arrastre.current = { id, modo, inicio: aMm(evento), original: { x: e.x, y: e.y, w: e.w, h: e.h }, movido: false };
    svg.current?.setPointerCapture(evento.pointerId);
    svg.current?.parentElement?.focus({ preventScroll: true });
  }

  /** Acerca un valor a la guía más próxima (centro, zona segura, corte o sangrado). */
  function pegar(valor: number, largo: number, total: number): { valor: number; centro: boolean } {
    const guiasDe = [m, total - m - largo, (total - largo) / 2, 0, total - largo, -s, total + s - largo];
    for (const [i, g] of guiasDe.entries()) {
      if (Math.abs(valor - g) <= IMAN) return { valor: g, centro: i === 2 };
    }
    return { valor: redondear(valor), centro: false };
  }

  function mover(evento: PointerEvent) {
    const a = arrastre.current;
    if (!a) return;
    const p = aMm(evento);
    const dx = p.x - a.inicio.x;
    const dy = p.y - a.inicio.y;
    if (!a.movido) {
      if (Math.abs(dx) < 0.3 && Math.abs(dy) < 0.3) return;
      a.movido = true;
      recordar(actual.current);
    }
    const o = a.original;
    if (a.modo === "mover") {
      const x = pegar(o.x + dx, o.w, W);
      const y = pegar(o.y + dy, o.h, H);
      setIman({ x: x.centro ? W / 2 : undefined, y: y.centro ? H / 2 : undefined });
      cambiarElemento(a.id, { x: x.valor, y: y.valor }, false);
      return;
    }
    const cuadrado = cara.elementos.find((e) => e.id === a.id)?.tipo === "qr";
    const izquierda = a.modo === "nw" || a.modo === "sw";
    const arriba = a.modo === "nw" || a.modo === "ne";
    let w = Math.max(MINIMO, o.w + (izquierda ? -dx : dx));
    let h = Math.max(MINIMO, o.h + (arriba ? -dy : dy));
    if (cuadrado) w = h = Math.max(w, h);
    cambiarElemento(
      a.id,
      {
        w: redondear(w),
        h: redondear(h),
        x: redondear(izquierda ? o.x + o.w - w : o.x),
        y: redondear(arriba ? o.y + o.h - h : o.y),
      },
      false,
    );
  }

  function soltar(evento: PointerEvent) {
    if (!arrastre.current) return;
    arrastre.current = null;
    setIman({});
    svg.current?.releasePointerCapture(evento.pointerId);
  }

  // --- Teclado --------------------------------------------------------------

  function duplicar(e: Elemento) {
    agregar({ ...e, id: nuevoId(), x: redondear(Math.min(e.x + 3, W - 2)), y: redondear(Math.min(e.y + 3, H - 2)) });
  }
  function borrar(id: string) {
    cambiarCara((c) => ({ ...c, elementos: c.elementos.filter((e) => e.id !== id) }));
    setSel(null);
  }
  function ordenar(id: string, hacia: "frente" | "atras") {
    cambiarCara((c) => {
      const e = c.elementos.find((x) => x.id === id);
      if (!e) return c;
      const resto = c.elementos.filter((x) => x.id !== id);
      return { ...c, elementos: hacia === "frente" ? [...resto, e] : [e, ...resto] };
    });
  }

  function tecla(evento: KeyboardEvent<HTMLDivElement>) {
    if ((evento.target as HTMLElement).closest("input, select, textarea")) return;
    const control = evento.ctrlKey || evento.metaKey;
    if (control && evento.key.toLowerCase() === "z") {
      evento.preventDefault();
      return deshacer();
    }
    if (!elegido) return;
    const paso = evento.shiftKey ? 2 : 0.5;
    const flechas: Record<string, Partial<Elemento>> = {
      ArrowLeft: { x: redondear(elegido.x - paso) },
      ArrowRight: { x: redondear(elegido.x + paso) },
      ArrowUp: { y: redondear(elegido.y - paso) },
      ArrowDown: { y: redondear(elegido.y + paso) },
    };
    if (flechas[evento.key]) {
      evento.preventDefault();
      cambiarElemento(elegido.id, flechas[evento.key]);
    } else if (evento.key === "Delete" || evento.key === "Backspace") {
      evento.preventDefault();
      borrar(elegido.id);
    } else if (evento.key === "Escape") {
      setSel(null);
    } else if (control && evento.key.toLowerCase() === "d") {
      evento.preventDefault();
      duplicar(elegido);
    }
  }

  // --- Caras, orientación y guardar ----------------------------------------

  function cambiarOrientacion(orientacion: Orientacion) {
    const nuevo = tamano(orientacion);
    // Lo que quedaría fuera del gafete se trae de regreso; el acomodo fino lo hace la persona.
    const ajustar = (c: Cara | null): Cara | null =>
      c && {
        ...c,
        elementos: c.elementos.map((e) => {
          const w = Math.min(e.w, nuevo.w + s * 2);
          const h = Math.min(e.h, nuevo.h + s * 2);
          return { ...e, w, h, x: redondear(Math.min(e.x, nuevo.w + s - w)), y: redondear(Math.min(e.y, nuevo.h + s - h)) } as Elemento;
        }),
      };
    cambiar((previo) => ({ orientacion, frente: ajustar(previo.frente)!, vuelta: ajustar(previo.vuelta) }));
  }

  function cambiarCaras(dos: boolean) {
    if (!dos) setLado("frente");
    setSel(null);
    cambiar((previo) => ({ ...previo, vuelta: dos ? (previo.vuelta ?? caraVacia()) : null }));
  }

  async function guardar() {
    setOcupado("guardando");
    const resultado = await guardarDiseno({ id: inicial.id, nombre, ...estado }).catch(() => ({
      error: "No pudimos guardar. Revisa tu conexión e intenta de nuevo.",
    }));
    setOcupado("");
    setAviso(resultado);
    if (!("error" in resultado && resultado.error)) setSucio(false);
  }

  // --- Avisos del diseño ----------------------------------------------------

  const avisos = useMemo(() => {
    const lista: { id: string; texto: string }[] = [];
    for (const e of cara.elementos) {
      if (e.tipo === "forma" || e.tipo === "imagen") continue;
      const fuera = e.x < m - 0.05 || e.y < m - 0.05 || e.x + e.w > W - m + 0.05 || e.y + e.h > H - m + 0.05;
      const quien = nombreDe(e, etiquetas);
      if (fuera) lista.push({ id: e.id, texto: `${quien} se sale de la zona segura y podría cortarse.` });
      if (e.tipo === "texto") {
        const texto = textoDe(e, datos, etiquetas);
        if (texto && acomodar(texto, e, e.tam, e.fuente, e.negrita, medir).recortado) {
          lista.push({ id: e.id, texto: `${quien} no cabe completo: agranda la caja o baja el tamaño de letra.` });
        }
      }
    }
    return lista;
  }, [cara.elementos, datos, etiquetas, medir, m, W, H]);

  const usados = new Set(cara.elementos.flatMap((e) => (e.tipo === "texto" && e.campo ? [e.campo] : [])));
  const tieneFoto = cara.elementos.some((e) => e.tipo === "foto");
  const tieneQr = cara.elementos.some((e) => e.tipo === "qr");
  const r = medidas.radioEsquina;
  const pestana = (activa: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-semibold transition-colors disabled:opacity-40 ${activa ? "bg-tinta text-white" : "hover:bg-white"}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-tarjeta border border-linea bg-white p-4">
        <label className="block min-w-[12rem] flex-1 text-sm">
          <span className="font-semibold">Nombre del diseño</span>
          <input
            value={nombre}
            maxLength={80}
            onChange={(e) => {
              setNombre(e.target.value);
              setSucio(true);
            }}
            className="mt-1 w-full rounded-tarjeta-chica border border-linea bg-white px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Orientación</span>
          <select value={estado.orientacion} onChange={(e) => cambiarOrientacion(e.target.value as Orientacion)} className="mt-1 block rounded-tarjeta-chica border border-linea bg-white px-3 py-2">
            <option value="horizontal">Horizontal</option>
            <option value="vertical">Vertical</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Caras</span>
          <select value={estado.vuelta ? "dos" : "una"} onChange={(e) => cambiarCaras(e.target.value === "dos")} className="mt-1 block rounded-tarjeta-chica border border-linea bg-white px-3 py-2">
            <option value="una">Solo frente</option>
            <option value="dos">Frente y vuelta</option>
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={deshacer} disabled={!puedeDeshacer} className={`${claseBotonSecundario} px-4 py-2 text-sm`}>
            Deshacer
          </button>
          <button type="button" onClick={guardar} disabled={Boolean(ocupado) || !nombre.trim()} className={`${claseBoton} py-2`}>
            {ocupado === "guardando" ? "Guardando…" : "Guardar"}
          </button>
        </div>
        <p role="status" className={`basis-full text-sm font-medium ${aviso.error ? "text-rojo-oscuro" : "text-[#0a7d4f]"}`}>
          {aviso.error ?? aviso.ok ?? (sucio ? <span className="text-gris">Tienes cambios sin guardar.</span> : null)}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)_17rem]">
        <div className={`${elegido ? "order-3" : "order-2"} space-y-4 rounded-tarjeta border border-linea bg-white p-4 lg:order-none`}>
          <div>
            <h2 className="font-titulos text-lg font-extrabold">Agregar</h2>
            <p className="mt-0.5 text-xs text-gris">Campos de tu equipo: cambian con cada persona.</p>
            <div className="mt-2 space-y-1.5">
              {camposTexto.map((c) => (
                <button key={c.clave} type="button" onClick={() => agregarCampo(c.clave)} className={botonPanel}>
                  {c.etiqueta}
                  {usados.has(c.clave) ? <span className="shrink-0 whitespace-nowrap text-xs text-[#0a7d4f]">✓ puesto</span> : <span aria-hidden>+</span>}
                </button>
              ))}
              <button type="button" onClick={agregarFoto} className={botonPanel}>
                Fotografía
                {tieneFoto ? <span className="shrink-0 whitespace-nowrap text-xs text-[#0a7d4f]">✓ puesta</span> : <span aria-hidden>+</span>}
              </button>
              <button type="button" onClick={agregarQr} className={botonPanel}>
                Código QR
                {tieneQr ? <span className="shrink-0 whitespace-nowrap text-xs text-[#0a7d4f]">✓ puesto</span> : <span aria-hidden>+</span>}
              </button>
            </div>
            <p className="mt-3 text-xs text-gris">Fijos: iguales en todos los gafetes.</p>
            <div className="mt-2 space-y-1.5">
              <button type="button" onClick={agregarTexto} className={botonPanel}>Texto <span aria-hidden>+</span></button>
              <label className={`${botonPanel} cursor-pointer`}>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => subir(e, "imagen")} disabled={Boolean(ocupado)} className="sr-only" />
                Logo o imagen <span aria-hidden>+</span>
              </label>
              <button type="button" onClick={agregarForma} className={botonPanel}>Forma de color <span aria-hidden>+</span></button>
            </div>
          </div>
          <div className="border-t border-linea pt-3">
            <h2 className="font-titulos text-lg font-extrabold">Fondo</h2>
            <label className="mt-2 flex items-center justify-between gap-3 text-sm">
              <span className="font-medium">Color</span>
              <input type="color" value={cara.fondo} onChange={(e) => cambiarCara((c) => ({ ...c, fondo: e.target.value }))} className="h-9 w-16 cursor-pointer rounded-tarjeta-chica border border-linea bg-white p-1" />
            </label>
            <label className={`${botonPanel} mt-2 cursor-pointer`}>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => subir(e, "fondo")} disabled={Boolean(ocupado)} className="sr-only" />
              {cara.imagen ? "Cambiar mi fondo" : "Subir mi fondo"} <span aria-hidden>+</span>
            </label>
            {cara.imagen ? (
              <button type="button" onClick={() => cambiarCara((c) => ({ ...c, imagen: undefined }))} className="mt-2 text-sm underline">
                Quitar el fondo
              </button>
            ) : (
              <p className="mt-2 text-xs text-gris">
                ¿Ya tienes tu diseño hecho? Súbelo como fondo de 1058 × 685 px y pon encima los campos. Esa medida ya incluye el margen de corte: lleva tu fondo hasta la orilla.
              </p>
            )}
            {ocupado === "subiendo" ? <p className="mt-2 text-sm text-gris">Subiendo imagen…</p> : null}
          </div>
        </div>

        <div className="order-1 min-w-0 space-y-3 lg:order-none">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1 rounded-full bg-linea/60 p-1">
              <button type="button" aria-pressed={lado === "frente"} onClick={() => { setLado("frente"); setSel(null); }} className={pestana(lado === "frente")}>
                Frente
              </button>
              <button type="button" aria-pressed={lado === "vuelta"} disabled={!estado.vuelta} onClick={() => { setLado("vuelta"); setSel(null); }} className={pestana(lado === "vuelta")}>
                Vuelta
              </button>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={guias} onChange={(e) => setGuias(e.target.checked)} className="size-4 accent-tinta" />
              Ver guías de impresión
            </label>
          </div>

          <div
            tabIndex={0}
            onKeyDown={tecla}
            aria-label="Lienzo del diseño. Con un elemento seleccionado, usa las flechas para moverlo y Suprimir para quitarlo."
            className="rounded-tarjeta bg-[#dfe2ec] p-2 outline-none focus-visible:ring-2 focus-visible:ring-tinta sm:p-4"
          >
            <GafeteSvg
              svgRef={svg}
              cara={cara}
              orientacion={estado.orientacion}
              datos={datos}
              etiquetas={etiquetas}
              foto={persona?.foto}
              imagenes={imagenes}
              modo="completo"
              titulo={`Diseño, ${lado}`}
              className={`mx-auto block w-full touch-none select-none ${estado.orientacion === "vertical" ? "max-w-[26rem]" : "max-w-[44rem]"}`}
              alTocar={(id, evento) => empezar(id, "mover", evento)}
              eventos={{ onPointerDown: () => setSel(null), onPointerMove: mover, onPointerUp: soltar, onPointerCancel: soltar }}
            >
              {guias ? (
                <g pointerEvents="none">
                  <path
                    fillRule="evenodd"
                    fill={ROJO}
                    fillOpacity={0.22}
                    d={`M${-s} ${-s}h${W + s * 2}v${H + s * 2}h${-(W + s * 2)}z M${r} 0h${W - r * 2}a${r} ${r} 0 0 1 ${r} ${r}v${H - r * 2}a${r} ${r} 0 0 1 ${-r} ${r}h${-(W - r * 2)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(H - r * 2)}a${r} ${r} 0 0 1 ${r} ${-r}z`}
                  />
                  <rect x={0} y={0} width={W} height={H} rx={r} fill="none" stroke="#1b1f3b" strokeWidth={0.3} />
                  <rect x={m} y={m} width={W - m * 2} height={H - m * 2} rx={1.2} fill="none" stroke={VERDE} strokeWidth={0.3} strokeDasharray="1.8 1.2" />
                </g>
              ) : (
                <rect x={0} y={0} width={W} height={H} rx={r} fill="none" stroke="#1b1f3b" strokeOpacity={0.35} strokeWidth={0.2} pointerEvents="none" />
              )}
              <g pointerEvents="none" stroke={AZUL} strokeWidth={0.25} strokeDasharray="1 1">
                {iman.x !== undefined ? <line x1={iman.x} y1={-s} x2={iman.x} y2={H + s} /> : null}
                {iman.y !== undefined ? <line x1={-s} y1={iman.y} x2={W + s} y2={iman.y} /> : null}
              </g>
              {elegido ? (
                <g>
                  <rect x={elegido.x} y={elegido.y} width={elegido.w} height={elegido.h} fill="none" stroke={AZUL} strokeWidth={0.35} pointerEvents="none" />
                  {(elegido.tipo === "qr" ? (["se"] as Esquina[]) : (["nw", "ne", "sw", "se"] as Esquina[])).map((esquina) => (
                    <rect
                      key={esquina}
                      data-esquina={esquina}
                      x={elegido.x + (esquina.endsWith("e") ? elegido.w : 0) - 1}
                      y={elegido.y + (esquina.startsWith("s") ? elegido.h : 0) - 1}
                      width={2}
                      height={2}
                      rx={0.4}
                      fill="#fff"
                      stroke={AZUL}
                      strokeWidth={0.35}
                      style={{ cursor: esquina === "nw" || esquina === "se" ? "nwse-resize" : "nesw-resize" }}
                      onPointerDown={(evento) => empezar(elegido.id, esquina, evento)}
                    />
                  ))}
                </g>
              ) : null}
            </GafeteSvg>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <label className="flex items-center gap-2">
              <span className="font-semibold">Probar con</span>
              <select value={personaId} onChange={(e) => setPersonaId(e.target.value)} className="max-w-[14rem] rounded-tarjeta-chica border border-linea bg-white px-2.5 py-1.5">
                <option value="">Datos de ejemplo</option>
                {personas.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </label>
            {sucio ? (
              <span className="text-gris">Guarda para ver cómo queda con todo tu equipo.</span>
            ) : (
              <Link href={`/cuenta/disenos/${inicial.id}/vista`} className="font-semibold text-rojo underline underline-offset-4">
                Ver cada gafete de mi equipo
              </Link>
            )}
          </div>
          {guias ? (
            <p className="text-xs text-gris">
              <span className="font-semibold text-rojo-oscuro">Rojo:</span> margen de corte. Esa orilla se recorta, así que tu fondo debe llegar hasta ahí.{" "}
              <span className="font-semibold text-tinta">Línea negra:</span> por donde pasa el corte.{" "}
              <span className="font-semibold text-[#0a7d4f]">Verde punteado:</span> zona segura para textos, foto y QR.
            </p>
          ) : null}
          {avisos.length ? (
            <ul className="space-y-1 rounded-tarjeta-chica bg-resaltador/30 p-3 text-sm">
              {avisos.map((a, i) => (
                <li key={`${a.id}-${i}`}>
                  <button type="button" onClick={() => setSel(a.id)} className="text-left underline-offset-4 hover:underline">
                    {a.texto}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className={`${elegido ? "order-2" : "order-3"} rounded-tarjeta border border-linea bg-white p-4 lg:order-none`}>
          {elegido ? (
            <PanelElemento
              elemento={elegido}
              campos={camposTexto}
              ancho={W}
              alCambiar={(parche) => cambiarElemento(elegido.id, parche)}
              alOrdenar={(hacia) => ordenar(elegido.id, hacia)}
              alDuplicar={() => duplicar(elegido)}
              alBorrar={() => borrar(elegido.id)}
            />
          ) : (
            <div>
              <h2 className="font-titulos text-lg font-extrabold">En esta cara</h2>
              {cara.elementos.length ? (
                <ul className="mt-2 space-y-1.5">
                  {[...cara.elementos].reverse().map((e) => (
                    <li key={e.id}>
                      <button type="button" onClick={() => setSel(e.id)} className={botonPanel}>
                        <span className="truncate">{nombreDe(e, etiquetas)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-gris">Está vacía. Agrega campos de tu equipo, tu logo o sube tu fondo.</p>
              )}
              <p className="mt-3 text-xs text-gris">
                Toca un elemento para moverlo, cambiarle el tamaño desde sus esquinas o editarlo. Con el teclado: flechas
                para mover, Suprimir para quitar y Ctrl + Z para deshacer.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
