import { materiales } from "@/lib/materiales";
import { extraDosCaras, notaIva, pesos, precioDigital, rangoTexto, tramos } from "@/lib/precios";

/** Tabla HTML real (no imagen): fácil de leer para personas, buscadores y asistentes de IA. */
export function TablaPrecios() {
  const precio = (n: number) => (
    <>
      <span className="font-titulos text-xl font-extrabold">{pesos(n)}</span>{" "}
      <span className="text-sm text-gris">por pieza</span>
    </>
  );
  const extras = materiales.filter((m) => m.disponible && m.extra > 0);
  return (
    <div>
      <div className="overflow-x-auto rounded-tarjeta border border-linea bg-white">
        <table className="w-full min-w-[30rem] text-left">
          <caption className="sr-only">
            Precio por pieza de gafetes y credenciales impresos en PVC según la cantidad, en pesos
            mexicanos, {notaIva}
          </caption>
          <thead className="bg-papel text-sm">
            <tr>
              <th scope="col" className="px-5 py-3 font-semibold">Cantidad de piezas</th>
              <th scope="col" className="px-5 py-3 font-semibold">Impreso, una cara</th>
              <th scope="col" className="px-5 py-3 font-semibold">Impreso, frente y vuelta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linea">
            {tramos.map((t) => (
              <tr key={t.desde}>
                <th scope="row" className="px-5 py-3 font-medium">{rangoTexto(t)}</th>
                <td className="px-5 py-3">{precio(t.precio)}</td>
                <td className="px-5 py-3">{precio(t.precio + extraDosCaras(t.desde))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="mt-3 space-y-1 text-sm text-gris">
        <li>
          <strong className="text-tinta">Gafete digital: {pesos(precioDigital)} por pieza</strong>, solo
          o sumado al impreso, en cualquier cantidad.
        </li>
        <li>
          Precios en PVC estándar.{" "}
          {extras.map((m) => `${m.nombre}: +${pesos(m.extra)} por pieza`).join("; ")}.
        </li>
      </ul>
    </div>
  );
}
