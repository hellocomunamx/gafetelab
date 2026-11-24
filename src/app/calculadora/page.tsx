import Link from "next/link";
import { CalculadoraCasa } from "@/components/CalculadoraCasa";
import { Faq } from "@/components/Faq";
import { JsonLd } from "@/components/JsonLd";
import { Cierre, Portada, Seccion } from "@/components/ui";
import type { Faq as FaqItem } from "@/lib/faqs";
import {
  costoCasaPorPieza,
  costoHoraCasa,
  gafetesParaQueConvenga,
  materialesCasa,
  mermaCasa,
  minutosCasa,
} from "@/lib/hecho-en-casa";
import { pesos } from "@/lib/precios";
import { calculadora, migas, paginaFaq } from "@/lib/schema";
import { metadatos } from "@/lib/seo";
import { site } from "@/lib/site";

const ruta = "/calculadora";
const rutaMigas = [{ nombre: "Calculadora", ruta }];
const titulo = "¿Cuánto te cuesta imprimir tus gafetes tú mismo?";
const descripcion =
  "Calcula cuánto te cuesta hacer los gafetes y credenciales de tu equipo en la oficina (materiales, tiempo y los que se repiten) y compáralo con pedirlos impresos en PVC. Gratis y sin dejar tus datos.";

export const metadata = metadatos({
  titulo: "Calculadora: ¿cuánto cuesta imprimir gafetes tú mismo?",
  descripcion,
  ruta,
});

// Los valores con que abre la calculadora: de ahí salen los ejemplos de esta página.
const inicial = {
  materiales: materialesCasa.omision,
  minutos: minutosCasa.omision,
  costoHora: costoHoraCasa.omision,
  merma: mermaCasa.omision,
};
const porPiezaInicial = Math.round(costoCasaPorPieza(inicial));
const desde = gafetesParaQueConvenga(inicial);

const comoSeCalcula = [
  {
    titulo: "Materiales por gafete",
    texto: `Hoja o cartulina, tinta, mica para enmicar y cordón o clip: entre ${pesos(materialesCasa.min)} y ${pesos(materialesCasa.max)} por gafete. La calculadora abre en ${pesos(materialesCasa.omision)}.`,
  },
  {
    titulo: "Tiempo de tu equipo",
    texto: `Acomodar el diseño, imprimir, recortar, enmicar y perforar toma entre ${minutosCasa.min} y ${minutosCasa.max} minutos por gafete. Ese tiempo se multiplica por lo que cuesta una hora de quien los hace, con prestaciones.`,
  },
  {
    titulo: "Los que se repiten",
    texto: `Una mica con burbuja, un nombre mal escrito o una foto movida obligan a hacer el gafete otra vez: hasta ${mermaCasa.max} % de las piezas, que repiten materiales y tiempo.`,
  },
  {
    titulo: "Contra qué se compara",
    texto: `Contra un pedido al mes de gafetes impresos en PVC a una cara en ${site.nombre}, a los precios vigentes, con el envío ya sumado y antes de IVA.`,
  },
];

const faqsCalculadora: FaqItem[] = [
  {
    pregunta: "¿Cuánto cuesta hacer un gafete de papel enmicado en la oficina?",
    respuesta: `Alrededor de ${pesos(porPiezaInicial)} por gafete con los valores con que abre la calculadora: ${pesos(inicial.materiales)} de materiales, ${inicial.minutos} minutos de trabajo, ${pesos(inicial.costoHora)} por hora de quien lo hace y ${inicial.merma} % de piezas que se repiten. La mayor parte no es el material: es el tiempo.`,
  },
  {
    pregunta: "¿A partir de cuántos gafetes conviene pedirlos impresos?",
    respuesta: desde
      ? `Con esos mismos valores, desde ${desde.toLocaleString("es-MX")} ${desde === 1 ? "gafete" : "gafetes"} al mes pedirlos impresos en PVC cuesta lo mismo o menos que hacerlos en la oficina, con el envío incluido. Si haces menos, un paquete prepagado baja el precio por pieza. Mueve los valores de la calculadora para hacer la cuenta con tus propios costos.`
      : "Depende de tus costos. Mueve los valores de la calculadora para hacer la cuenta con los tuyos; si haces pocos al mes, un paquete prepagado baja el precio por pieza.",
  },
  {
    pregunta: "¿Qué gano además del precio?",
    respuesta:
      "Un gafete de PVC rígido que no se dobla ni se despega, un código QR para verificar que sigue vigente, la vista previa de cada gafete antes de pagar y una plataforma, sin costo extra, que lleva las altas, las bajas y el historial de cada persona.",
  },
  {
    pregunta: "¿Tengo que dejar mis datos para usar la calculadora?",
    respuesta:
      "No. La calculadora es gratis, funciona en esta página y no pide correo ni teléfono. Si después quieres tu precio exacto con envío e IVA, el cotizador en línea te lo da al momento, también sin pedir datos.",
  },
];

export default function Calculadora() {
  return (
    <>
      <Portada migas={rutaMigas} titulo={titulo}>
        <p>
          El gafete de papel enmicado parece gratis, pero alguien de tu equipo lo diseña, lo imprime,
          lo recorta y lo enmica. Pon cuántos haces al mes y compara tu costo real con el nuestro.
        </p>
      </Portada>

      <Seccion>
        <CalculadoraCasa />
      </Seccion>

      <Seccion titulo="¿Cómo se hace la cuenta?" fondo>
        <p className="-mt-2 mb-8 max-w-2xl text-lg text-gris">
          Son estimaciones para un gafete de papel o cartón hecho en la oficina. Mueve cada valor
          para que la cuenta sea la tuya.
        </p>
        <ul className="grid gap-4 sm:grid-cols-2">
          {comoSeCalcula.map((c) => (
            <li key={c.titulo} className="rounded-tarjeta bg-white p-5">
              <h3 className="font-bold">{c.titulo}</h3>
              <p className="mt-1 text-sm text-gris">{c.texto}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6">
          <Link href="/precios" className="font-semibold text-rojo underline underline-offset-4">
            Ver la tabla de precios completa
          </Link>
        </p>
      </Seccion>

      <Seccion titulo="Preguntas sobre hacer los gafetes tú mismo">
        <div className="max-w-3xl">
          <Faq faqs={faqsCalculadora} />
        </div>
      </Seccion>

      <Cierre titulo="¿Ya hiciste la cuenta?" />

      <JsonLd
        data={[
          calculadora({ nombre: `Calculadora de ${site.nombre}: ¿cuánto te cuesta imprimirlo tú mismo?`, descripcion, ruta }),
          paginaFaq(faqsCalculadora),
          migas(rutaMigas),
        ]}
      />
    </>
  );
}
