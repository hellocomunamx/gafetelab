/**
 * Dibujos de la guía de medidas (/medidas-de-gafetes). Todos los SVG usan
 * 1 unidad = 1 mm, así que las proporciones son reales.
 */
import { cr80, grosores, grosorHojaMm, type Tamano } from "@/lib/guia-medidas";
import { medidas } from "@/lib/materiales";

const ROJO = "#e63b2e";
const TINTA = "#1b1f3b";
const GRIS = "#5c6178";
const PAPEL = "#eef0f5";
const RESALTADOR = "#ffd23f";

const fuenteTitulos = { fontFamily: "var(--font-titulos)", fontWeight: 800 } as const;
const fuenteMano = { fontFamily: "var(--font-mano)" } as const;

/** Flecha de cota: línea con remates y el texto en medio. */
function Cota({
  x1,
  y1,
  x2,
  y2,
  texto,
  vertical = false,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  texto: string;
  vertical?: boolean;
}) {
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const remate = 1.8;
  return (
    <g stroke={ROJO} strokeWidth={0.45} fill="none">
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      {vertical ? (
        <>
          <line x1={x1 - remate} y1={y1} x2={x1 + remate} y2={y1} />
          <line x1={x2 - remate} y1={y2} x2={x2 + remate} y2={y2} />
        </>
      ) : (
        <>
          <line x1={x1} y1={y1 - remate} x2={x1} y2={y1 + remate} />
          <line x1={x2} y1={y2 - remate} x2={x2} y2={y2 + remate} />
        </>
      )}
      <g transform={vertical ? `rotate(-90 ${cx} ${cy})` : undefined}>
        <rect x={cx - 13} y={cy - 3.4} width={26} height={6.8} rx={3.4} fill="#fff" stroke="none" />
        <text
          x={cx}
          y={cy + 1.5}
          textAnchor="middle"
          fontSize={4.2}
          fill={ROJO}
          stroke="none"
          style={fuenteTitulos}
        >
          {texto}
        </text>
      </g>
    </g>
  );
}

/** El gafete CR80 a escala, con sus cotas de ancho, alto y esquina. */
export function GafeteConCotas({ className = "" }: { className?: string }) {
  const w = cr80.anchoMm;
  const h = medidas.alto;
  const r = cr80.radioEsquinaMm;
  return (
    <svg
      viewBox="-16 -16 124 92"
      role="img"
      aria-label={`Gafete estándar CR80 de ${w} milímetros de ancho por ${h} de alto, con esquinas redondeadas de ${r} milímetros`}
      className={className}
    >
      <rect x={0} y={1.2} width={w} height={h} rx={r} fill={TINTA} opacity={0.18} />
      <rect x={0} y={0} width={w} height={h} rx={r} fill="#fff" stroke={TINTA} strokeWidth={0.5} />
      {/* Muestra de diseño, ilustrativa. */}
      <path d={`M${r} 0h${w - r * 2}a${r} ${r} 0 0 1 ${r} ${r}v13h${-w}v-13a${r} ${r} 0 0 1 ${r} ${-r}z`} fill={ROJO} />
      <text x={6} y={10.2} fontSize={5.4} fill="#fff" style={fuenteMano}>
        Hola, soy
      </text>
      <rect x={6} y={20} width={20} height={24} rx={2} fill={PAPEL} />
      <circle cx={16} cy={29} r={4.8} fill="#c5c9d8" />
      <path d="M7.5 44 a8.5 8 0 0 1 17 0 z" fill="#c5c9d8" />
      <text x={31} y={27} fontSize={6} fill={TINTA} style={fuenteTitulos}>
        Ana Martínez
      </text>
      <text x={31} y={33.5} fontSize={3.8} fill={GRIS}>
        Atención a clientes
      </text>
      <rect x={31} y={38} width={30} height={2.4} rx={1.2} fill={RESALTADOR} />
      <path d={`M0 ${h - 4}h${w}v${4 - r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - r * 2)}a${r} ${r} 0 0 1 ${-r} ${-r}z`} fill={TINTA} />

      <Cota x1={0} y1={-8} x2={w} y2={-8} texto={`${w} mm`} />
      <Cota x1={w + 8} y1={0} x2={w + 8} y2={h} texto={`${h} mm`} vertical />

      {/* Esquina redondeada. */}
      <circle cx={r} cy={h - r} r={r} fill="none" stroke={ROJO} strokeWidth={0.35} strokeDasharray="0.8 0.6" />
      <path d={`M${r} ${h - r} L-6 ${h + 9}`} stroke={ROJO} strokeWidth={0.35} />
      <text x={-6} y={h + 13.5} fontSize={4} fill={ROJO} style={fuenteTitulos}>
        Esquina de {r} mm
      </text>
      <text x={w} y={h + 13.5} textAnchor="end" fontSize={4} fill={GRIS}>
        Grosor: {cr80.grosorMm} mm
      </text>
    </svg>
  );
}

