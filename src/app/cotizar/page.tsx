import { Calculadora } from "@/components/Calculadora";
import { JsonLd } from "@/components/JsonLd";
import { TablaPrecios } from "@/components/TablaPrecios";
import { Portada, Seccion } from "@/components/ui";
import { notaIva } from "@/lib/precios";
import { migas } from "@/lib/schema";
import { metadatos } from "@/lib/seo";
import { entregaTexto } from "@/lib/site";

const ruta = "/cotizar";
const rutaMigas = [{ nombre: "Cotizar", ruta }];

export const metadata = metadatos({
  titulo: "Cotiza gafetes y credenciales con envío incluido",
  descripcion:
    "Calcula al momento el precio de tus gafetes y credenciales para empleados según la cantidad y pide tu cotización con envío a cualquier ciudad de México. Sin pedido mínimo.",
  ruta,
});

export default function Cotizar() {
  return (
    <>
      <Portada migas={rutaMigas} titulo="Cotiza tus gafetes y credenciales">
        <p>
          Escribe cuántas piezas necesitas y ve el precio al momento. Después te confirmamos el
          envío a tu código postal. Entrega en {entregaTexto}.
        </p>
      </Portada>

      <Seccion>
        <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr]">
          <Calculadora />
          <div>
            <h2 className="text-2xl font-extrabold">Precio por pieza</h2>
            <p className="mt-2 mb-4 text-gris">Pesos mexicanos, {notaIva}.</p>
            <TablaPrecios />
          </div>
        </div>
      </Seccion>

      <JsonLd data={migas(rutaMigas)} />
    </>
  );
}
