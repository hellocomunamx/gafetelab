"use client";

import { useState } from "react";
import { GafeteSvg } from "@/components/diseno/GafeteSvg";
import { QrSvg } from "@/components/QrSvg";
import type { GafeteDigital } from "@/lib/cuenta/gafete-digital";

const SELLOS = {
  vigente: { texto: "Vigente", clase: "bg-[#0a7d4f] text-white" },
  expirado: { texto: "Expirado", clase: "bg-rojo-oscuro text-white" },
  baja: { texto: "No válido", clase: "bg-tinta text-white" },
  pendiente: { texto: "Aún no activo", clase: "bg-resaltador text-tinta" },
} as const;

/**
 * El gafete digital en el celular de la persona: su gafete por frente y
 * vuelta, el código QR en grande para que lo escaneen y cómo guardarlo en la
 * pantalla de inicio.
 */
export function GafeteDigitalVista({ gafete, estado }: { gafete: GafeteDigital; estado: keyof typeof SELLOS | null }) {
  const [vuelta, setVuelta] = useState(false);
  const tieneVuelta = gafete.tipo === "diseno" ? Boolean(gafete.diseno.vuelta) : Boolean(gafete.vuelta);
  const viendoVuelta = tieneVuelta && vuelta;
  const sello = estado ? SELLOS[estado] : null;
  const cara = viendoVuelta ? "vuelta" : "frente";

  return (
    <section aria-label="Mi gafete digital" className="overflow-hidden rounded-tarjeta border border-linea bg-white shadow-lg">
      <div className="flex items-center justify-between gap-3 bg-rojo px-5 py-3 text-white">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-widest uppercase opacity-80">Gafete digital</p>
          <p className="truncate font-titulos text-lg leading-tight font-extrabold">{gafete.empresa}</p>
        </div>
        {sello ? <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold ${sello.clase}`}>{sello.texto}</span> : null}
      </div>

      <div className="bg-papel px-4 py-5">
        {gafete.tipo === "diseno" ? (
          <GafeteSvg
            cara={(viendoVuelta ? gafete.diseno.vuelta : gafete.diseno.frente) ?? gafete.diseno.frente}
            orientacion={gafete.diseno.orientacion}
            datos={gafete.datos}
            etiquetas={gafete.etiquetas}
            foto={gafete.foto}
            qr={gafete.qr || undefined}
            imagenes={gafete.imagenes}
            titulo={`Gafete de ${gafete.nombre}, ${cara}`}
            className={`mx-auto w-full drop-shadow ${gafete.diseno.orientacion === "vertical" ? "max-w-[17rem]" : ""}`}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- liga temporal de almacenamiento privado
          <img
            src={viendoVuelta && gafete.vuelta ? gafete.vuelta : gafete.frente}
            alt={`Gafete de ${gafete.nombre}, ${cara}`}
            className="mx-auto w-full rounded-lg drop-shadow"
          />
        )}
        {tieneVuelta ? (
          <div className="mt-3 flex justify-center gap-2" role="group" aria-label="Cara del gafete">
            {(["frente", "vuelta"] as const).map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={cara === c}
                onClick={() => setVuelta(c === "vuelta")}
                className={`rounded-full border px-4 py-1.5 text-sm font-semibold capitalize ${
                  cara === c ? "border-tinta bg-tinta text-white" : "border-linea bg-white"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {gafete.qr ? (
        <div className="border-t border-linea px-5 py-6 text-center">
          <QrSvg texto={gafete.qr} titulo={`Código QR del gafete de ${gafete.nombre}`} className="mx-auto w-56 max-w-full" />
          <p className="mt-3 text-sm text-gris">
            {gafete.verificable
              ? "Si te piden comprobar tu gafete, que escaneen este código: muestra si está vigente."
              : "Muestra este código cuando te lo pidan."}
          </p>
        </div>
      ) : null}
    </section>
  );
}
