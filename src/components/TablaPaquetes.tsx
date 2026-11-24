import { BotonAgregar } from "@/components/carrito/BotonAgregar";
import { IncluyePaquete } from "@/components/IncluyePaquete";
import {
  notaIva,
  paquetes,
  pesos,
  precioPaquete,
} from "@/lib/precios";

/** Paquetes prepagados de gafetes impresos, para pedir de a poquitos. */
export function TablaPaquetes() {
  return (
    <div>
      <div className="overflow-x-auto rounded-tarjeta border border-linea bg-white">
        <table className="w-full min-w-[42rem] text-left">
          <caption className="sr-only">
            Paquetes prepagados de gafetes y credenciales impresos: piezas, precio por pieza, envíos
            incluidos y precio del paquete, en pesos mexicanos, {notaIva}
          </caption>
          <thead className="bg-papel text-sm">
            <tr>
              <th scope="col" className="px-5 py-3 font-semibold">Paquete</th>
              <th scope="col" className="px-5 py-3 font-semibold">Precio por pieza</th>
              <th scope="col" className="px-5 py-3 font-semibold">Envíos incluidos</th>
              <th scope="col" className="px-5 py-3 font-semibold">Precio del paquete</th>
              <th scope="col" className="px-5 py-3 font-semibold"><span className="sr-only">Comprar</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linea">
            {paquetes.map((p) => (
              <tr key={p.piezas}>
                <th scope="row" className="px-5 py-3 font-medium">{p.piezas} gafetes</th>
                <td className="px-5 py-3">{pesos(p.porPieza)}</td>
                <td className="px-5 py-3">{p.envios}</td>
                <td className="px-5 py-3">
                  <span className="font-titulos text-xl font-extrabold">{pesos(precioPaquete(p))}</span>
                </td>
                <td className="px-5 py-2">
                  <BotonAgregar articulo={{ tipo: "paquete", piezas: p.piezas }} texto="Lo quiero" irAlCarrito className="w-36" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-gris">
        Precios {notaIva}. Los paquetes no son reembolsables y se pueden transferir a la cuenta de
        otra empresa.
      </p>
      <IncluyePaquete className="mt-5 max-w-3xl" />
    </div>
  );
}
