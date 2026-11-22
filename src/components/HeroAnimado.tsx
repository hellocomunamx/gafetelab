import { Celular, GafeteHorizontal, GafeteVertical, VentanaPlataforma } from "./Muestras";

const escenas = [
  "Horizontal, por frente y vuelta",
  "Vertical, con tus datos y código QR",
  "Vigente o expirado al escanear su QR",
  "Tu plataforma, sin costo extra",
];

/**
 * Animación del héroe: cuatro escenas que se relevan (gafete horizontal que se
 * voltea, gafete vertical por frente y vuelta, gafete digital en el celular y
 * la plataforma). Es solo CSS (ver `.heroe-animado` en globals.css): no carga
 * JavaScript, se detiene al pasar el cursor y, si la persona pidió menos
 * movimiento, se queda fija en la primera escena.
 */
export function HeroAnimado() {
  return (
    <div
      role="img"
      aria-label="Ejemplos de gafetes y credenciales: horizontal y vertical, por frente y vuelta con código QR, el gafete en el celular con sello de vigente o expirado al escanear su código QR, y la plataforma para administrar al equipo."
      className="heroe-animado mx-auto w-full max-w-sm"
    >
      <div aria-hidden className="relative h-[350px]">
        <div className="escena escena-1 absolute inset-0 flex items-center justify-center">
          <div className="-rotate-3 [perspective:1100px]">
            <div className="volteo relative">
              <GafeteHorizontal className="cara" />
              <GafeteHorizontal cara="vuelta" className="cara cara-vuelta absolute inset-0" />
            </div>
          </div>
        </div>

        <div className="escena escena-2 absolute inset-0 flex items-center justify-center">
          <GafeteVertical className="abanico-izq relative z-10" />
          <GafeteVertical cara="vuelta" className="abanico-der -ml-4" />
        </div>

        <div className="escena escena-3 absolute inset-0 flex items-center justify-center">
          <Celular estado="cambia" className="rotate-2" />
        </div>

        <div className="escena escena-4 absolute inset-0 flex items-center justify-center">
          <VentanaPlataforma compacta className="w-full max-w-[340px]" />
        </div>
      </div>

      <div aria-hidden className="relative mt-3 h-6 text-center text-sm font-semibold">
        {escenas.map((texto, i) => (
          <span key={texto} className={`rotulo escena-${i + 1} absolute inset-x-0`}>
            {texto}
          </span>
        ))}
      </div>
      <div aria-hidden className="puntos mt-2 flex justify-center gap-1.5">
        {escenas.map((texto, i) => (
          <span key={texto} className={`punto escena-${i + 1} h-1.5 w-1.5 rounded-full bg-linea`} />
        ))}
      </div>
    </div>
  );
}
