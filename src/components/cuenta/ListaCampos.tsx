"use client";

import { type KeyboardEvent, type PointerEvent, useMemo, useRef, useState } from "react";
import { normalizar } from "@/lib/cuenta/texto";

type Fila = { id: string; clave: string; etiqueta: string; tipo: string; de_sistema: boolean };

const TIPOS: Record<string, string> = { texto: "Texto", fecha: "Fecha o texto", foto: "Fotografía", qr: "Código QR" };
const entradaChica = "w-full rounded-tarjeta-chica border bg-white px-2.5 py-1.5";

/** «Nombre» siempre se queda: es lo que identifica a cada persona. */
const sePuedeQuitar = (f: Fila) => f.clave !== "nombre";

/**
 * Lista de datos de la empresa: se reacomoda arrastrando, con las flechas del
 * teclado o escribiendo el número. Los números siempre van del 1 en adelante,
 * sin repetirse. La × quita un dato al guardar.
 */
export function ListaCampos({ campos }: { campos: Fila[] }) {
  const [filas, setFilas] = useState(campos);
  const [quitadas, setQuitadas] = useState<Fila[]>([]);
  const [nombres, setNombres] = useState<Record<string, string>>(() =>
    Object.fromEntries(campos.map((c) => [c.id, c.etiqueta])),
  );
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");
  const [version, setVersion] = useState(0);
  const cuerpo = useRef<HTMLTableSectionElement>(null);

  const repetidos = useMemo(() => {
    const vistos = new Map<string, number>();
    for (const f of filas) {
      const n = normalizar(nombres[f.id] ?? "");
      if (n) vistos.set(n, (vistos.get(n) ?? 0) + 1);
    }
    return new Set([...vistos].filter(([, veces]) => veces > 1).map(([n]) => n));
  }, [filas, nombres]);
  const esRepetido = (f: Fila) => repetidos.has(normalizar(nombres[f.id] ?? ""));
  const primerRepetido = filas.find(esRepetido);

  function mover(id: string, destino: number) {
    setFilas((actuales) => {
      const desde = actuales.findIndex((f) => f.id === id);
      const hacia = Math.min(actuales.length - 1, Math.max(0, destino));
      if (desde < 0 || desde === hacia) return actuales;
      const nuevas = [...actuales];
      const [fila] = nuevas.splice(desde, 1);
      nuevas.splice(hacia, 0, fila);
      setAviso(`${nombres[id] || fila.etiqueta} quedó en el lugar ${hacia + 1}.`);
      return nuevas;
    });
  }

  function quitar(fila: Fila) {
    setFilas((actuales) => actuales.filter((f) => f.id !== fila.id));
    setQuitadas((actuales) => [...actuales, fila]);
    setAviso(`${nombres[fila.id] || fila.etiqueta} se quitará al guardar.`);
  }

  function deshacer(fila: Fila) {
    setQuitadas((actuales) => actuales.filter((f) => f.id !== fila.id));
    setFilas((actuales) => {
      const original = campos.findIndex((c) => c.id === fila.id);
      const nuevas = [...actuales];
      nuevas.splice(Math.min(original, nuevas.length), 0, fila);
      return nuevas;
    });
  }

  // Arrastre con el puntero: sirve igual con mouse, dedo o pluma.
  function empezar(evento: PointerEvent<HTMLButtonElement>, id: string) {
    evento.currentTarget.setPointerCapture(evento.pointerId);
    setArrastrando(id);
  }
  function arrastrar(evento: PointerEvent<HTMLButtonElement>, id: string) {
    if (arrastrando !== id || !cuerpo.current) return;
    const renglones = [...cuerpo.current.children] as HTMLElement[];
    let destino = renglones.length - 1;
    for (let i = 0; i < renglones.length; i++) {
      const caja = renglones[i].getBoundingClientRect();
      if (evento.clientY < caja.top + caja.height / 2) {
        destino = i;
        break;
      }
    }
    const actual = filas.findIndex((f) => f.id === id);
    if (destino !== actual) mover(id, destino);
  }
  function soltar() {
    setArrastrando(null);
  }
  function conTeclas(evento: KeyboardEvent<HTMLButtonElement>, id: string, lugar: number) {
    if (evento.key === "ArrowUp" || evento.key === "ArrowDown") {
      evento.preventDefault();
      mover(id, lugar + (evento.key === "ArrowUp" ? -1 : 1));
    }
  }

  function cambiarNumero(id: string, valor: string, lugar: number) {
    const numero = Math.round(Number(valor));
    if (Number.isFinite(numero) && numero >= 1 && numero - 1 !== lugar) mover(id, numero - 1);
    else setVersion((v) => v + 1); // vuelve a mostrar el número correcto
  }

  return (
    <>
      {/* `relative`: los textos solo para lector de pantalla no deben ensanchar la página. */}
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[28rem] text-left text-sm">
          <thead>
            <tr className="border-b border-linea">
              <th scope="col" className="w-8 py-2"><span className="sr-only">Mover</span></th>
              <th scope="col" className="py-2 pr-3 font-semibold">Nombre del dato</th>
              <th scope="col" className="py-2 pr-3 font-semibold">Tipo</th>
              <th scope="col" className="py-2 pr-3 font-semibold">Orden en el Excel</th>
              <th scope="col" className="w-8 py-2"><span className="sr-only">Quitar</span></th>
            </tr>
          </thead>
          <tbody ref={cuerpo} className="divide-y divide-linea">
            {filas.map((c, i) => {
              const nombre = nombres[c.id] ?? c.etiqueta;
              const repetido = esRepetido(c);
              return (
                <tr key={c.id} className={arrastrando === c.id ? "bg-papel" : undefined}>
                  <td className="py-2 pr-1">
                    <button
                      type="button"
                      onPointerDown={(e) => empezar(e, c.id)}
                      onPointerMove={(e) => arrastrar(e, c.id)}
                      onPointerUp={soltar}
                      onPointerCancel={soltar}
                      onKeyDown={(e) => conTeclas(e, c.id, i)}
                      aria-label={`Mover ${nombre}. Usa las flechas arriba y abajo.`}
                      title="Arrastra para cambiar el orden"
                      className={`flex size-8 touch-none items-center justify-center rounded-tarjeta-chica text-gris hover:bg-papel hover:text-tinta ${arrastrando === c.id ? "cursor-grabbing" : "cursor-grab"}`}
                    >
                      <svg aria-hidden viewBox="0 0 12 18" className="h-4 w-3 fill-current">
                        {[3, 9, 15].flatMap((y) => [<circle key={`a${y}`} cx="3" cy={y} r="1.6" />, <circle key={`b${y}`} cx="9" cy={y} r="1.6" />])}
                      </svg>
                    </button>
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      name={`etiqueta_${c.id}`}
                      value={nombre}
                      onChange={(e) => setNombres((n) => ({ ...n, [c.id]: e.target.value }))}
                      required
                      maxLength={60}
                      autoComplete="off"
                      aria-label={`Nombre del dato ${c.etiqueta}`}
                      aria-invalid={repetido || undefined}
                      className={`${entradaChica} ${repetido ? "border-rojo-oscuro" : "border-linea"}`}
                    />
                  </td>
                  <td className="py-2 pr-3 text-gris">{TIPOS[c.tipo] ?? c.tipo}</td>
                  <td className="py-2 pr-3">
                    <input type="hidden" name={`orden_${c.id}`} value={i + 1} />
                    <input
                      key={`${c.id}-${i}-${filas.length}-${version}`}
                      type="number"
                      inputMode="numeric"
                      defaultValue={i + 1}
                      min={1}
                      max={filas.length}
                      onBlur={(e) => cambiarNumero(c.id, e.target.value, i)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          cambiarNumero(c.id, e.currentTarget.value, i);
                        }
                      }}
                      aria-label={`Lugar de ${nombre} en el Excel`}
                      className={`${entradaChica} w-16 border-linea`}
                    />
                  </td>
                  <td className="py-2">
                    {sePuedeQuitar(c) ? (
                      <button
                        type="button"
                        onClick={() => quitar(c)}
                        aria-label={`Quitar ${nombre}`}
                        title="Quitar este dato"
                        className="flex size-8 items-center justify-center rounded-tarjeta-chica text-lg leading-none text-gris hover:bg-papel hover:text-rojo-oscuro"
                      >
                        ×
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {quitadas.map((f) => <input key={f.id} type="hidden" name="quitar" value={f.id} />)}
      <p aria-live="polite" className="sr-only">{aviso}</p>

      {primerRepetido ? (
        <p role="alert" className="mt-3 text-sm font-medium text-rojo-oscuro">
          Tienes dos datos llamados «{nombres[primerRepetido.id]?.trim()}». Cambia el nombre de uno para que tu Excel no
          tenga columnas repetidas.
        </p>
      ) : null}

      {quitadas.length ? (
        <div className="mt-3 rounded-tarjeta-chica bg-papel p-3 text-sm">
          <p className="font-semibold">Se quitarán al guardar:</p>
          <ul className="mt-1 space-y-1">
            {quitadas.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-x-3">
                {nombres[f.id] || f.etiqueta}
                <button type="button" onClick={() => deshacer(f)} className="font-semibold underline underline-offset-4">
                  Deshacer
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-gris">
            Lo que ya capturaste no se borra: si vuelves a agregar el dato, aparece de nuevo.
          </p>
        </div>
      ) : null}

      <p className="mt-3 text-xs text-gris">
        Arrastra un dato desde los puntos o escribe su número para cambiar el orden; los demás se recorren solos. Puedes
        cambiar el nombre de cualquier dato, por ejemplo «Puesto» por «Área». Ninguno es obligatorio: sin nombre, la
        persona queda como gafete genérico.
      </p>
    </>
  );
}
