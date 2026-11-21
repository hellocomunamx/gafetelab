"use client";

import { useMemo, useState } from "react";
import { crearDiseno } from "@/app/cuenta/disenos/acciones";
import { claseEntrada, Formulario } from "@/components/cuenta/Formulario";
import { type CampoPlantilla, crearDesdePlantilla, type PlantillaId, plantillas } from "@/lib/diseno/plantillas";
import type { Cara, Orientacion } from "@/lib/diseno/tipos";
import { GafeteSvg } from "./GafeteSvg";

const COLORES = [
  { valor: "#e63b2e", nombre: "Rojo" },
  { valor: "#1b1f3b", nombre: "Tinta" },
  { valor: "#1d4ed8", nombre: "Azul" },
  { valor: "#0a7d4f", nombre: "Verde" },
  { valor: "#f59e0b", nombre: "Ámbar" },
  { valor: "#7c3aed", nombre: "Morado" },
];

/** Ids fijos para que la miniatura sea igual en el servidor y en el navegador. */
const estable = (cara: Cara): Cara => ({ ...cara, elementos: cara.elementos.map((e, i) => ({ ...e, id: `p${i}` })) });

/** Primer paso de un diseño: con qué plantilla, orientación y color empezar. */
export function NuevoDiseno({
  campos,
  empresa,
  datos,
}: {
  campos: CampoPlantilla[];
  empresa: string;
  /** Datos de ejemplo para las miniaturas. */
  datos: Record<string, string>;
}) {
  const [plantilla, setPlantilla] = useState<PlantillaId>("clasica");
  const [orientacion, setOrientacion] = useState<Orientacion>("horizontal");
  const [color, setColor] = useState(COLORES[0].valor);
  const etiquetas = useMemo(() => Object.fromEntries(campos.map((c) => [c.clave, c.etiqueta])), [campos]);
  const muestras = useMemo(
    () =>
      plantillas.map((p) => ({
        ...p,
        frente: estable(crearDesdePlantilla(p.id, orientacion, campos, color, empresa).frente),
      })),
    [orientacion, campos, color, empresa],
  );

  return (
    <Formulario accion={crearDiseno} boton="Crear y abrir el editor" className="space-y-6">
      <fieldset>
        <legend className="text-lg font-extrabold">1. ¿Cómo va tu gafete?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {(["horizontal", "vertical"] as const).map((o) => (
            <label
              key={o}
              className="cursor-pointer rounded-full border border-linea bg-white px-4 py-2 text-sm font-semibold has-[:checked]:border-tinta has-[:checked]:bg-tinta has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-tinta"
            >
              <input type="radio" name="orientacion" value={o} checked={orientacion === o} onChange={() => setOrientacion(o)} className="sr-only" />
              {o === "horizontal" ? "Horizontal" : "Vertical"}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-lg font-extrabold">2. Elige con qué empezar</legend>
        <p className="text-sm text-gris">Después puedes mover, quitar y agregar lo que quieras.</p>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {muestras.map((p) => (
            <label
              key={p.id}
              className="flex cursor-pointer flex-col rounded-tarjeta border-2 border-linea bg-white p-3 has-[:checked]:border-rojo has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-tinta"
            >
              <input type="radio" name="plantilla" value={p.id} checked={plantilla === p.id} onChange={() => setPlantilla(p.id)} className="sr-only" />
              <span className="flex h-36 items-center justify-center rounded-tarjeta-chica bg-papel p-2 sm:h-44">
                <GafeteSvg
                  cara={p.frente}
                  orientacion={orientacion}
                  datos={datos}
                  etiquetas={etiquetas}
                  imagenes={{}}
                  titulo={`Plantilla ${p.nombre}`}
                  className="max-h-full max-w-full drop-shadow"
                />
              </span>
              <span className="mt-2 font-semibold">{p.nombre}</span>
              <span className="text-sm text-gris">{p.descripcion}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-lg font-extrabold">3. Tu color</legend>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {COLORES.map((c) => (
            <button
              key={c.valor}
              type="button"
              onClick={() => setColor(c.valor)}
              aria-label={c.nombre}
              aria-pressed={color === c.valor}
              style={{ backgroundColor: c.valor }}
              className={`size-9 rounded-full border-2 border-white ring-2 ${color === c.valor ? "ring-tinta" : "ring-linea"}`}
            />
          ))}
          <label className="ml-2 flex items-center gap-2 text-sm">
            Otro
            <input type="color" name="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-14 cursor-pointer rounded-tarjeta-chica border border-linea bg-white p-1" />
          </label>
        </div>
      </fieldset>

      <label className="block max-w-md">
        <span className="text-lg font-extrabold">4. Ponle nombre</span>
        <input name="nombre" maxLength={80} placeholder="Por ejemplo: Gafete de planta" className={claseEntrada} />
        <span className="mt-1 block text-sm text-gris">Opcional. Sirve para distinguirlo si haces varios.</span>
      </label>
    </Formulario>
  );
}
