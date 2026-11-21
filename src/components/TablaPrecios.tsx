import { extraDigital, extraDosCaras, notaIva, pesos, rangoTexto, tramos } from "@/lib/precios";

/** Tabla HTML real (no imagen): fácil de leer para personas, buscadores y asistentes de IA. */
export function TablaPrecios() {
  const precio = (n: number) => (
    <>
      <span className="font-titulos text-xl font-extrabold">{pesos(n)}</span>{" "}
      <span className="text-sm text-gris">por pieza</span>
    </>
  );
  return (
    <div>
      <div className="overflow-x-auto rounded-tarjeta border border-linea bg-white">
        <table className="w-full min-w-[40rem] text-left">
          <caption className="sr-only">
            Precio por pieza de gafetes y credenciales según la cantidad y la modalidad (impreso en
            PVC o digital), en pesos mexicanos, {notaIva}
          </caption>
          <thead className="bg-papel text-sm">
            <tr>
              <th scope="col" className="px-5 py-3 font-semibold">Cantidad de piezas</th>
              <th scope="col" className="px-5 py-3 font-semibold">Impreso, una cara</th>
              <th scope="col" className="px-5 py-3 font-semibold">Impreso, frente y vuelta</th>
              <th scope="col" className="px-5 py-3 font-semibold">Solo digital</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linea">
            {tramos.map((t) => (
              <tr key={t.desde}>
                <th scope="row" className="px-5 py-3 font-medium">{rangoTexto(t)}</th>
                <td className="px-5 py-3">{precio(t.precio)}</td>
                <td className="px-5 py-3">{precio(t.precio + extraDosCaras)}</td>
                <td className="px-5 py-3">{precio(t.digital)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-gris">
        Impreso + digital: suma {pesos(extraDigital)} por pieza al precio del gafete impreso.
      </p>
    </div>
  );
}
