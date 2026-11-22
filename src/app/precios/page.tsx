import { Faq } from "@/components/Faq";
import { JsonLd } from "@/components/JsonLd";
import { TablaPaquetes } from "@/components/TablaPaquetes";
import { TablaPrecios } from "@/components/TablaPrecios";
import { Boton, Cierre, CTA_TEXTO, Portada, Seccion } from "@/components/ui";
import type { Faq as FaqItem } from "@/lib/faqs";
import { materiales } from "@/lib/materiales";
import { modalidadesDetalle } from "@/lib/plataforma";
import {
  cotizar,
  envio,
  extraDosCarasDetalle,
  extraDosCarasRango,
  notaIva,
  paqueteVigenciaMeses,
  paquetes,
  pesos,
  precioDigital,
  precioMaximo,
  precioPaquete,
  precioMinimo,
  tramos,
} from "@/lib/precios";
import { migas, paginaFaq, producto, productoDigital } from "@/lib/schema";
import { metadatos } from "@/lib/seo";
import { entregaTexto } from "@/lib/site";

const ruta = "/precios";
const rutaMigas = [{ nombre: "Precios", ruta }];

const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export const metadata = metadatos({
  titulo: "Precios de gafetes y credenciales para empleados",
  descripcion: `Gafetes y credenciales impresos en PVC desde ${pesos(precioMinimo)} por pieza y digitales a ${pesos(precioDigital)} (${notaIva}). Sin suscripción ni pedido mínimo. Envío a todo México por ${pesos(envio.tarifa)}, gratis desde ${pesos(envio.gratisDesde)}.`,
  ruta,
});

const ejemplo50 = cotizar(50);
const ejemplo150 = cotizar(150, { dosCaras: true });
const ejemploAmbos = cotizar(50, { modalidad: "ambos" });

const faqsPrecios: FaqItem[] = [
  {
    pregunta: "¿Cuánto cuestan 50 gafetes para empleados?",
    respuesta: `${ejemplo50.piezas} gafetes impresos a una cara cuestan ${pesos(ejemplo50.subtotal)} pesos ${notaIva}: ${pesos(ejemplo50.porPieza)} por pieza. ${ejemplo50.envioGratis ? "Ese pedido ya tiene envío gratis" : `El envío cuesta ${pesos(ejemplo50.envio)}`}, así que el total con IVA es de ${pesos(ejemplo50.total)}.`,
  },
  {
    pregunta: "¿Cuánto cuesta imprimir por frente y vuelta?",
    respuesta: `${mayuscula(extraDosCarasRango)} pesos adicionales por pieza, según la cantidad: ${extraDosCarasDetalle}. Por ejemplo, ${ejemplo150.piezas} gafetes por frente y vuelta cuestan ${pesos(ejemplo150.porPieza)} cada uno, ${pesos(ejemplo150.subtotal)} en total ${notaIva}.`,
  },
  {
    pregunta: "¿Cuánto cuesta el gafete digital?",
    respuesta: `${pesos(precioDigital)} por pieza en cualquier cantidad, lo pidas solo o junto con el gafete impreso. Por ejemplo, ${ejemploAmbos.piezas} gafetes impresos con su versión digital cuestan ${pesos(ejemploAmbos.porPieza)} cada uno.`,
  },
  {
    pregunta: "¿Hay suscripción, mensualidad o costo por usar la plataforma?",
    respuesta:
      "No. Pagas una sola vez por cada gafete. Diseñar, usar plantillas, cargar tu Excel, revisar la vista previa y administrar altas, bajas, reposiciones, desactivaciones y reactivaciones en tu plataforma no tiene costo.",
  },
  {
    pregunta: "¿Cuánto cuesta el envío?",
    respuesta: `${pesos(envio.tarifa)} a cualquier parte de México, ${notaIva}. Es gratis en pedidos desde ${pesos(envio.gratisDesde)} antes de IVA. Los gafetes digitales no llevan envío.`,
  },
  {
    pregunta: "¿Qué son los paquetes prepagados?",
    respuesta: `Son gafetes impresos que compras por adelantado y vas pidiendo conforme los necesitas, sin pagar envío cada vez. Hay paquetes de ${paquetes.map((p) => p.piezas).join(", ")} gafetes; el de ${paquetes[0].piezas} cuesta ${pesos(precioPaquete(paquetes[0]))} e incluye ${paquetes[0].envios} envíos. Los gafetes se pueden usar durante ${paqueteVigenciaMeses} meses.`,
  },
  {
    pregunta: "¿Cuánto cuesta cambiar de material?",
    respuesta: `El PVC estándar está incluido en el precio. ${materiales
      .filter((m) => m.disponible && m.extra > 0)
      .map((m) => `${m.nombre} suma ${pesos(m.extra)} por pieza`)
      .join(" y ")}.`,
  },
  {
    pregunta: "¿Por qué baja el precio con la cantidad?",
    respuesta: `Porque preparar e imprimir un pedido tiene un costo fijo que se reparte entre más piezas. Por eso un gafete impreso suelto cuesta ${pesos(precioMaximo)} y, a partir de ${tramos[tramos.length - 1].desde} piezas, cada uno cuesta ${pesos(precioMinimo)}.`,
  },
  {
    pregunta: "¿Qué incluye el precio por pieza?",
    respuesta: `En el impreso, la tarjeta de PVC tamaño CR80 a color, personalizada con los datos de cada empleado y entregada en ${entregaTexto}. En el digital, el gafete en el celular con su código QR verificable. En ambos casos, el acceso a tu plataforma.`,
  },
];

