"use client";

import Link from "next/link";
import { useId, useState } from "react";
import {
  compararCasa,
  costoHoraCasa,
  gafetesMesMaximo,
  gafetesMesOmision,
  gafetesParaQueConvenga,
  materialesCasa,
  minutosCasa,
  paqueteSugerido,
  type Rango,
} from "@/lib/hecho-en-casa";
import { pesos } from "@/lib/precios";
import { site } from "@/lib/site";
import { CTA_TEXTO } from "@/components/ui";

const soloDigitos = (v: string, largo: number) => v.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, largo);
const entero = (v: string, min: number, max: number) => Math.min(max, Math.max(min, Number.parseInt(v, 10) || min));
const redondo = (n: number) => pesos(Math.round(n));

function horasTexto(h: number): string {
  if (h < 1) return `${Math.round(h * 60)} minutos`;
  const r = Math.round(h * 10) / 10;
  return `${r.toLocaleString("es-MX", { maximumFractionDigits: 1 })} ${r === 1 ? "hora" : "horas"}`;
}

function Deslizador({
  etiqueta,
  ayuda,
  rango,
  valor,
  onChange,
  formato,
}: {
  etiqueta: string;
  ayuda: string;
  rango: Rango;
  valor: number;
  onChange: (v: number) => void;
  formato: (v: number) => string;
}) {
  const id = useId();
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold">
          {etiqueta}
        </label>
        <span className="font-titulos text-lg font-extrabold">{formato(valor)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={rango.min}
        max={rango.max}
        step={rango.paso}
        value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={formato(valor)}
        className="mt-2 w-full accent-rojo"
      />
      <p className="mt-1 text-xs text-gris">{ayuda}</p>
    </div>
  );
}

/**
 * «¿Cuánto te cuesta imprimirlo tú mismo?»: la empresa pone cuántos gafetes
 * hace al mes y compara su costo real (materiales más tiempo de su gente)
 * contra un pedido al mes con LaGafetería, con los precios vigentes.
 */
