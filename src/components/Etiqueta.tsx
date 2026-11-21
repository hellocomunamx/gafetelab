/**
 * Recurso gráfico de la marca: la etiqueta "Hola, soy ___".
 * Banda roja, campo blanco y el nombre escrito a mano. Gira entre −3° y 3°.
 */
export function Etiqueta({
  nombre,
  puesto,
  giro = -3,
  className = "",
}: {
  nombre: string;
  puesto?: string;
  giro?: number;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={`Gafete de ejemplo: Hola, soy ${nombre}${puesto ? `, ${puesto}` : ""}`}
      className={`w-64 overflow-hidden rounded-[22px] bg-rojo shadow-[0_18px_40px_-12px_rgba(27,31,59,0.35)] ${className}`}
      style={{ transform: `rotate(${giro}deg)` }}
    >
      <div aria-hidden className="px-5 pt-3 pb-4 text-center text-white">
        <span className="mx-auto mb-3 block h-3 w-14 rounded-full bg-tinta" />
        <span className="font-titulos text-3xl leading-none font-extrabold">Hola, soy</span>
      </div>
      <div
        aria-hidden
        className="mx-3 mb-3 flex min-h-32 flex-col items-center justify-center rounded-gl bg-white px-4 py-5 text-center"
      >
        <span className="font-mano text-5xl leading-none text-tinta">{nombre}</span>
        {puesto ? (
          <span className="mt-3 text-xs font-semibold tracking-widest text-gris uppercase">
            {puesto}
          </span>
        ) : null}
      </div>
    </div>
  );
}
