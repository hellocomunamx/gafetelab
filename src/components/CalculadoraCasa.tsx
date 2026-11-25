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
  mermaCasa,
  minutosCasa,
  paqueteSugerido,
  type Rango,
} from "@/lib/hecho-en-casa";
import { pesos, textoEnviosIncluidos } from "@/lib/precios";
import { site } from "@/lib/site";
import { CTA_TEXTO } from "@/components/ui";

const soloDigitos = (v: string, largo: number) => v.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, largo);
const entero = (v: string, min: number, max: number) => Math.min(max, Math.max(min, Number.parseInt(v, 10) || min));
const redondo = (n: number) => pesos(Math.round(n));

/** Lo que recibe la empresa con LaGafetería y no con el gafete hecho en casa. */
const incluye = [
  "Gafete de PVC que no se dobla ni se despega",
  "Código QR para verificar que sigue vigente",
  "Tu plataforma para el equipo, sin costo extra",
  "Sin enmicadora, plantilla ni tinta que comprar",
];

/** Costos que no se ven en pesos: lo que pasa en casa contra lo que pasa con LaGafetería. */
const noSaleEnLaCuenta = [
  {
    casa: "Un nombre mal escrito o una foto movida se descubre cuando el gafete ya está enmicado.",
    nosotros: "Revisas cada gafete en pantalla antes de pagar.",
  },
  {
    casa: "Quién tiene gafete, quién se fue y quién pidió reposición vive en un Excel que alguien actualiza.",
    nosotros: "Tu plataforma lleva altas, bajas y el historial de cada persona.",
  },
  {
    casa: "Depende de la persona que sabe usar la plantilla: si sale de vacaciones, nadie tiene gafete.",
    nosotros: "Cualquiera con acceso lo pide, y tu equipo pide sus cambios desde «Mi gafete».",
  },
];

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
  const [merma, setMerma] = useState(mermaCasa.omision);

  const n = entero(gafetes, 1, gafetesMesMaximo);
  const costoHora = entero(hora, costoHoraCasa.min, costoHoraCasa.max);
  const supuestos = { materiales, minutos, costoHora, merma };
  const c = compararCasa(n, supuestos);
  const desde = gafetesParaQueConvenga(supuestos);
  const conviene = c.ahorroMes >= 0;
  const sugerido = paqueteSugerido(n);
  // El paquete solo se sugiere si de verdad baja el precio por pieza del pedido mensual.
  const paquete = !conviene && sugerido && sugerido.paquete.porPieza < c.nosotros.porPieza ? sugerido : null;
  const paqueteMes = paquete ? Math.round(paquete.paquete.porPieza * n * 100) / 100 : 0;
  // Con un paquete, a veces sí sale más barato que hacerlo en casa aunque el pedido mensual no.
  const ganaPaquete = Boolean(paquete) && paqueteMes < c.casa.mes;
  // Lo que pagas de más por gafete con la opción más barata de LaGafetería (pedido del mes o paquete).
  const masPorGafete = Math.min(c.nosotros.porPieza, paquete?.paquete.porPieza ?? Infinity) - c.casa.porPieza;
  const ahorro = conviene ? c.ahorroMes : ganaPaquete ? c.casa.mes - paqueteMes : 0;

  const barras = [
    { nombre: "Imprimirlo tú", mes: c.casa.mes, pieza: c.casa.porPieza, color: "bg-white/60" },
    { nombre: site.nombre, mes: c.nosotros.mes, pieza: c.nosotros.porPieza, color: "bg-rojo" },
    ...(paquete
      ? [{ nombre: `Con paquete de ${paquete.paquete.piezas}`, mes: paqueteMes, pieza: paquete.paquete.porPieza, color: "bg-resaltador" }]
      : []),
  ];
  const maximo = Math.max(...barras.map((b) => b.mes)) || 1;

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
        <Deslizador
          etiqueta="Gafetes que se vuelven a hacer"
          ayuda="Mica con burbuja, nombre mal escrito, foto movida o papel que se dobla. Estimado."
          rango={mermaCasa}
          valor={merma}
          onChange={setMerma}
          formato={(v) => `${v} %`}
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
        {conviene || ganaPaquete ? (
          <p className="mt-1 font-titulos text-3xl leading-tight font-extrabold">
            Te ahorras <span className="text-resaltador">{redondo(ahorro)}</span> al mes
            {ganaPaquete ? " con un paquete prepagado" : ""}
          </p>
        ) : (
          <p className="mt-1 font-titulos text-3xl leading-tight font-extrabold">
            Por <span className="text-resaltador">{pesos(Math.ceil(masPorGafete))}</span> más por gafete, te ahorras{" "}
            {horasTexto(c.casa.horasMes)} de trabajo al mes
          </p>
        )}
        <p className="mt-2 text-white/80">
          {conviene || ganaPaquete ? (
            <>
              Son {redondo(ahorro * 12)} al año y{" "}
              <strong className="text-white">{horasTexto(c.casa.horasMes)} al mes</strong> que tu equipo deja de
              recortar y enmicar.
            </>
          ) : (
            <>
              Y en lugar de un gafete de papel enmicado, recibes:
            </>
          )}
        </p>
        {!conviene ? (
          <>
            {ganaPaquete ? <p className="mt-3 text-white/80">Y en lugar de un gafete de papel enmicado, recibes:</p> : null}
            <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              {incluye.map((t) => (
                <li key={t} className="flex gap-2">
                  <span aria-hidden className="text-resaltador">✓</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            {desde ? (
              <p className="mt-3 text-sm text-white/80">
                Y desde {desde.toLocaleString("es-MX")} gafetes al mes, también te sale más barato en dinero.
              </p>
            ) : null}
          </>
        ) : null}
        {paquete ? (
          <p className="mt-4 rounded-tarjeta-chica bg-white/10 p-3 text-sm text-white/90">
            <strong className="text-resaltador">¿Pides pocos?</strong> Con un paquete prepagado de{" "}
            {paquete.paquete.piezas} gafetes cada uno sale en {pesos(paquete.paquete.porPieza)}, con{" "}
            {textoEnviosIncluidos(paquete.paquete.envios)}, y te alcanza para{" "}
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
          {c.nosotros.envio > 0 ? `, con ${pesos(c.nosotros.envio)} de envío prorrateado` : ", con envío gratis"}. Todo antes de IVA. Imprimirlo tú: materiales y tiempo de tu equipo, contando los que se vuelven a hacer.
        </p>
        <Link
          href="/cotizar"
          className="mt-5 inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 font-semibold text-tinta transition-colors hover:bg-papel"
        >
          {CTA_TEXTO}
        </Link>
      </div>

      <div className="min-w-0 lg:col-span-2">
        <h3 className="font-titulos text-xl font-extrabold">Lo que no sale en la cuenta</h3>
        <ul className="mt-4 grid gap-4 md:grid-cols-3">
          {noSaleEnLaCuenta.map((r) => (
            <li key={r.casa} className="rounded-tarjeta-chica border border-linea p-4">
              <p className="text-sm text-gris">
                <span aria-hidden className="mr-1.5 font-bold text-rojo">✕</span>
                {r.casa}
              </p>
              <p className="mt-2 text-sm font-semibold">
                <span aria-hidden className="mr-1.5 text-[#0a7d4f]">✓</span>
                {r.nosotros}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
