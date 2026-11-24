"use client";

import { useState } from "react";
import type { GafeteDigital } from "@/lib/cuenta/gafete-digital";

/**
 * Botón «Descargar mi gafete»: arma una imagen con frente y reverso, con marca
 * de agua y la fecha. En el celular abre el menú de compartir para guardarla
 * en Fotos; en la computadora la baja como archivo.
 */
export function DescargarGafete({ gafete, bloqueado }: { gafete: GafeteDigital; bloqueado: boolean }) {
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState("");

  async function descargar() {
    setError("");
    setTrabajando(true);
    try {
      const { imagenDelGafete, nombreDeArchivo } = await import("@/lib/cuenta/descarga-gafete");
      const imagen = await imagenDelGafete(gafete);
      const nombre = nombreDeArchivo(gafete.nombre);
      const archivo = new File([imagen], nombre, { type: "image/png" });
      const celular = window.matchMedia("(pointer: coarse)").matches;
      if (celular && navigator.canShare?.({ files: [archivo] })) {
        try {
          await navigator.share({ files: [archivo], title: "Mi gafete" });
          return;
        } catch (e) {
          if (e instanceof DOMException && e.name === "AbortError") return;
          // Si no se pudo compartir, se baja como archivo.
        }
      }
      const liga = URL.createObjectURL(imagen);
      const a = document.createElement("a");
      a.href = liga;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(liga), 10_000);
    } catch {
      setError("No pudimos armar la imagen. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setTrabajando(false);
    }
  }

  if (bloqueado) {
    return <p className="text-center text-sm text-gris">La descarga está disponible solo mientras tu gafete esté vigente.</p>;
  }
  return (
    <div className="text-center">
      <button
        type="button"
        onClick={descargar}
        disabled={trabajando}
        className="inline-flex items-center gap-2 rounded-full border border-tinta bg-white px-5 py-2.5 text-sm font-semibold text-tinta hover:bg-papel disabled:opacity-60"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v12m0 0-5-5m5 5 5-5M4 19h16" />
        </svg>
        {trabajando ? "Preparando la imagen…" : "Descargar mi gafete"}
      </button>
      <p className="mt-2 text-xs text-gris">
        Se descarga como imagen con la fecha de hoy y la marca «Copia».{" "}
        {gafete.verificable ? "La vigencia siempre se comprueba escaneando el código QR." : ""}
      </p>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-rojo-oscuro">
          {error}
        </p>
      ) : null}
    </div>
  );
}
