import { Calculadora } from "@/components/Calculadora";
import { Faq } from "@/components/Faq";
import { JsonLd } from "@/components/JsonLd";
import { TablaPrecios } from "@/components/TablaPrecios";
import { Cierre, Portada, Seccion } from "@/components/ui";
import type { Faq as FaqItem } from "@/lib/faqs";
import {
  cotizar,
  extraDosCaras,
  notaIva,
  pesos,
  precioMaximo,
  precioMinimo,
  tramos,
} from "@/lib/precios";
import { migas, paginaFaq, producto } from "@/lib/schema";
import { metadatos } from "@/lib/seo";
import { entregaTexto } from "@/lib/site";

const ruta = "/precios";
const ruta_migas = [{ nombre: "Precios", ruta }];

export const metadata = metadatos({
  titulo: "Precios de gafetes y credenciales para empleados",
  descripcion: `Gafetes y credenciales de PVC desde ${pesos(precioMinimo)} por pieza (${notaIva}). Tabla de precios por cantidad, costo de frente y vuelta y calculadora. Sin pedido mínimo y con envío a todo México.`,
  ruta,
});

const ejemplo50 = cotizar(50, false);
const ejemplo150 = cotizar(150, true);

const faqsPrecios: FaqItem[] = [
  {
    pregunta: "¿Cuánto cuestan 50 gafetes para empleados?",
    respuesta: `${ejemplo50.piezas} gafetes a una cara cuestan ${pesos(ejemplo50.subtotal)} pesos ${notaIva}: ${pesos(ejemplo50.porPieza)} por pieza. El envío se cotiza aparte según tu código postal.`,
  },
  {
    pregunta: "¿Cuánto cuesta imprimir por frente y vuelta?",
    respuesta: `${pesos(extraDosCaras)} pesos adicionales por pieza. Por ejemplo, ${ejemplo150.piezas} gafetes por frente y vuelta cuestan ${pesos(ejemplo150.porPieza)} cada uno, ${pesos(ejemplo150.subtotal)} en total ${notaIva}.`,
  },
  {
    pregunta: "¿El diseño o el uso de la plataforma tienen costo?",
    respuesta:
      "No. Diseñar tu gafete, usar plantillas, cargar tu Excel y revisar la vista previa es gratis. Solo pagas las piezas impresas y el envío.",
  },
  {
    pregunta: "¿Por qué baja el precio con la cantidad?",
    respuesta: `Porque preparar e imprimir un pedido tiene un costo fijo que se reparte entre más piezas. Por eso un gafete suelto cuesta ${pesos(precioMaximo)} y, a partir de ${tramos[tramos.length - 1].desde} piezas, cada uno cuesta ${pesos(precioMinimo)}.`,
  },
  {
    pregunta: "¿Qué incluye el precio por pieza?",
    respuesta: `La tarjeta de PVC tamaño CR80 impresa a color y personalizada con los datos de cada empleado. La entrega es de ${entregaTexto}.`,
  },
];

export default function Precios() {
  return (
    <>
      <Portada migas={ruta_migas} titulo="Precios de gafetes y credenciales para empleados">
        <p>
          Un gafete o credencial de PVC cuesta entre{" "}
          <strong className="text-tinta">
            {pesos(precioMinimo)} y {pesos(precioMaximo)} pesos por pieza
          </strong>{" "}
          a una cara, {notaIva}, según la cantidad. No hay pedido mínimo y el software es gratis.
        </p>
      </Portada>

      <Seccion titulo="Tabla de precios por cantidad">
        <TablaPrecios />
        <ul className="mt-5 list-disc space-y-1 pl-5 text-gris">
          <li>Precios en pesos mexicanos, {notaIva}.</li>
          <li>Frente y vuelta: {pesos(extraDosCaras)} más por pieza.</li>
          <li>El envío se calcula según tu código postal y se muestra antes de pagar.</li>
        </ul>
      </Seccion>

      <Seccion titulo="Calcula tu pedido" fondo id="calculadora">
        <div className="max-w-3xl">
          <Calculadora />
        </div>
      </Seccion>

      <Seccion titulo="Preguntas sobre precios">
        <Faq faqs={faqsPrecios} />
      </Seccion>

      <Cierre
        titulo="El precio completo, desde el principio"
        texto="Dinos cuántos gafetes necesitas y a dónde van, y te decimos el total con envío."
      />

      <JsonLd data={[producto(), paginaFaq(faqsPrecios), migas(ruta_migas)]} />
    </>
  );
}
