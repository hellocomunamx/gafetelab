import { useId } from "react";
import { medidas } from "@/lib/materiales";

const ROJO = "#e63b2e";
const TINTA = "#1b1f3b";
const GRIS = "#5c6178";
const PAPEL = "#eef0f5";
const VERDE = "#0a7d4f";

/** Patrón fijo que imita un código QR (solo ilustrativo). */
const QR = ["1110111", "1010101", "1110011", "0011010", "1101110", "1010001", "1110111"];

function Qr({ x, y, lado }: { x: number; y: number; lado: number }) {
  const celda = lado / QR.length;
  return (
    <g fill={TINTA}>
      {QR.flatMap((fila, f) =>
        [...fila].map((v, c) =>
          v === "1" ? (
            <rect
              key={`${f}-${c}`}
              x={x + c * celda}
              y={y + f * celda}
              width={celda + 0.02}
              height={celda + 0.02}
            />
          ) : null,
        ),
      )}
    </g>
  );
}

/** Gafete de muestra, dibujado hasta el sangrado. */
function Muestra({ w, h, s, vertical }: { w: number; h: number; s: number; vertical: boolean }) {
  const fuente = { fontFamily: "var(--font-titulos)", fontWeight: 800 } as const;
  return (
    <g>
      <rect x={-s} y={-s} width={w + s * 2} height={h + s * 2} fill="#fff" />
      <rect x={-s} y={-s} width={w + s * 2} height={vertical ? 19 : 16} fill={ROJO} />
      <rect x={-s} y={h - 3.5} width={w + s * 2} height={3.5 + s} fill={TINTA} />
      {vertical ? (
        <>
          <text x={w / 2} y={10} textAnchor="middle" fontSize={5} fill="#fff" style={fuente}>
            TU LOGO
          </text>
          <rect x={w / 2 - 12} y={21} width={24} height={28} rx={2} fill={PAPEL} />
          <circle cx={w / 2} cy={31.5} r={5.5} fill="#c5c9d8" />
          <path d={`M${w / 2 - 10} 49 a10 9 0 0 1 20 0 z`} fill="#c5c9d8" />
          <text x={w / 2} y={57.5} textAnchor="middle" fontSize={5.2} fill={TINTA} style={fuente}>
            Ana Martínez
          </text>
          <text x={w / 2} y={63} textAnchor="middle" fontSize={3.4} fill={GRIS}>
            Ventas · No. 0042
          </text>
          <Qr x={w / 2 - 6.5} y={66.5} lado={13} />
        </>
      ) : (
        <>
          <text x={6} y={8.6} fontSize={5} fill="#fff" style={fuente}>
            TU LOGO
          </text>
          <rect x={6} y={18} width={22} height={27} rx={2} fill={PAPEL} />
          <circle cx={17} cy={28} r={5} fill="#c5c9d8" />
          <path d="M8 45 a9 8.5 0 0 1 18 0 z" fill="#c5c9d8" />
          <text x={33} y={25.5} fontSize={5.6} fill={TINTA} style={fuente}>
            Ana Martínez
          </text>
          <text x={33} y={31.5} fontSize={3.6} fill={GRIS}>
            Ventas
          </text>
          <text x={33} y={37} fontSize={3} fill={GRIS}>
            No. 0042
          </text>
          <Qr x={w - 6 - 12.5} y={h - 6.5 - 12.5} lado={12.5} />
        </>
      )}
    </g>
  );
}

/**
 * Dibujo a escala (1 unidad = 1 mm) de un gafete CR80.
 * - modo "guias": el archivo completo con sangrado, línea de corte y zona segura.
 * - modo "resultado": el gafete ya cortado, con su canto según el grosor.
 */
