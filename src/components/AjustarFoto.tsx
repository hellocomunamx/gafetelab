"use client";

import { type KeyboardEvent, type PointerEvent, useCallback, useEffect, useRef, useState } from "react";
import { claseBoton, claseBotonSecundario } from "@/components/cuenta/clases";
import {
  acercar,
  copiaParaEditar,
  type Encuadre,
  encuadreInicial,
  FOTO,
  limitarEncuadre,
  pintarFoto,
  prepararFoto,
  ZOOM_MAXIMO,
} from "@/lib/cuenta/imagen";

export type FotoAjustada = {
  /** La foto final: JPEG de 600 × 800, lista para subir. */
  foto: Blob;
  encuadre: Encuadre;
  espejo: boolean;
};

/** Proporción del recuadro dentro del área de trabajo: alrededor se ve la foto atenuada. */
const ALTO_RECUADRO = 0.84;

/**
 * Encuadre de la foto del gafete, como al poner foto de perfil: se arrastra
 * para moverla y se acerca o aleja con la rueda del ratón, pellizcando en el
 * celular o con la barra. El recuadro tiene la proporción de la foto del gafete.
 */
export function AjustarFoto({
  fuente,
  inicial,
  espejoInicial = false,
  conEspejo = true,
  alListo,
  alCancelar,
}: {
  fuente: Blob | ImageBitmap;
  /** Encuadre previo, para volver a ajustar sin perder lo que ya se movió. */
  inicial?: Encuadre;
  espejoInicial?: boolean;
  /** Ofrecer voltear la foto (para selfies que salen en espejo). */
  conEspejo?: boolean;
  alListo: (resultado: FotoAjustada) => void;
  alCancelar: () => void;
}) {
  const [imagen, setImagen] = useState<ImageBitmap>();
  const [encuadre, setEncuadre] = useState<Encuadre>();
  const [espejo, setEspejo] = useState(espejoInicial);
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [lado, setLado] = useState(0);
  const area = useRef<HTMLDivElement>(null);
  const lienzo = useRef<HTMLCanvasElement>(null);
  const dedos = useRef(new Map<number, { x: number; y: number }>());
  const dialogo = useRef<HTMLDivElement>(null);
  const cancelar = useRef(alCancelar);
  useEffect(() => {
    cancelar.current = alCancelar;
  }, [alCancelar]);

  // Abrir una copia ligera de la imagen.
  useEffect(() => {
    let vivo = true;
    let abierta: ImageBitmap | undefined;
    copiaParaEditar(fuente)
      .then((copia) => {
        if (copia !== fuente) abierta = copia;
        if (!vivo) return abierta?.close();
        setImagen(copia);
        setEncuadre(limitarEncuadre(copia, inicial ?? encuadreInicial(copia)));
      })
      .catch(() => vivo && setError("No pudimos leer esa imagen. Usa una foto JPG o PNG."));
    return () => {
      vivo = false;
      abierta?.close();
    };
    // Solo al abrir: el encuadre inicial no debe reiniciar el editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fuente]);

  // Medir el área de trabajo (cambia al girar el celular).
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const medir = () => setLado(el.clientWidth);
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  // Sin desplazar la página de fondo mientras el editor está abierto; Escape cancela.
  useEffect(() => {
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogo.current?.focus();
    const tecla = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") cancelar.current();
    };
    window.addEventListener("keydown", tecla);
    return () => {
      document.body.style.overflow = previo;
      window.removeEventListener("keydown", tecla);
    };
  }, []);

  // Geometría: el recuadro 3:4 va centrado en un área cuadrada.
  const altoRecuadro = lado * ALTO_RECUADRO;
  const escala = altoRecuadro / FOTO.alto;
  const origenX = (lado - FOTO.ancho * escala) / 2;
  const origenY = (lado - altoRecuadro) / 2;

  /** Pasa un punto de la pantalla a pixeles de la foto final. */
  const aFoto = useCallback(
    (clienteX: number, clienteY: number) => {
      const caja = area.current?.getBoundingClientRect();
      if (!caja || !escala) return { x: FOTO.ancho / 2, y: FOTO.alto / 2 };
      return { x: (clienteX - caja.left - origenX) / escala, y: (clienteY - caja.top - origenY) / escala };
    },
    [escala, origenX, origenY],
  );

  // Dibujar.
  useEffect(() => {
    const c = lienzo.current;
    if (!c || !imagen || !encuadre || !lado) return;
    const ppp = window.devicePixelRatio || 1;
    c.width = Math.round(lado * ppp);
    c.height = Math.round(lado * ppp);
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const origen = { x: origenX, y: origenY };
    ctx.setTransform(ppp, 0, 0, ppp, 0, 0);
    ctx.fillStyle = "#1b1f3b";
    ctx.fillRect(0, 0, lado, lado);
    pintarFoto(ctx, imagen, encuadre, { espejo, origen, escala });
    // Atenuar lo que queda fuera del recuadro.
    const ancho = FOTO.ancho * escala;
    ctx.fillStyle = "rgba(27, 31, 59, 0.62)";
    ctx.beginPath();
    ctx.rect(0, 0, lado, lado);
    ctx.rect(origen.x, origen.y, ancho, altoRecuadro);
    ctx.fill("evenodd");
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(origen.x, origen.y, ancho, altoRecuadro);
    // Guía de la cara, igual que en la cámara.
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(origen.x + ancho / 2, origen.y + altoRecuadro * 0.41, ancho * 0.32, altoRecuadro * 0.29, 0, 0, Math.PI * 2);
    ctx.stroke();
  }, [imagen, encuadre, espejo, lado, escala, origenX, origenY, altoRecuadro]);

  const mover = useCallback(
    (dx: number, dy: number) =>
      setEncuadre((e) => (e && imagen ? limitarEncuadre(imagen, { ...e, x: e.x + dx, y: e.y + dy }) : e)),
    [imagen],
  );
  const zoomEn = useCallback(
    (zoom: (actual: number) => number, punto?: { x: number; y: number }) =>
      setEncuadre((e) => (e && imagen ? acercar(imagen, e, zoom(e.zoom), punto) : e)),
    [imagen],
  );

  // Rueda del ratón o pellizco del panel táctil (llega como rueda con Ctrl).
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const rueda = (e: WheelEvent) => {
      e.preventDefault();
      const paso = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      const factor = Math.exp(-paso * (e.ctrlKey ? 0.01 : 0.0015));
      zoomEn((z) => z * factor, aFoto(e.clientX, e.clientY));
    };
    el.addEventListener("wheel", rueda, { passive: false });
    return () => el.removeEventListener("wheel", rueda);
  }, [zoomEn, aFoto]);

  function alPresionar(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dedos.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  function alMover(e: PointerEvent<HTMLDivElement>) {
    const lista = dedos.current;
    const antes = lista.get(e.pointerId);
    if (!antes || !escala) return;
    if (lista.size === 1) {
      lista.set(e.pointerId, { x: e.clientX, y: e.clientY });
      return mover((e.clientX - antes.x) / escala, (e.clientY - antes.y) / escala);
    }
    // Dos dedos: pellizco para el zoom y arrastre con el punto medio.
    const [a, b] = [...lista.entries()].slice(0, 2);
    const otro = a[0] === e.pointerId ? b[1] : a[1];
    const distancia = (p: { x: number; y: number }) => Math.hypot(p.x - otro.x, p.y - otro.y);
    const ahora = { x: e.clientX, y: e.clientY };
    lista.set(e.pointerId, ahora);
    const medioAntes = { x: (antes.x + otro.x) / 2, y: (antes.y + otro.y) / 2 };
    const medioAhora = { x: (ahora.x + otro.x) / 2, y: (ahora.y + otro.y) / 2 };
    const factor = distancia(antes) > 0 ? distancia(ahora) / distancia(antes) : 1;
    mover((medioAhora.x - medioAntes.x) / escala, (medioAhora.y - medioAntes.y) / escala);
    zoomEn((z) => z * factor, aFoto(medioAhora.x, medioAhora.y));
  }

  function alSoltar(e: PointerEvent<HTMLDivElement>) {
    dedos.current.delete(e.pointerId);
  }

  // Teclado: flechas para mover, + y − para el zoom.
  function alTeclear(e: KeyboardEvent<HTMLDivElement>) {
    const paso = e.shiftKey ? 40 : 10;
    const acciones: Record<string, () => void> = {
      ArrowLeft: () => mover(-paso, 0),
      ArrowRight: () => mover(paso, 0),
      ArrowUp: () => mover(0, -paso),
      ArrowDown: () => mover(0, paso),
      "+": () => zoomEn((z) => z * 1.1),
      "=": () => zoomEn((z) => z * 1.1),
      "-": () => zoomEn((z) => z / 1.1),
    };
    const accion = acciones[e.key];
    if (!accion) return;
    e.preventDefault();
    accion();
  }

  async function usar() {
    if (!encuadre) return;
    setOcupado(true);
    setError("");
    try {
      // La foto final sale del archivo original, no de la copia del editor.
      const foto = await prepararFoto(fuente, { encuadre, espejo });
      alListo({ foto, encuadre, espejo });
    } catch {
      setError("No pudimos preparar la foto. Intenta con otra imagen.");
      setOcupado(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-tinta/70 p-0 sm:items-center sm:p-4">
      <div
        ref={dialogo}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ajustar-foto-titulo"
        tabIndex={-1}
        className="max-h-full w-full max-w-md overflow-y-auto rounded-t-tarjeta bg-white p-5 outline-none sm:rounded-tarjeta"
      >
        <h2 id="ajustar-foto-titulo" className="font-titulos text-lg font-extrabold">Acomoda la foto</h2>
        <p className="mt-1 text-sm text-gris">
          Arrástrala para moverla y acércala con la barra, la rueda del ratón o pellizcando. Lo que queda dentro del
          recuadro es lo que sale en el gafete.
        </p>

        <div
          ref={area}
          tabIndex={0}
          role="application"
          aria-label="Encuadre de la foto. Usa las flechas para moverla y las teclas más y menos para acercar o alejar."
          onPointerDown={alPresionar}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerCancel={alSoltar}
          onKeyDown={alTeclear}
          className="relative mx-auto mt-4 aspect-square w-full max-w-sm cursor-grab touch-none select-none overflow-hidden rounded-tarjeta-chica bg-tinta active:cursor-grabbing"
        >
          <canvas ref={lienzo} className="absolute inset-0 size-full" />
          {!imagen && !error ? (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-white/80">Abriendo foto…</p>
          ) : null}
        </div>

        <div className="mx-auto mt-4 flex max-w-sm items-center gap-3">
          <button
            type="button"
            onClick={() => zoomEn((z) => z / 1.2)}
            disabled={!encuadre || encuadre.zoom <= 1}
            aria-label="Alejar"
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-linea text-xl font-semibold disabled:opacity-40"
          >
            −
          </button>
          <input
            type="range"
            min={1}
            max={ZOOM_MAXIMO}
            step={0.01}
            value={encuadre?.zoom ?? 1}
            onChange={(e) => zoomEn(() => Number(e.target.value))}
            disabled={!encuadre}
            aria-label="Zoom"
            className="h-2 w-full cursor-pointer accent-rojo"
          />
          <button
            type="button"
            onClick={() => zoomEn((z) => z * 1.2)}
            disabled={!encuadre || encuadre.zoom >= ZOOM_MAXIMO}
            aria-label="Acercar"
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-linea text-xl font-semibold disabled:opacity-40"
          >
            +
          </button>
        </div>

        <div className="mx-auto mt-3 flex max-w-sm flex-wrap justify-center gap-x-5 gap-y-1 text-sm">
          {conEspejo ? (
            <button type="button" onClick={() => setEspejo((v) => !v)} disabled={!imagen} className="font-semibold underline underline-offset-4">
              ¿Salió al revés? Voltear
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => imagen && setEncuadre(encuadreInicial(imagen))}
            disabled={!imagen}
            className="font-semibold underline underline-offset-4"
          >
            Volver a centrar
          </button>
        </div>

        {error ? <p role="alert" className="mt-4 rounded-tarjeta-chica bg-rojo/10 p-3 text-sm font-medium text-rojo-oscuro">{error}</p> : null}

        <div className="mt-5 flex gap-2">
          <button type="button" onClick={alCancelar} disabled={ocupado} className={`${claseBotonSecundario} flex-1`}>
            Cancelar
          </button>
          <button type="button" onClick={usar} disabled={!encuadre || ocupado} className={`${claseBoton} flex-1`}>
            {ocupado ? "Preparando…" : "Usar esta foto"}
          </button>
        </div>
      </div>
    </div>
  );
}