export default function Precios() {
  return (
    <>
      <Portada migas={rutaMigas} titulo="Precios de gafetes y credenciales para empleados">
        <p>
          Un gafete o credencial impreso en PVC cuesta entre{" "}
          <strong className="text-tinta">
            {pesos(precioMinimo)} y {pesos(precioMaximo)} pesos por pieza
          </strong>{" "}
          a una cara, según la cantidad, y uno digital {pesos(precioDigital)}, {notaIva}. Se paga una sola vez: no hay suscripción ni pedido mínimo.
        </p>
      </Portada>

      <Seccion titulo="Tabla de precios por cantidad">
        <TablaPrecios />
        <ul className="mt-5 list-disc space-y-1 pl-5 text-gris">
          <li>Precios en pesos mexicanos, {notaIva}.</li>
          <li>Frente y vuelta: {extraDosCarasRango} más por pieza, según la cantidad ({extraDosCarasDetalle}).</li>
          <li>
            Envío a todo México: {pesos(envio.tarifa)}; gratis en pedidos desde{" "}
            {pesos(envio.gratisDesde)} antes de IVA.
          </li>
          <li>Entrega estándar: {entregaTexto}. Entrega exprés: próximamente.</li>
        </ul>
        <div className="mt-8">
          <Boton href="/cotizar">{CTA_TEXTO}</Boton>
        </div>
      </Seccion>

      <Seccion titulo="¿Y si solo necesito unos cuantos gafetes?" id="paquetes" fondo>
        <p className="-mt-2 mb-6 max-w-2xl text-lg text-gris">
          Compra un paquete prepagado y pide de a poquitos: un gafete hoy, tres el mes que entra.
          Cada paquete incluye varios envíos, así que el envío no te sale más caro que el gafete, y
          lo que no uses queda a tu favor.
        </p>
        <TablaPaquetes />
      </Seccion>

      <Seccion titulo="¿Qué modalidad me conviene?">
        <ul className="grid gap-5 md:grid-cols-3">
          {modalidadesDetalle.map((m) => (
            <li key={m.titulo} className="rounded-tarjeta border border-linea p-6">
              <h3 className="text-xl font-bold">{m.titulo}</h3>
              <p className="mt-2 text-gris">{m.texto}</p>
            </li>
          ))}
        </ul>
      </Seccion>

      <Seccion titulo="Preguntas sobre precios" fondo>
        <Faq faqs={faqsPrecios} />
      </Seccion>

      <Cierre
        titulo="El precio completo, desde el principio"
        texto="El cotizador en línea te da el envío, el IVA, el total y el tiempo de entrega al momento, sin dejar tus datos ni esperar un correo."
      />

      <JsonLd data={[producto(), productoDigital(), paginaFaq(faqsPrecios), migas(rutaMigas)]} />
    </>
  );
}
