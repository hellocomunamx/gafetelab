"use client";

import type { ChangeEvent, ReactNode } from "react";
import { type Elemento, fuentes, mmAPuntos, puntosAMm } from "@/lib/diseno/tipos";

const entrada = "mt-1 w-full rounded-tarjeta-chica border border-linea bg-white px-2.5 py-1.5 text-sm";
const boton = "rounded-full border border-linea bg-white px-3 py-1.5 text-sm font-semibold hover:border-tinta";

function Fila({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-semibold">{etiqueta}</span>
      {children}
    </label>
  );
}

/** Número con decimales que no estorba al escribir: solo avisa cuando el valor es válido. */
function Numero({
  etiqueta,
  valor,
  alCambiar,
  paso = 0.5,
  min,
  max,
}: {
  etiqueta: string;
  valor: number;
  alCambiar: (n: number) => void;
  paso?: number;
  min?: number;
  max?: number;
}) {
  return (
    <Fila etiqueta={etiqueta}>
      <input
        type="number"
        step={paso}
        min={min}
        max={max}
        value={Number(valor.toFixed(1))}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          const n = e.target.valueAsNumber;
          if (Number.isFinite(n)) alCambiar(n);
        }}
        className={entrada}
      />
    </Fila>
  );
}

const NOMBRES: Record<Elemento["tipo"], string> = {
  texto: "Texto",
  foto: "Fotografía",
  qr: "Código QR",
  imagen: "Imagen",
  forma: "Forma",
};

/** Solo el dato («Ventas») o con su etiqueta («Puesto: Ventas»). */
function ConEtiqueta({
  activa,
  etiqueta,
  valor,
  alCambiar,
}: {
  activa: boolean;
  etiqueta: string;
  valor: string;
  alCambiar: (activa: boolean) => void;
}) {
  const ejemplo = valor && valor !== etiqueta ? valor : "…";
  return (
    <span role="radiogroup" aria-label="Cómo se imprime" className="mt-1 flex overflow-hidden rounded-tarjeta-chica border border-linea text-xs font-semibold">
      {([false, true] as const).map((v) => (
        <button
          key={String(v)}
          type="button"
          role="radio"
          aria-checked={activa === v}
          onClick={() => alCambiar(v)}
          className={`min-w-0 flex-1 truncate px-3 py-2 text-left ${activa === v ? "bg-tinta text-white" : "bg-white"}`}
        >
          <span className="block text-[11px] font-normal opacity-80">{v ? "Con etiqueta" : "Solo el dato"}</span>
          {v ? `${etiqueta}: ${ejemplo}` : ejemplo}
        </button>
      ))}
    </span>
  );
}