export function DiagramaGafete({
  modo,
  vertical = false,
  imagen,
  ranura = false,
  grosorMm = 0.76,
  className = "",
}: {
  modo: "guias" | "resultado";
  vertical?: boolean;
  /** Diseño del cliente (URL local). Si falta, se dibuja un gafete de muestra. */
  imagen?: string;
  ranura?: boolean;
  grosorMm?: number;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const w = vertical ? medidas.alto : medidas.ancho;
  const h = vertical ? medidas.ancho : medidas.alto;
  const s = medidas.sangrado;
  const m = medidas.margenSeguro;
  const r = medidas.radioEsquina;
  const guias = modo === "guias";
  const aire = guias ? 8 : 5;
  const abajo = guias ? aire : 15;
  const canto = Math.max(0.9, grosorMm * 3.5);

  const corte = <rect x={0} y={0} width={w} height={h} rx={r} />;
  const diseno = imagen ? (
    <image
      href={imagen}
      x={-s}
      y={-s}
      width={w + s * 2}
      height={h + s * 2}
      preserveAspectRatio="xMidYMid slice"
    />
  ) : (
    <Muestra w={w} h={h} s={s} vertical={vertical} />
  );
  const ranuraForma = ranura ? (
    <rect
      x={(w - medidas.ranura.ancho) / 2}
      y={medidas.ranura.distanciaAlBorde - medidas.ranura.alto / 2}
      width={medidas.ranura.ancho}
      height={medidas.ranura.alto}
      rx={medidas.ranura.alto / 2}
      fill="#fff"
      stroke={TINTA}
      strokeWidth={0.3}
    />
  ) : null;

  return (
    <svg
      viewBox={`${-s - aire} ${-s - aire} ${w + (s + aire) * 2} ${h + s * 2 + aire + abajo}`}
      role="img"
      aria-label={
        guias
          ? `Gafete de ${medidas.ancho} por ${medidas.alto} milímetros con su zona de sangrado, línea de corte y zona segura`
          : `Vista del gafete terminado, con canto de ${grosorMm} milímetros`
      }
      className={className}
    >
      <defs>
        <clipPath id={`${id}-corte`}>{corte}</clipPath>
        <clipPath id={`${id}-sangrado`}>
          <rect x={-s} y={-s} width={w + s * 2} height={h + s * 2} />
        </clipPath>
        <linearGradient id={`${id}-brillo`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0.3" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id={`${id}-sombra`} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="1.2" stdDeviation="1.4" floodColor={TINTA} floodOpacity="0.28" />
        </filter>
      </defs>

      {guias ? (
        <>
          <g clipPath={`url(#${id}-sangrado)`}>{diseno}</g>
          {/* Lo que queda fuera del corte se va: se marca en rojo translúcido. */}
          <path
            fillRule="evenodd"
            fill={ROJO}
            fillOpacity={0.3}
            d={`M${-s} ${-s}h${w + s * 2}v${h + s * 2}h${-(w + s * 2)}z M${r} 0h${w - r * 2}a${r} ${r} 0 0 1 ${r} ${r}v${h - r * 2}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - r * 2)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - r * 2)}a${r} ${r} 0 0 1 ${r} ${-r}z`}
          />
          <rect
            x={-s}
            y={-s}
            width={w + s * 2}
            height={h + s * 2}
            fill="none"
            stroke={ROJO}
            strokeWidth={0.4}
            strokeDasharray="1.6 1"
          />
          <g fill="none" stroke={TINTA} strokeWidth={0.5}>
            {corte}
          </g>
          <rect
            x={m}
            y={m}
            width={w - m * 2}
            height={h - m * 2}
            rx={1.2}
            fill="none"
            stroke={VERDE}
            strokeWidth={0.45}
            strokeDasharray="2.2 1.2"
          />
          {ranuraForma}
          <g fontSize={3} fill={GRIS} textAnchor="middle">
            <text x={w / 2} y={-s - 2.6}>
              {w} mm
            </text>
            <text transform={`translate(${-s - 2.6} ${h / 2}) rotate(-90)`}>{h} mm</text>
          </g>
        </>
      ) : (
        <>
          <g filter={`url(#${id}-sombra)`}>
            <g fill="#fff">{corte}</g>
          </g>
          <g clipPath={`url(#${id}-corte)`}>
            {diseno}
            <rect x={0} y={0} width={w} height={h} fill={`url(#${id}-brillo)`} />
          </g>
          <g fill="none" stroke={TINTA} strokeOpacity={0.18} strokeWidth={0.25}>
            {corte}
          </g>
          {ranuraForma}
          {/* Canto del gafete, ampliado para comparar grosores. */}
          <rect
            x={0}
            y={h + 6}
            width={w}
            height={canto}
            rx={Math.min(0.6, canto / 2)}
            fill="#fff"
            stroke={TINTA}
            strokeWidth={0.3}
          />
          <text x={w / 2} y={h + 6 + canto + 4.4} fontSize={3} fill={GRIS} textAnchor="middle">
            Canto: {grosorMm} mm de grosor (ampliado)
          </text>
        </>
      )}
    </svg>
  );
}