export function CalculadoraCasa() {
  const [gafetes, setGafetes] = useState(String(gafetesMesOmision));
  const [materiales, setMateriales] = useState(materialesCasa.omision);
  const [minutos, setMinutos] = useState(minutosCasa.omision);
  const [hora, setHora] = useState(String(costoHoraCasa.omision));

  const n = entero(gafetes, 1, gafetesMesMaximo);
  const costoHora = entero(hora, costoHoraCasa.min, costoHoraCasa.max);
  const c = compararCasa(n, materiales, minutos, costoHora);
  const desde = gafetesParaQueConvenga(materiales, minutos, costoHora);
  const conviene = c.ahorroMes >= 0;
  const sugerido = paqueteSugerido(n);
  // El paquete solo se sugiere si de verdad baja el precio por pieza del pedido mensual.
  const paquete = !conviene && sugerido && sugerido.paquete.porPieza < c.nosotros.porPieza ? sugerido : null;
  const maximo = Math.max(c.casa.mes, c.nosotros.mes) || 1;

  const barras = [
    { nombre: "Imprimirlo tú", mes: c.casa.mes, pieza: c.casa.porPieza, color: "bg-white/60" },
    { nombre: site.nombre, mes: c.nosotros.mes, pieza: c.nosotros.porPieza, color: "bg-rojo" },
  ];

  return (
    <div className="grid gap-6 rounded-tarjeta border border-linea bg-white p-5 sm:p-7 lg:grid-cols-[1fr_1.1fr]">
      <div className="min-w-0 space-y-6">
        <label className="block">
          <span className="block text-sm font-semibold">¿Cuántos gafetes haces al mes?</span>
          <span className="mt-1.5 flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={gafetes}
              onChange={(e) => setGafetes(soloDigitos(e.target.value, 4))}
              onBlur={() => setGafetes(String(n))}
              className="w-28 rounded-tarjeta-chica border border-linea px-3 py-2 text-lg font-semibold"
            />
            <span className="text-gris">gafetes</span>
          </span>
          <span className="mt-1 block text-xs text-gris">Altas, reposiciones y cambios de puesto, todo junto.</span>
        </label>
        <Deslizador
          etiqueta="Materiales por gafete"
          ayuda="Hoja o cartulina, tinta, mica para enmicar y clip o cordón."
          rango={materialesCasa}
          valor={materiales}
          onChange={setMateriales}
          formato={pesos}
        />
        <Deslizador
          etiqueta="Minutos por gafete"
          ayuda="Acomodar nombre y foto, imprimir, recortar, enmicar y perforar."
          rango={minutosCasa}
          valor={minutos}
          onChange={setMinutos}
          formato={(v) => `${v} min`}
        />
        <label className="block">
          <span className="block text-sm font-semibold">¿Cuánto cuesta una hora de quien los hace?</span>
          <span className="mt-1.5 flex items-center gap-2">
            <span className="text-lg font-semibold">$</span>
            <input
              type="text"
              inputMode="numeric"
              value={hora}
              onChange={(e) => setHora(soloDigitos(e.target.value, 4))}
              onBlur={() => setHora(String(costoHora))}
              className="w-24 rounded-tarjeta-chica border border-linea px-3 py-2 text-lg font-semibold"
            />
            <span className="text-gris">por hora, con prestaciones</span>
          </span>
        </label>
      </div>

      <div className="min-w-0 rounded-tarjeta-chica bg-tinta p-5 text-white sm:p-6" aria-live="polite">
        <p className="text-sm text-white/70">Con {n.toLocaleString("es-MX")} {n === 1 ? "gafete" : "gafetes"} al mes</p>
        {conviene ? (
          <p className="mt-1 font-titulos text-3xl leading-tight font-extrabold">
            Te ahorras <span className="text-resaltador">{redondo(c.ahorroMes)}</span> al mes
          </p>
        ) : (
          <p className="mt-1 font-titulos text-3xl leading-tight font-extrabold">
            Te ahorras <span className="text-resaltador">{horasTexto(c.casa.horasMes)}</span> de trabajo al mes
          </p>
        )}
        <p className="mt-2 text-white/80">
          {conviene ? (
            <>
              Son {redondo(c.ahorroMes * 12)} al año y{" "}
              <strong className="text-white">{horasTexto(c.casa.horasMes)} al mes</strong> que tu equipo deja de
              recortar y enmicar.
            </>
          ) : (
            <>
              En dinero, hacerlo tú sale <strong className="text-white">{redondo(-c.ahorroMes)} más barato al mes</strong>,
              pero tu equipo deja de recortar y enmicar, y el gafete es de PVC, no de papel.
              {desde ? <> Desde {desde.toLocaleString("es-MX")} gafetes al mes, con nosotros sale más barato.</> : null}
            </>
          )}
        </p>
        {paquete ? (
          <p className="mt-4 rounded-tarjeta-chica bg-white/10 p-3 text-sm text-white/90">
            <strong className="text-resaltador">¿Pides pocos?</strong> Con un paquete prepagado de{" "}
            {paquete.paquete.piezas} gafetes cada uno sale en {pesos(paquete.paquete.porPieza)}, con{" "}
            {paquete.paquete.envios} envíos incluidos, y te alcanza para{" "}
            {paquete.meses === 1 ? "un mes" : `${paquete.meses} meses`}.{" "}
            <Link href="/precios#paquete-a-la-medida" className="font-semibold text-white underline underline-offset-4">
              Ver paquetes
            </Link>
          </p>
        ) : null}

        <ul className="mt-6 space-y-4">
          {barras.map((b) => (
            <li key={b.nombre}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="shrink-0 font-semibold">{b.nombre}</span>
                <span>
                  <strong className="font-titulos text-lg">{redondo(b.mes)}</strong>
                  <span className="text-white/70"> al mes · {pesos(b.pieza)} c/u</span>
                </span>
              </div>
              <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full ${b.color} transition-[width] duration-300`}
                  style={{ width: `${Math.max(2, (b.mes / maximo) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-5 text-xs text-white/60">
          {site.nombre}: un pedido al mes de gafetes de PVC a una cara
          {c.nosotros.envio > 0 ? `, con ${pesos(c.nosotros.envio)} de envío prorrateado` : ", con envío gratis"}. Todo antes de IVA. Imprimirlo tú: materiales más el tiempo de tu equipo.
        </p>
        <Link
          href="/cotizar"
          className="mt-5 inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 font-semibold text-tinta transition-colors hover:bg-papel"
        >
          {CTA_TEXTO}
        </Link>
      </div>
    </div>
  );
}
