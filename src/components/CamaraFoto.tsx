"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Cámara dentro de la página para la selfie del gafete. La vista previa se ve
 * en espejo, como un espejo de verdad, pero la foto se guarda al derecho: así
 * lo que está a la izquierda de la persona queda a la izquierda en su gafete.
 */
export function CamaraFoto({ alTomar, alCerrar }: { alTomar: (foto: ImageBitmap) => void; alCerrar: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  const [lista, setLista] = useState(false);

  useEffect(() => {
    let flujo: MediaStream | undefined;
    let vivo = true;
    const abrir = navigator.mediaDevices
      ? navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
      : () => Promise.reject(new Error("Sin cámara"));
    abrir({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false })
      .then((f) => {
        if (!vivo) return f.getTracks().forEach((t) => t.stop());
        flujo = f;
        if (video.current) {
          video.current.srcObject = f;
          void video.current.play().then(() => setLista(true));
        }
      })
      .catch(() => setError("No pudimos abrir la cámara. Revisa que le diste permiso, o elige una foto de tu galería."));
    return () => {
      vivo = false;
      flujo?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function tomar() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    // Se captura el cuadro tal cual llega de la cámara, sin el espejo de la vista previa.
    alTomar(await createImageBitmap(v));
  }

  return (
    <div className="rounded-tarjeta-chica border border-linea bg-tinta p-3 text-white">
      {error ? (
        <p role="alert" className="p-3 text-sm">{error}</p>
      ) : (
        <div className="relative mx-auto aspect-[3/4] w-full max-w-xs overflow-hidden rounded-tarjeta-chica bg-black">
          <video ref={video} playsInline muted className="size-full -scale-x-100 object-cover" />
          <div aria-hidden className="pointer-events-none absolute inset-[12%_18%_30%] rounded-[50%] border-2 border-white/70" />
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
        {error ? null : (
          <button type="button" onClick={tomar} disabled={!lista} className="rounded-full bg-white px-5 py-2.5 font-semibold text-tinta disabled:opacity-50">
            {lista ? "Tomar foto" : "Abriendo cámara…"}
          </button>
        )}
        <button type="button" onClick={alCerrar} className="px-3 py-2 text-sm font-semibold underline underline-offset-4">
          Cancelar
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-white/70">Acomoda tu cara dentro del óvalo.</p>
    </div>
  );
}