/** Propiedades del elemento seleccionado en el editor. */
export function PanelElemento({
  elemento: e,
  campos,
  datos,
  ancho,
  alCambiar,
  alOrdenar,
  alDuplicar,
  alBorrar,
}: {
  elemento: Elemento;
  campos: { clave: string; etiqueta: string }[];
  /** Datos de la persona que se ve en el editor, para el ejemplo de la etiqueta. */
  datos: Record<string, string>;
  /** Ancho del gafete, para centrar. */
  ancho: number;
  alCambiar: (parche: Partial<Elemento>) => void;
  alOrdenar: (hacia: "frente" | "atras") => void;
  alDuplicar: () => void;
  alBorrar: () => void;
}) {
  return (
    <div className="space-y-3">
      <h2 className="font-titulos text-lg font-extrabold">
        {e.tipo === "texto" && e.campo ? "Campo del equipo" : NOMBRES[e.tipo]}
      </h2>

      {e.tipo === "texto" ? (
        <>
          {e.campo ? (
            <>
              <Fila etiqueta="Campo">
                <select value={e.campo} onChange={(ev) => alCambiar({ campo: ev.target.value })} className={entrada}>
                  {campos.some((c) => c.clave === e.campo) ? null : <option value={e.campo}>(campo eliminado)</option>}
                  {campos.map((c) => (
                    <option key={c.clave} value={c.clave}>{c.etiqueta}</option>
                  ))}
                </select>
              </Fila>
              <div className="text-sm">
                <span className="font-semibold">Cómo se imprime</span>
                <ConEtiqueta
                  activa={Boolean(e.conEtiqueta)}
                  etiqueta={campos.find((c) => c.clave === e.campo)?.etiqueta ?? e.campo}
                  valor={datos[e.campo] ?? ""}
                  alCambiar={(conEtiqueta) => alCambiar({ conEtiqueta })}
                />
              </div>
            </>
          ) : (
            <Fila etiqueta="Texto">
              <textarea value={e.texto ?? ""} rows={2} maxLength={200} onChange={(ev) => alCambiar({ texto: ev.target.value })} className={entrada} />
            </Fila>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Fila etiqueta="Letra">
              <select value={e.fuente} onChange={(ev) => alCambiar({ fuente: ev.target.value as typeof e.fuente })} className={entrada}>
                {fuentes.map((f) => (
                  <option key={f.id} value={f.id}>{f.nombre}</option>
                ))}
              </select>
            </Fila>
            <Numero etiqueta="Tamaño (pt)" valor={mmAPuntos(e.tam)} min={4} max={72} alCambiar={(pt) => alCambiar({ tam: puntosAMm(Math.min(72, Math.max(4, pt))) })} />
            <Fila etiqueta="Color">
              <input type="color" value={e.color} onChange={(ev) => alCambiar({ color: ev.target.value })} className="mt-1 h-9 w-full cursor-pointer rounded-tarjeta-chica border border-linea bg-white p-1" />
            </Fila>
            <Fila etiqueta="Alineación">
              <select value={e.alinear} onChange={(ev) => alCambiar({ alinear: ev.target.value as typeof e.alinear })} className={entrada}>
                <option value="izquierda">Izquierda</option>
                <option value="centro">Centro</option>
                <option value="derecha">Derecha</option>
              </select>
            </Fila>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={e.negrita} onChange={(ev) => alCambiar({ negrita: ev.target.checked })} className="size-4 accent-tinta" />
              Negrita
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={Boolean(e.mayusculas)} onChange={(ev) => alCambiar({ mayusculas: ev.target.checked })} className="size-4 accent-tinta" />
              Mayúsculas
            </label>
          </div>
          <p className="text-xs text-gris">
            Si un nombre largo no cabe, la letra se reduce sola. Dale más alto a la caja para que use dos renglones.
          </p>
        </>
      ) : null}

      {e.tipo === "foto" ? (
        <>
          <Numero etiqueta="Esquinas redondeadas (mm)" valor={e.radio} min={0} max={50} alCambiar={(radio) => alCambiar({ radio: Math.max(0, radio) })} />
          <button type="button" className={boton} onClick={() => alCambiar({ h: e.w, radio: e.w / 2 })}>
            Hacerla circular
          </button>
          <p className="text-xs text-gris">Aquí va la foto de cada persona, recortada para llenar la caja.</p>
        </>
      ) : null}

      {e.tipo === "forma" ? (
        <div className="grid grid-cols-2 gap-2">
          <Fila etiqueta="Color">
            <input type="color" value={e.color} onChange={(ev) => alCambiar({ color: ev.target.value })} className="mt-1 h-9 w-full cursor-pointer rounded-tarjeta-chica border border-linea bg-white p-1" />
          </Fila>
          <Numero etiqueta="Esquinas (mm)" valor={e.radio} min={0} max={50} alCambiar={(radio) => alCambiar({ radio: Math.max(0, radio) })} />
        </div>
      ) : null}

      {e.tipo === "imagen" ? (
        <Fila etiqueta="Ajuste">
          <select value={e.ajuste} onChange={(ev) => alCambiar({ ajuste: ev.target.value as typeof e.ajuste })} className={entrada}>
            <option value="contener">Completa, sin recortar</option>
            <option value="cubrir">Llenar la caja (recorta)</option>
          </select>
        </Fila>
      ) : null}

      {e.tipo === "qr" ? (
        <p className="text-xs text-gris">
          Es una muestra. El código de cada persona se genera al emitir su gafete, y conviene que mida al menos 12 mm.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2 border-t border-linea pt-3">
        <Numero etiqueta="X (mm)" valor={e.x} alCambiar={(x) => alCambiar({ x })} />
        <Numero etiqueta="Y (mm)" valor={e.y} alCambiar={(y) => alCambiar({ y })} />
        <Numero etiqueta="Ancho (mm)" valor={e.w} min={1} alCambiar={(w) => alCambiar(e.tipo === "qr" ? { w: Math.max(1, w), h: Math.max(1, w) } : { w: Math.max(1, w) })} />
        {e.tipo === "qr" ? null : <Numero etiqueta="Alto (mm)" valor={e.h} min={1} alCambiar={(h) => alCambiar({ h: Math.max(1, h) })} />}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className={boton} onClick={() => alCambiar({ x: (ancho - e.w) / 2 })}>Centrar</button>
        <button type="button" className={boton} onClick={() => alOrdenar("frente")}>Traer al frente</button>
        <button type="button" className={boton} onClick={() => alOrdenar("atras")}>Enviar atrás</button>
        <button type="button" className={boton} onClick={alDuplicar}>Duplicar</button>
        <button type="button" className={`${boton} text-rojo-oscuro`} onClick={alBorrar}>Eliminar</button>
      </div>
    </div>
  );
}
