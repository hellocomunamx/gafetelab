"use client";

import { type ReactNode, useState } from "react";
import { GafeteSvg } from "@/components/diseno/GafeteSvg";
import { QrSvg } from "@/components/QrSvg";
import type { GafeteDigital } from "@/lib/cuenta/gafete-digital";
import { DescargarGafete } from "@/components/DescargarGafete";

const SELLOS = {
  vigente: { texto: "Vigente", clase: "bg-[#0a7d4f] text-white" },
  expirado: { texto: "Expirado", clase: "bg-rojo-oscuro text-white" },
  baja: { texto: "No válido", clase: "bg-tinta text-white" },
  pendiente: { texto: "Aún no activo", clase: "bg-resaltador text-tinta" },
} as const;

/**
 * El gafete digital en el celular de la persona: su gafete (con «Ver frente» y
 * «Ver reverso» si lleva vuelta; también se voltea con un toque), el código QR
 * en grande para que lo escaneen y el botón para descargarlo como imagen.
 */
export function GafeteDigitalVista({ gafete, estado }: { gafete: GafeteDigital; estado: keyof typeof SELLOS | null }) {
  const [vuelta, setVuelta] = useState(false);
  const tieneVuelta = gafete.tipo === "diseno" ? Boolean(gafete.diseno.vuelta) : Boolean(gafete.vuelta);
  const viendoVuelta = tieneVuelta && vuelta;
  const sello = estado ? SELLOS[estado] : null;
  const vertical = gafete.tipo === "diseno" && gafete.diseno.orientacion === "vertical";

  const dibujo = (lado: "frente" | "vuelta"): ReactNode =>
    gafete.tipo === "diseno" ? (
      <GafeteSvg
        cara={(lado === "vuelta" ? gafete.diseno.vuelta : gafete.diseno.frente) ?? gafete.diseno.frente}
        orientacion={gafete.diseno.orientacion}
        datos={gafete.datos}
        etiquetas={gafete.etiquetas}
        foto={gafete.foto}
        qr={gafete.qr || undefined}
        imagenes={gafete.imagenes}
        titulo={`Gafete de ${gafete.nombre}, ${lado === "vuelta" ? "reverso" : "frente"}`}
        className="w-full drop-shadow"
      />
    ) : (
      // eslint-disable-next-line @next/next/no-img-element -- liga temporal de almacenamiento privado
      <img
        src={lado === "vuelta" && gafete.vuelta ? gafete.vuelta : gafete.frente}
        alt={`Gafete de ${gafete.nombre}, ${lado === "vuelta" ? "reverso" : "frente"}`}
        className="w-full rounded-lg drop-shadow"
      />
    );

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
        {tieneVuelta ? (
          <div
            className="mx-auto mb-4 grid max-w-xs grid-cols-2 rounded-full border border-linea bg-white p-1"
            role="group"
            aria-label="Cara del gafete"
          >
            {(["frente", "vuelta"] as const).map((lado) => {
              const activo = (lado === "vuelta") === viendoVuelta;
              return (
                <button
                  key={lado}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => setVuelta(lado === "vuelta")}
                  className={`rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
                    activo ? "bg-tinta text-white" : "text-tinta hover:bg-papel"
                  }`}
                >
                  {lado === "frente" ? "Ver frente" : "Ver reverso"}
                </button>
              );
            })}
          </div>
        ) : null}

        <div className={`mx-auto [perspective:1200px] ${vertical ? "max-w-[17rem]" : ""}`}>
          <div
            className={`relative grid transition-transform duration-500 [transform-style:preserve-3d] motion-reduce:transition-none ${
              viendoVuelta ? "[transform:rotateY(180deg)]" : ""
            } ${tieneVuelta ? "cursor-pointer" : ""}`}
            onClick={tieneVuelta ? () => setVuelta((v) => !v) : undefined}
            title={tieneVuelta ? "Toca para voltearlo" : undefined}
          >
            <div className="col-start-1 row-start-1 [backface-visibility:hidden]" aria-hidden={viendoVuelta}>
              {dibujo("frente")}
            </div>
            {tieneVuelta ? (
              <div className="col-start-1 row-start-1 [backface-visibility:hidden] [transform:rotateY(180deg)]" aria-hidden={!viendoVuelta}>
                {dibujo("vuelta")}
              </div>
            ) : null}
          </div>
        </div>
        {tieneVuelta ? <p className="mt-2 text-center text-xs text-gris">También puedes tocar el gafete para voltearlo.</p> : null}
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

      <div className="border-t border-linea px-5 py-5">
        <DescargarGafete gafete={gafete} bloqueado={estado !== null && estado !== "vigente"} />
      </div>
    </section>
  );
}
