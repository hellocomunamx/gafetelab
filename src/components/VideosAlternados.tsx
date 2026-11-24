"use client";

import { useEffect, useRef, useState } from "react";

export type VideoAlternado = {
  src: string;
  portada: string;
  titulo: string;
  /** Texto corto que va debajo del video, por ejemplo "Para tu equipo". */
  etiqueta: string;
};

/**
 * Videos de presentación que se turnan en loop: cuando termina uno arranca el
 * siguiente, y del último se regresa al primero. Arrancan solos y en silencio
 * cuando la sección entra en pantalla y se pausan al salir. Siempre tienen los
 * controles del navegador (play, pausa, barra para regresar o adelantar). El
 * botón «Activar sonido» reinicia el video en turno con audio, y los que siguen
 * ya suenan. Si la persona pidió menos movimiento, no arrancan solos.
 */
export function VideosAlternados({ videos }: { videos: VideoAlternado[] }) {
  const refs = useRef<(HTMLVideoElement | null)[]>([]);
  const contenedor = useRef<HTMLDivElement>(null);
  const [turno, setTurno] = useState(0);
  const [conSonido, setConSonido] = useState(false);
  // Copias en ref para leerlas en los manejadores sin recrearlos.
  const turnoRef = useRef(0);
  const sonidoRef = useRef(false);
  const visible = useRef(false);
  /** La persona pausó a mano: no se reanuda solo al volver a la sección. */
  const pausaManual = useRef(false);
  /** Pausas que hace el propio componente, para no confundirlas con las de la persona. */
  const pausaPropia = useRef(false);

  function pausar(v: HTMLVideoElement) {
    if (v.paused) return;
    pausaPropia.current = true;
    v.pause();
  }

  function reproducir(i: number, desdeInicio = false) {
    refs.current.forEach((otro, j) => {
      if (otro && j !== i) pausar(otro);
    });
    const v = refs.current[i];
    if (!v) return;
    turnoRef.current = i;
    setTurno(i);
    v.muted = !sonidoRef.current;
    if (desdeInicio) v.currentTime = 0;
    pausaManual.current = false;
    v.play().catch(() => {});
  }

  useEffect(() => {
    const caja = contenedor.current;
    if (!caja || !("IntersectionObserver" in window)) return;
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const observador = new IntersectionObserver(
      ([entrada]) => {
        visible.current = entrada.isIntersecting;
        const v = refs.current[turnoRef.current];
        if (!v) return;
        if (!entrada.isIntersecting) return pausar(v);
        if (quieto || pausaManual.current) return;
        reproducir(turnoRef.current);
      },
      { threshold: 0.4 },
    );
    observador.observe(caja);
    return () => observador.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function alTerminar(i: number) {
    const siguiente = (i + 1) % videos.length;
    if (visible.current) reproducir(siguiente, true);
    else {
      turnoRef.current = siguiente;
      setTurno(siguiente);
    }
  }

  function alReproducir(i: number) {
    // Si la persona le dio play a otro video, ese pasa a ser el turno.
    if (i !== turnoRef.current) {
      refs.current.forEach((otro, j) => {
        if (otro && j !== i) pausar(otro);
      });
      turnoRef.current = i;
      setTurno(i);
    }
    pausaManual.current = false;
  }

  function alPausar(v: HTMLVideoElement) {
    if (pausaPropia.current) {
      pausaPropia.current = false;
      return;
    }
    // Al terminar, el navegador también pausa: eso no es una pausa a mano.
    if (!v.ended) pausaManual.current = true;
  }

  function alCambiarVolumen(v: HTMLVideoElement) {
    // Si activan el sonido desde los controles, los siguientes también suenan.
    if (!v.muted && !sonidoRef.current) {
      sonidoRef.current = true;
      setConSonido(true);
    } else if (v.muted && sonidoRef.current) {
      sonidoRef.current = false;
      setConSonido(false);
    }
  }

  function activarSonido() {
    sonidoRef.current = true;
    setConSonido(true);
    reproducir(turnoRef.current, true);
  }

  return (
    <div ref={contenedor} className="grid gap-8 lg:grid-cols-2 lg:gap-6">
      {videos.map((video, i) => (
        <figure key={video.src}>
          <div
            className={`relative overflow-hidden rounded-tarjeta bg-papel shadow-xl ring-1 transition-shadow ${
              i === turno ? "ring-2 ring-rojo" : "ring-linea"
            }`}
          >
            <video
              ref={(el) => {
                refs.current[i] = el;
              }}
              className="block aspect-video w-full"
              poster={video.portada}
              preload={i === 0 ? "metadata" : "none"}
              playsInline
              muted
              controls
              aria-label={video.titulo}
              onEnded={() => alTerminar(i)}
              onPlay={() => alReproducir(i)}
              onPause={(e) => alPausar(e.currentTarget)}
              onVolumeChange={(e) => alCambiarVolumen(e.currentTarget)}
            >
              <source src={video.src} type="video/mp4" />
              <a href={video.src}>Ver el video</a>
            </video>
            {conSonido || i !== turno ? null : (
              <button
                type="button"
                onClick={activarSonido}
                className="absolute top-3 right-3 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-tinta shadow-lg transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-rojo focus-visible:outline-none sm:top-4 sm:right-4"
              >
                <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
                  <path
                    d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5zM15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Activar sonido
              </button>
            )}
          </div>
          <figcaption className="mt-3 text-center font-titulos text-lg font-extrabold">
            {video.etiqueta}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
