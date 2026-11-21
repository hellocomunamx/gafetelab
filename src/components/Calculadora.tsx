"use client";

import { useState } from "react";
import { cotizar, extraDosCaras, notaIva, pesos, tramos } from "@/lib/precios";
import { site } from "@/lib/site";

export function Calculadora() {
  const [cantidad, setCantidad] = useState(30);
  const [dosCaras, setDosCaras] = useState(false);
  const { piezas, porPieza, subtotal } = cotizar(cantidad, dosCaras);

  const siguiente = tramos.find((t) => t.desde > piezas);
  const asunto = encodeURIComponent(`Cotización de ${piezas} gafetes`);
  const cuerpo = encodeURIComponent(
    `Hola, quiero cotizar ${piezas} gafetes ${dosCaras ? "por frente y vuelta" : "a una cara"}.\n\nEmpresa:\nCiudad y código postal de entrega:\n`,
  );

  return (
    <div className="rounded-tarjeta border border-linea bg-white p-6 shadow-sm sm:p-8">
      <div className="grid gap-6 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold">¿Cuántos gafetes necesitas?</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={100000}
            value={cantidad}
            onChange={(e) => setCantidad(Number(e.target.value))}
            className="mt-2 w-full rounded-tarjeta-chica border border-linea px-4 py-3 text-lg font-semibold"
          />
        </label>
        <fieldset>
          <legend className="text-sm font-semibold">Impresión</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[
              { valor: false, texto: "Una cara" },
              { valor: true, texto: "Frente y vuelta" },
            ].map((o) => (
              <label
                key={o.texto}
                className={`cursor-pointer rounded-tarjeta-chica border px-3 py-3 text-center font-medium ${
                  dosCaras === o.valor ? "border-tinta bg-tinta text-white" : "border-linea"
                }`}
              >
                <input
                  type="radio"
                  name="caras"
                  className="sr-only"
                  checked={dosCaras === o.valor}
                  onChange={() => setDosCaras(o.valor)}
                />
                {o.texto}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div aria-live="polite" className="mt-6 rounded-tarjeta bg-papel p-5">
        <p className="text-sm text-gris">
          {piezas} {piezas === 1 ? "pieza" : "piezas"} × {pesos(porPieza)} por pieza
        </p>
        <p className="mt-1 font-titulos text-4xl font-extrabold">
          <span className="resaltado">{pesos(subtotal)}</span>{" "}
          <span className="font-texto text-base font-medium text-gris">{notaIva}, más envío</span>
        </p>
        {siguiente ? (
          <p className="mt-2 text-sm text-gris">
            Desde {siguiente.desde} piezas, cada una baja a {pesos(siguiente.precio + (dosCaras ? extraDosCaras : 0))}.
          </p>
        ) : null}
      </div>

      <a
        href={`mailto:${site.correo}?subject=${asunto}&body=${cuerpo}`}
        className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-rojo px-6 py-3 font-semibold text-white transition-colors hover:bg-rojo-oscuro sm:w-auto"
      >
        Pedir esta cotización por correo
      </a>
      <p className="mt-3 text-sm text-gris">
        Te respondemos con el costo de envío a tu código postal y la fecha estimada de entrega.
      </p>
    </div>
  );
}
