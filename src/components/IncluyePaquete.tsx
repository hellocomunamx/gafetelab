import { paqueteDistinto, paqueteEnviosExtra, paqueteIncluye, paqueteNoIncluye } from "@/lib/precios";

/**
 * Qué incluye un paquete prepagado de lista y qué no. Va junto a cada lugar
 * donde se venden los paquetes; los textos viven en `src/lib/precios.ts`.
 */
export function IncluyePaquete({ compacto = false, className = "" }: { compacto?: boolean; className?: string }) {
  return (
    <div className={`rounded-tarjeta-chica border border-linea bg-white ${compacto ? "p-4 text-sm" : "p-5"} ${className}`}>
      <p className="font-semibold">Qué incluye cada paquete</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-gris">
        {paqueteIncluye.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      <p className="mt-3 text-gris">
        <strong className="font-semibold text-tinta">No incluye:</strong> {paqueteNoIncluye}.
      </p>
      <p className="mt-2 text-gris">{paqueteDistinto}</p>
      {compacto ? null : <p className="mt-2 text-gris">{paqueteEnviosExtra}</p>}
    </div>
  );
}
