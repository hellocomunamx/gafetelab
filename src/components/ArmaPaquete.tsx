"use client";

import { useState } from "react";
import { BotonAgregar } from "@/components/carrito/BotonAgregar";
import { carritoMaximoPiezas } from "@/lib/carrito";
import { type MaterialId, materiales } from "@/lib/materiales";
import {
  cotizarPaquete,
  paqueteMaximoRenglones,
  paqueteMinimoPiezas,
  paqueteVigenciaMeses,
  pesos,
} from "@/lib/precios";

type Renglon = { clave: number; piezas: string; dosCaras: boolean; material: MaterialId };

const disponibles = materiales.filter((m) => m.disponible);
const chip = (activo: boolean) =>
  `rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
    activo ? "border-tinta bg-tinta text-white" : "border-linea bg-white hover:border-tinta"
  }`;

/**
 * Paquete prepagado a la medida: la empresa combina varios tipos de gafete, cada
 * uno con su cantidad, sus caras y su material, y ve el precio al momento.
 */
export function ArmaPaquete() {
  const [renglones, setRenglones] = useState<Renglon[]>([
    { clave: 1, piezas: "10", dosCaras: true, material: "estandar" },
    { clave: 2, piezas: "100", dosCaras: false, material: "estandar" },
  ]);
  const [siguienteClave, setSiguienteClave] = useState(3);
  const cambiar = (clave: number, cambios: Partial<Renglon>) =>
    setRenglones((previos) => previos.map((r) => (r.clave === clave ? { ...r, ...cambios } : r)));

  const c = cotizarPaquete(renglones.map((r) => ({ ...r, piezas: Number.parseInt(r.piezas, 10) || 0 })));

  return (
    <div className="grid gap-6 rounded-tarjeta border border-linea bg-white p-5 sm:p-7 lg:grid-cols-[1.5fr_1fr]">
      <div className="min-w-0">
        <ul className="space-y-4">
          {renglones.map((r, i) => (
            <li key={r.clave} className="rounded-tarjeta-chica border border-linea p-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <label className="block">
                  <span className="block text-sm font-semibold">Tipo {i + 1}: ¿cuántos gafetes?</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={r.piezas}
                    onChange={(e) =>
                      cambiar(r.clave, { piezas: e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 4) })
                    }
                    onBlur={() => cambiar(r.clave, { piezas: String(Math.max(1, Number.parseInt(r.piezas, 10) || 1)) })}
                    className="mt-1.5 w-28 rounded-tarjeta-chica border border-linea px-3 py-2 text-lg font-semibold"
                  />
                </label>
                {renglones.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setRenglones((previos) => previos.filter((p) => p.clave !== r.clave))}
                    className="text-sm underline underline-offset-4"
                  >
                    Quitar
                  </button>
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={`Impresión del tipo ${i + 1}`}>
                {[
                  { valor: false, texto: "Una cara" },
                  { valor: true, texto: "Frente y vuelta" },
                ].map((o) => (
                  <button
                    key={o.texto}
                    type="button"
                    aria-pressed={r.dosCaras === o.valor}
                    onClick={() => cambiar(r.clave, { dosCaras: o.valor })}
                    className={chip(r.dosCaras === o.valor)}
                  >
                    {o.texto}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={`Material del tipo ${i + 1}`}>
                {disponibles.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={r.material === m.id}
                    onClick={() => cambiar(r.clave, { material: m.id })}
                    className={chip(r.material === m.id)}
                  >
                    {m.nombre}
                    {m.extra ? ` (+${pesos(m.extra)})` : ""}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
        {renglones.length < paqueteMaximoRenglones ? (
          <button
            type="button"
            onClick={() => {
              setRenglones((previos) => [...previos, { clave: siguienteClave, piezas: "10", dosCaras: false, material: "estandar" }]);
              setSiguienteClave((n) => n + 1);
            }}
            className="mt-4 font-semibold text-rojo underline underline-offset-4"
          >
            Agregar otro tipo de gafete
          </button>
        ) : null}
      </div>

      <div className="self-start rounded-tarjeta bg-papel p-5" aria-live="polite">
        <p className="text-sm font-semibold tracking-wide text-gris uppercase">Tu paquete</p>
        <p className="mt-1 font-titulos text-3xl font-extrabold">
          {c.piezas.toLocaleString("es-MX")} {c.piezas === 1 ? "gafete" : "gafetes"}
        </p>
        {c.incompleto ? (
          <p className="mt-3 font-medium text-rojo-oscuro">
            Los paquetes empiezan en {paqueteMinimoPiezas} gafetes. Te faltan {paqueteMinimoPiezas - c.piezas}.
          </p>
        ) : (
          <>
            <dl className="mt-4 space-y-2 text-sm">
              {c.renglones.map((r, i) => (
                <div key={i} className="flex justify-between gap-3">
                  <dt>
                    {r.piezas} × {pesos(r.porPieza)}
                    <span className="block text-gris">
                      {r.dosCaras ? "Frente y vuelta" : "Una cara"}, {r.material.nombre}
                    </span>
                  </dt>
                  <dd className="font-semibold">{pesos(r.importe)}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-3 border-t border-linea pt-2">
                <dt>Envíos incluidos</dt>
                <dd className="font-semibold">{c.envios}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>IVA</dt>
                <dd>{pesos(c.iva)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 border-t border-linea pt-2">
                <dt className="font-semibold">Total</dt>
                <dd className="font-titulos text-2xl font-extrabold">{pesos(c.total)}</dd>
              </div>
            </dl>
            {c.siguiente ? (
              <p className="mt-3 text-sm text-gris">
                Con {c.siguiente.faltan} {c.siguiente.faltan === 1 ? "gafete" : "gafetes"} más, el precio base baja a{" "}
                {pesos(c.siguiente.porPieza)} por pieza.
              </p>
            ) : null}
            <BotonAgregar
              articulo={{ tipo: "medida", renglones: c.renglones.map((r) => ({ piezas: r.piezas, dosCaras: r.dosCaras, material: r.material.id })) }}
              texto="Lo quiero"
              irAlCarrito
              className="mt-5"
              deshabilitado={c.piezas > carritoMaximoPiezas}
            />
            {c.piezas > carritoMaximoPiezas ? (
              <p className="text-sm text-rojo-oscuro">Una compra lleva hasta {carritoMaximoPiezas.toLocaleString("es-MX")} gafetes.</p>
            ) : null}
            <p className="mt-3 text-xs text-gris">
              Los usas cuando quieras durante {paqueteVigenciaMeses} meses. No es reembolsable y sí se puede
              transferir a otra empresa.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
