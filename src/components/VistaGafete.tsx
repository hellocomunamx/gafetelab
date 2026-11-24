"use client";

import { type ChangeEvent, useEffect, useState } from "react";
import { grosorTexto, type Material, materialBase, zonas } from "@/lib/materiales";
import { DiagramaGafete } from "./DiagramaGafete";

const TRAZOS: Record<(typeof zonas)[number]["id"], string> = {
  sangrado: "border-2 border-dashed border-rojo bg-rojo/25",
  corte: "border-2 border-tinta bg-white",
  segura: "border-2 border-dashed border-[#0a7d4f] bg-white",
};

/**
 * Vista del gafete: cómo se ve terminado y por dónde pasa el corte. La persona
 * puede cargar su propio diseño; el archivo se queda en su navegador.
 */
export function VistaGafete({ material }: { material?: Material | null }) {
  const [modo, setModo] = useState<"resultado" | "guias">("resultado");
  const [vertical, setVertical] = useState(false);
  const [ranura, setRanura] = useState(false);
  const [imagen, setImagen] = useState<string>();
  const mat = material ?? materialBase;

  useEffect(() => () => {
    if (imagen) URL.revokeObjectURL(imagen);
  }, [imagen]);

  function cargar(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!archivo || !archivo.type.startsWith("image/")) return;
    const url = URL.createObjectURL(archivo);
    // La orientación se toma de la imagen: más alta que ancha es vertical.
    const prueba = new Image();
    prueba.onload = () => setVertical(prueba.naturalHeight > prueba.naturalWidth);
    prueba.src = url;
    setImagen(url);
    setModo("guias");
  }

  const pestana = (activa: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
      activa ? "bg-tinta text-white" : "text-tinta hover:bg-white"
    }`;

  return (
    <div className="rounded-tarjeta bg-papel p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold">Así se ve tu gafete</h2>
        <div className="flex gap-1 rounded-full bg-linea/60 p-1">
          <button type="button" aria-pressed={modo === "resultado"} onClick={() => setModo("resultado")} className={pestana(modo === "resultado")}>
            Terminado
          </button>
          <button type="button" aria-pressed={modo === "guias"} onClick={() => setModo("guias")} className={pestana(modo === "guias")}>
            Zona de impresión
          </button>
        </div>
      </div>

      {imagen ? null : (
        <p className="mt-3 text-sm">
          <strong>Es solo un ejemplo.</strong>{" "}
          <span className="text-gris">
            El diseño de tu gafete es totalmente personalizable: tus colores, tu logo y los datos que tú
            elijas.
          </span>
        </p>
      )}

      <DiagramaGafete
        modo={modo}
        vertical={vertical}
        imagen={imagen}
        ranura={ranura}
        grosorMm={mat.grosorMm}
        className={`mx-auto mt-4 w-full ${vertical ? "max-w-[15rem]" : "max-w-[24rem]"}`}
      />

      {modo === "guias" ? (
        <ul className="mt-3 space-y-2 text-sm">
          {zonas.map((z) => (
            <li key={z.id} className="flex gap-3">
              <span aria-hidden className={`mt-0.5 h-4 w-6 shrink-0 rounded-sm ${TRAZOS[z.id]}`} />
              <span>
                <strong>{z.nombre}</strong> ({z.medida}). <span className="text-gris">{z.texto}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-center text-sm text-gris">
          {mat.nombre}, {grosorTexto(mat)}. {imagen ? "Tu diseño" : "Diseño de ejemplo"} ya recortado.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-linea pt-4 text-sm">
        <label className="inline-flex cursor-pointer items-center rounded-full border border-tinta bg-white px-4 py-2 font-semibold hover:bg-papel">
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={cargar} className="sr-only" />
          {imagen ? "Cambiar diseño" : "Ver mi diseño"}
        </label>
        {imagen ? (
          <button type="button" onClick={() => setImagen(undefined)} className="underline">
            Quitar
          </button>
        ) : null}
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={vertical} onChange={(e) => setVertical(e.target.checked)} className="size-4 accent-tinta" />
          Vertical
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={ranura} onChange={(e) => setRanura(e.target.checked)} className="size-4 accent-tinta" />
          Con perforación
        </label>
      </div>
      <p className="mt-3 text-xs text-gris">
        Tu imagen no se sube ni se guarda: solo se muestra en tu navegador. Acepta PNG, JPG o WebP.
      </p>
    </div>
  );
}
