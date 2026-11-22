"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Video de presentación. Arranca solo y en silencio cuando entra en pantalla,
 * y se pausa al salir. El botón «Activar sonido» lo reinicia con audio y deja
 * los controles del navegador. Si la persona pidió menos movimiento, no
 * arranca solo: espera a que le den play.
 */
export function VideoPitch({
  src,
  portada,
  titulo,
  duracion,
}: {
  src: string;
  portada: string;
  titulo: string;
  /** Texto corto, por ejemplo "50 segundos". */
  duracion: string;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [conSonido, setConSonido] = useState(false);
  const [andando, setAndando] = useState(false);
  // Se lee dentro de los efectos para no volver a crearlos en cada cambio.
  const sonido = useRef(false);

  useEffect(() => {
    const v = video.current;
    if (!v || !("IntersectionObserver" in window)) return;
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada.isIntersecting) return v.pause();
        // Con sonido no se reanuda solo: sería audio que nadie pidió.
        if (quieto || sonido.current) return;
        v.muted = true;
        v.play().catch(() => {});
      },
      { threshold: 0.5 },
    );
    observador.observe(v);
    return () => observador.disconnect();
  }, []);

  function activarSonido() {
    const v = video.current;
    if (!v) return;
    sonido.current = true;
    setConSonido(true);
    v.muted = false;
    v.loop = false;
    v.currentTime = 0;
    v.play().catch(() => {});
  }

  return (
    <div className="relative overflow-hidden rounded-tarjeta bg-papel shadow-xl ring-1 ring-linea">
      <video
        ref={video}
        className="block aspect-video w-full"
        poster={portada}
        preload="none"
        playsInline
        muted
        loop
        controls={conSonido}
        aria-label={titulo}
        onPlay={() => setAndando(true)}
        onPause={() => setAndando(false)}
      >
        <source src={src} type="video/mp4" />
        <a href={src}>Ver el video ({duracion})</a>
      </video>
      {conSonido ? null : (
        <button
          type="button"
          onClick={activarSonido}
          className="absolute right-3 bottom-3 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-tinta shadow-lg transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-rojo focus-visible:outline-none sm:right-4 sm:bottom-4"
        >
          <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
            {andando ? (
              <path
                d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5zM15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : (
              <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
            )}
          </svg>
          {andando ? "Activar sonido" : `Ver el video (${duracion})`}
        </button>
      )}
    </div>
  );
}
