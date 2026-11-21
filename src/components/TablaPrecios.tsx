import { extraDosCaras, notaIva, pesos, rangoTexto, tramos } from "@/lib/precios";

/** Tabla HTML real (no imagen): fácil de leer para personas, buscadores y asistentes de IA. */
export function TablaPrecios() {
  return (
    <div className="overflow-x-auto rounded-tarjeta border border-linea bg-white">
      <table className="w-full min-w-[30rem] text-left">
        <caption className="sr-only">
          Precio por pieza de gafetes y credenciales de PVC según la cantidad, en pesos mexicanos,{" "}
          {notaIva}
        </caption>
        <thead className="bg-papel text-sm">
          <tr>
            <th scope="col" className="px-5 py-3 font-semibold">Cantidad de piezas</th>
            <th scope="col" className="px-5 py-3 font-semibold">Una cara</th>
            <th scope="col" className="px-5 py-3 font-semibold">Frente y vuelta</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-linea">
          {tramos.map((t) => (
            <tr key={t.desde}>
              <th scope="row" className="px-5 py-3 font-medium">{rangoTexto(t)}</th>
              <td className="px-5 py-3">
                <span className="font-titulos text-xl font-extrabold">{pesos(t.precio)}</span>{" "}
                <span className="text-sm text-gris">por pieza</span>
              </td>
              <td className="px-5 py-3">
                <span className="font-titulos text-xl font-extrabold">
                  {pesos(t.precio + extraDosCaras)}
                </span>{" "}
                <span className="text-sm text-gris">por pieza</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