/** Lienzo común para que todos los tamaños se dibujen a la misma escala. */
const LIENZO = { w: 125, h: 88 };

/** Un tamaño dibujado a escala, con la silueta del CR80 punteada para comparar. */
export function TamanoAEscala({ tamano }: { tamano: Tamano }) {
  const pad = 3;
  const base = LIENZO.h + pad;
  const radio = (t: { anchoMm: number }) => (t.anchoMm < 40 ? 1.5 : cr80.radioEsquinaMm);
  return (
    <svg
      viewBox={`${-pad} ${-pad} ${LIENZO.w + pad * 2} ${LIENZO.h + pad * 2}`}
      role="img"
      aria-label={`${tamano.nombre}: ${tamano.anchoMm} por ${tamano.altoMm} milímetros, comparado con un gafete CR80`}
      className="w-full"
    >
      <rect
        x={0}
        y={base - pad - tamano.altoMm}
        width={tamano.anchoMm}
        height={tamano.altoMm}
        rx={radio(tamano)}
        fill={tamano.nuestro ? ROJO : PAPEL}
        stroke={tamano.nuestro ? ROJO : GRIS}
        strokeWidth={0.6}
      />
      {tamano.nuestro ? null : (
        <rect
          x={0}
          y={base - pad - cr80.altoMm}
          width={cr80.anchoMm}
          height={cr80.altoMm}
          rx={cr80.radioEsquinaMm}
          fill="none"
          stroke={ROJO}
          strokeWidth={0.6}
          strokeDasharray="2 1.4"
        />
      )}
    </svg>
  );
}

/** Barras de grosor, proporcionales, con una hoja de papel como referencia. */
export function BarrasGrosor() {
  const filas = [
    { nombre: "Hoja de papel bond", mm: grosorHojaMm, uso: "Para darte idea.", nuestro: false, referencia: true },
    ...grosores.map((g) => ({ ...g, referencia: false })),
  ];
  const maximo = Math.max(...filas.map((f) => f.mm));
  return (
    <ul className="space-y-5">
      {filas.map((f) => (
        <li key={f.nombre}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4">
            <span className="font-semibold">
              {f.nombre}
              {f.nuestro ? (
                <span className="ml-2 inline-block rounded-full bg-resaltador px-2 py-0.5 align-middle text-xs font-semibold">
                  Lo usamos
                </span>
              ) : null}
            </span>
            <span className="font-titulos text-lg font-extrabold">{f.mm} mm</span>
          </div>
          <div className="mt-2 h-4 rounded-full bg-white ring-1 ring-linea" aria-hidden>
            <div
              className={`h-4 rounded-full ${f.referencia ? "bg-gris/40" : f.mm === cr80.grosorMm ? "bg-rojo" : "bg-tinta/70"}`}
              style={{ width: `${(f.mm / maximo) * 100}%` }}
            />
          </div>
          <p className="mt-1 text-sm text-gris">{f.uso}</p>
        </li>
      ))}
    </ul>
  );
}
