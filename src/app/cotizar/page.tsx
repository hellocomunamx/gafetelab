import { Cotizador } from "@/components/Cotizador";
import { JsonLd } from "@/components/JsonLd";
import { TablaPrecios } from "@/components/TablaPrecios";
import { Portada, Seccion } from "@/components/ui";
import { envio, notaIva, pesos } from "@/lib/precios";
import { migas } from "@/lib/schema";
import { metadatos } from "@/lib/seo";
import { entregaTexto } from "@/lib/site";

const ruta = "/cotizar";
const rutaMigas = [{ nombre: "Cotizar", ruta }];

export const metadata = metadatos({
  titulo: "Cotiza gafetes y credenciales con envío incluido",
  descripcion: `Cotizador de gafetes y credenciales para empleados: elige material, mira tu diseño con su zona de impresión y ve precio por pieza, envío, IVA, total y tiempo de entrega al momento, sin dejar tus datos. Descarga tu cotización en PDF o recíbela por correo.`,
  ruta,
});

export default function Cotizar() {
  return (
    <>
      <Portada migas={rutaMigas} titulo="Cotiza tus gafetes y credenciales">
        <p>
          Elige la modalidad, la cantidad y el material, y ve al momento el precio por pieza, el
          envío, el IVA y el total. Sin dejar tus datos y sin esperar un correo. Entrega en {entregaTexto} a todo
          México.
        </p>
      </Portada>

      <Seccion>
        <Cotizador />
      </Seccion>

      <Seccion titulo="Precio por pieza según la cantidad" fondo>
        <p className="-mt-2 mb-6 max-w-2xl text-gris">
          Pesos mexicanos, {notaIva}. Envío de {pesos(envio.tarifa)} a todo México, gratis desde{" "}
          {pesos(envio.gratisDesde)}.
        </p>
        <TablaPrecios />
      </Seccion>

      <JsonLd data={migas(rutaMigas)} />
    </>
  );
}
