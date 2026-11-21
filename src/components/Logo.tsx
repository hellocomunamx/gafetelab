import { site } from "@/lib/site";

/**
 * Logo PROVISIONAL de LaGafetería: etiqueta en blanco + nombre en texto.
 * Cuando lleguen los archivos finales de marca, se sustituye solo este
 * componente (y los íconos de src/app y public/marca).
 */
export function Logo({ inverso = false }: { inverso?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg viewBox="16 6 168 188" width="30" height="34" aria-hidden>
        <path
          d="M42 6 H158 A26 26 0 0 1 184 32 V168 A26 26 0 0 1 158 194 H42 A26 26 0 0 1 16 168 V32 A26 26 0 0 1 42 6 Z"
          fill="#E63B2E"
        />
        <path
          d="M78.5 20 H121.5 A6.5 6.5 0 0 1 121.5 33 H78.5 A6.5 6.5 0 0 1 78.5 20 Z"
          fill={inverso ? "#FFFFFF" : "#1B1F3B"}
        />
        <path
          d="M46 74 H154 A14 14 0 0 1 168 88 V160 A14 14 0 0 1 154 174 H46 A14 14 0 0 1 32 160 V88 A14 14 0 0 1 46 74 Z"
          fill="#FFFFFF"
        />
      </svg>
      <span
        className={`font-titulos text-2xl leading-none font-extrabold tracking-tight ${
          inverso ? "text-white" : "text-tinta"
        }`}
      >
        {site.nombre}
      </span>
    </span>
  );
}
