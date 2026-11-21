import type { Material } from "@/lib/materiales";

const TINTA = "#1b1f3b";

/**
 * Ilustración de un material: la tarjeta vista en ángulo, con el canto
 * proporcional a su grosor. Es un dibujo, no una fotografía del producto.
 */
export function MuestraMaterial({ material, className = "" }: { material: Material; className?: string }) {
  const canto = Math.max(2, Math.round(material.grosorMm * 9));
  const cara = (relleno: string, extra = "") => (
    <rect x={-44} y={-27} width={88} height={54} rx={5} fill={relleno} className={extra} />
  );
  const vista = "translate(60 34) rotate(-10) skewX(-18) scale(1 0.72)";
  return (
    <svg viewBox="0 0 120 76" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={`brillo-${material.id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0.35" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="0.65" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`cara-${material.id}`}>
          <rect x={-44} y={-27} width={88} height={54} rx={5} />
        </clipPath>
      </defs>
      <ellipse cx={60} cy={62} rx={46} ry={6} fill={TINTA} opacity={0.1} />
      {material.id === "adhesivo" ? (
        <g transform={`translate(0 ${canto + 4})`}>
          <g transform={vista}>{cara("#ffd23f")}</g>
        </g>
      ) : null}
      <g transform={`translate(0 ${canto})`}>
        <g transform={vista}>{cara(material.id === "rudo" ? "#8b90a6" : "#b9bed0")}</g>
      </g>
      <g transform={vista}>
        {cara("#fff")}
        <g clipPath={`url(#cara-${material.id})`}>
          <rect x={-44} y={-27} width={88} height={15} fill="#e63b2e" />
          <rect x={-36} y={-5} width={20} height={24} rx={2} fill="#eef0f5" />
          <rect x={-10} y={-3} width={38} height={5} rx={1} fill={TINTA} />
          <rect x={-10} y={6} width={24} height={3.5} rx={1} fill="#c5c9d8" />
          {material.id === "proximidad" ? (
            <g fill="none" stroke={TINTA} strokeWidth={2} strokeLinecap="round">
              <path d="M22 12a4 4 0 0 1 0 8" />
              <path d="M27 8a9 9 0 0 1 0 16" />
              <path d="M32 4a14 14 0 0 1 0 24" />
            </g>
          ) : null}
          <rect x={-44} y={-27} width={88} height={54} fill={`url(#brillo-${material.id})`} />
        </g>
        <rect x={-44} y={-27} width={88} height={54} rx={5} fill="none" stroke={TINTA} strokeOpacity={0.25} />
      </g>
    </svg>
  );
}
