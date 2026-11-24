"use client";

import { useState } from "react";
import { Chips, Entrada } from "@/components/cuenta/Entrada";
import { Formulario } from "@/components/cuenta/Formulario";
import { claseBotonSecundario, claseEntrada } from "@/components/cuenta/clases";
import type { Resultado } from "@/lib/cuenta/tipos";
import {
  type Categoria,
  categoriasBase,
  coloresCategoria,
  diasEntregaEvento,
  fechaEvento,
  hoyIso,
  limiteSugerido,
  MAX_CATEGORIAS,
  nombreColor,
  tiposEvento,
} from "@/lib/eventos";

type Inicial = {
  nombre: string;
  tipo: string;
  inicio: string;
  fin: string;
  limite: string;
  sede: string;
  categorias: Categoria[];
};

/**
 * Datos del evento: nombre, tipo, fechas, sede y categorías de gafete con su
 * color (el mismo del cordón). Sirve para crear un evento y para cambiarlo.
 */
export function FormularioEvento({
  accion,
  boton,
  inicial,
}: {
  accion: (previo: Resultado, datos: FormData) => Promise<Resultado>;
  boton: string;
  inicial?: Inicial;
}) {
  const [inicio, setInicio] = useState(inicial?.inicio ?? "");
  const [fin, setFin] = useState(inicial?.fin ?? "");
  const [limite, setLimite] = useState(inicial?.limite ?? "");
  // Mientras no la cambien a mano, la fecha límite sigue a la de inicio.
  const [limiteAMano, setLimiteAMano] = useState(Boolean(inicial));
  const [categorias, setCategorias] = useState<(Categoria & { antes: string | null })[]>(
    (inicial?.categorias ?? categoriasBase).map((c) => ({ ...c, antes: inicial ? c.nombre : null })),
  );
  const [abierta, setAbierta] = useState<number | null>(null);
  const hoy = hoyIso();
  // Si el evento es muy pronto, el envío estándar ya no alcanza aunque pidan hoy.
  const tarde = Boolean((limite && limite < hoy) || (inicio && limiteSugerido(inicio) < hoy));

  function cambiarInicio(v: string) {
    setInicio(v);
    if (!fin || fin < v) setFin(v);
    if (!limiteAMano && v) setLimite(limiteSugerido(v) < hoy ? hoy : limiteSugerido(v));
  }

  const cambiar = (i: number, cambio: Partial<Categoria>) =>
    setCategorias((lista) => lista.map((c, j) => (j === i ? { ...c, ...cambio } : c)));
  const quitar = (i: number) => setCategorias((lista) => lista.filter((_, j) => j !== i));
  function agregar() {
    const usados = new Set(categorias.map((c) => c.color));
    const color = coloresCategoria.find((c) => !usados.has(c.color))?.color ?? coloresCategoria[0].color;
    setCategorias((lista) => [...lista, { nombre: "", color, antes: null }]);
    setAbierta(categorias.length);
  }

  return (
    <Formulario accion={accion} boton={boton} className="space-y-5">
      <Entrada etiqueta="Nombre del evento" name="nombre" required maxLength={120} defaultValue={inicial?.nombre} placeholder="Congreso Nacional de Cardiología 2027" />
      <Chips
        etiqueta="Tipo de evento"
        name="tipo"
        inicial={inicial?.tipo}
        opciones={tiposEvento.map((t) => ({ valor: t.id, texto: t.nombre }))}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Entrada etiqueta="Empieza" name="inicio" type="date" required min={inicial ? undefined : hoy} value={inicio} onChange={(e) => cambiarInicio(e.target.value)} />
        <Entrada etiqueta="Termina" name="fin" type="date" required min={inicio || hoy} value={fin} onChange={(e) => setFin(e.target.value)} />
      </div>
      <div>
        <Entrada
          etiqueta="Fecha límite para pedir tus gafetes"
          name="limite"
          type="date"
          required
          max={fin || undefined}
          value={limite}
          onChange={(e) => {
            setLimite(e.target.value);
            setLimiteAMano(true);
          }}
          ayuda={`Te la sugerimos con los ${diasEntregaEvento} días que tarda el envío y unos días de margen. Te la recordamos en tu resumen.`}
        />
        {tarde ? (
          <p className="mt-2 rounded-tarjeta-chica bg-resaltador/40 px-3 py-2 text-sm">
            Tu evento está muy cerca: con el envío estándar de {diasEntregaEvento} días tus gafetes podrían no llegar a tiempo. Escríbenos antes de pedir y vemos cómo lograrlo.
          </p>
        ) : null}
        {limite && !tarde && inicio ? (
          <p className="mt-2 text-sm text-gris">Pide a más tardar el {fechaEvento(limite)} para recibirlos antes del evento.</p>
        ) : null}
      </div>
      <Entrada etiqueta="Sede y ciudad (opcional)" name="sede" maxLength={160} defaultValue={inicial?.sede} placeholder="Centro de Convenciones, Hermosillo" />

      <fieldset>
        <legend className="text-sm font-semibold">Categorías de gafete</legend>
        <p className="mt-1 text-sm text-gris">
          Cada categoría lleva su color en el gafete y en el cordón, para distinguir a simple vista quién es quién.
        </p>
        <input type="hidden" name="categorias" value={JSON.stringify(categorias.map(({ nombre, color }) => ({ nombre, color })))} />
        <input type="hidden" name="anteriores" value={JSON.stringify(categorias.map((c) => c.antes))} />
        <ul className="mt-3 space-y-2">
          {categorias.map((c, i) => (
            <li key={i} className="rounded-tarjeta-chica border border-linea bg-white p-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAbierta(abierta === i ? null : i)}
                  aria-expanded={abierta === i}
                  aria-label={`Color de ${c.nombre || "la categoría"}: ${nombreColor(c.color)}. Cambiar`}
                  className="size-9 shrink-0 rounded-full border-2 border-white shadow ring-1 ring-linea"
                  style={{ background: c.color }}
                />
                <input
                  value={c.nombre}
                  onChange={(e) => cambiar(i, { nombre: e.target.value })}
                  maxLength={40}
                  placeholder="Nombre de la categoría"
                  aria-label="Nombre de la categoría"
                  className={`${claseEntrada} mt-0`}
                />
                <button
                  type="button"
                  onClick={() => quitar(i)}
                  disabled={categorias.length === 1}
                  className="shrink-0 px-2 text-sm font-semibold text-gris underline disabled:opacity-40"
                >
                  Quitar
                </button>
              </div>
              {abierta === i ? (
                <div className="mt-2 flex flex-wrap gap-2 px-1 pb-1" role="group" aria-label="Elige un color">
                  {coloresCategoria.map((o) => (
                    <button
                      key={o.color}
                      type="button"
                      title={o.nombre}
                      aria-label={o.nombre}
                      aria-pressed={o.color === c.color}
                      onClick={() => {
                        cambiar(i, { color: o.color });
                        setAbierta(null);
                      }}
                      className={`size-8 rounded-full border-2 ${o.color === c.color ? "border-tinta" : "border-white"} shadow ring-1 ring-linea`}
                      style={{ background: o.color }}
                    />
                  ))}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
        {categorias.length < MAX_CATEGORIAS ? (
          <button type="button" onClick={agregar} className={`${claseBotonSecundario} mt-3`}>
            Agregar categoría
          </button>
        ) : null}
      </fieldset>
    </Formulario>
  );
}
