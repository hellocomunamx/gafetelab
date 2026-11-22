import { DiagramaGafete } from "@/components/DiagramaGafete";
import { Faq } from "@/components/Faq";
import { JsonLd } from "@/components/JsonLd";
import { MuestraMaterial } from "@/components/MuestraMaterial";
import { Cierre, Portada, Seccion } from "@/components/ui";
import type { Faq as FaqItem } from "@/lib/faqs";
import { grosorTexto, materiales, medidas, zonas } from "@/lib/materiales";
import { notaIva, pesos } from "@/lib/precios";
import { migas, paginaFaq } from "@/lib/schema";
import { metadatos } from "@/lib/seo";

const ruta = "/materiales";
const rutaMigas = [{ nombre: "Materiales y medidas", ruta }];
const disponibles = materiales.filter((m) => m.disponible);
const archivo = zonas[0];

export const metadata = metadatos({
  titulo: "Materiales, grosores y medidas de gafetes y credenciales",
  descripcion: `Compara los materiales para gafetes y credenciales: ${disponibles.map((m) => `${m.nombre} de ${m.grosorMm} mm`).join(", ")}. Medidas del gafete CR80 (${medidas.ancho} × ${medidas.alto} mm), margen de corte y zona segura para tu diseño.`,
  ruta,
});

const faqsMateriales: FaqItem[] = [
  {
    pregunta: "¿Qué material es mejor para gafetes de empleados?",
    respuesta: `Para la mayoría de las empresas, el ${materiales[0].nombre} de ${grosorTexto(materiales[0])}: es rígido, tiene el grosor de una tarjeta bancaria y cabe en cualquier portagafete. Si el gafete va a estar cerca de calor o se dobla mucho, conviene el ${materiales[1].nombre}.`,
  },
  {
    pregunta: "¿Qué significa que una tarjeta sea de 30 mil?",
    respuesta:
      "Es su grosor en milésimas de pulgada. 30 mil equivalen a 0.76 mm, el grosor de una tarjeta bancaria. Una tarjeta de 10 mil mide 0.25 mm y es flexible, como una etiqueta gruesa.",
  },
  {
    pregunta: "¿De qué tamaño debe ser el archivo de mi gafete?",
    respuesta: `De ${archivo.medida} (${archivo.pixeles} a ${medidas.resolucionDpi} dpi). El gafete terminado mide ${medidas.ancho} × ${medidas.alto} mm; los ${medidas.sangrado} mm extra por lado son el margen de corte, que se recorta. Los textos, fotos y logos deben quedar a ${medidas.margenSeguro} mm o más del corte.`,
  },
  {
    pregunta: "¿Qué es el margen de corte y por qué lo necesito?",
    respuesta: `Es la parte del fondo que sobresale del tamaño final; en imprenta se le llama sangrado. Como el corte puede variar unas décimas de milímetro, el fondo se extiende ${medidas.sangrado} mm por lado para que no queden filos blancos en la orilla del gafete.`,
  },
  {
    pregunta: "¿El gafete puede llevar perforación para el broche?",
    respuesta: `Sí. La ranura mide ${medidas.ranura.ancho} × ${medidas.ranura.alto} mm y va centrada en la orilla superior. Si la pides, deja libre esa zona: no pongas ahí el logo ni la foto.`,
  },
  {
    pregunta: "¿Puedo ver mi diseño antes de pedir?",
    respuesta:
      "Sí. En el cotizador puedes cargar tu diseño y verlo sobre el gafete con la línea de corte y la zona segura marcadas. La imagen no se sube ni se guarda: solo se muestra en tu navegador.",
  },
];

export default function Materiales() {
  return (
    <>
      <Portada migas={rutaMigas} titulo="Materiales, grosores y medidas de gafetes y credenciales">
        <p>
          Todos los gafetes y credenciales impresos son tarjetas tamaño CR80 de{" "}
          <strong className="text-tinta">
            {medidas.ancho} × {medidas.alto} mm
          </strong>
          , el tamaño de una tarjeta bancaria. Lo que cambia es el material y el grosor: el más común
          es el {materiales[0].nombre} de {grosorTexto(materiales[0])}.
        </p>
      </Portada>

      <Seccion titulo="¿Qué materiales hay para gafetes y credenciales?">
        <ul className="grid gap-5 md:grid-cols-2">
          {materiales.map((m) => (
            <li key={m.id} className="flex flex-col gap-4 rounded-tarjeta border border-linea p-5 sm:flex-row sm:gap-5">
              <MuestraMaterial material={m} className="w-28 shrink-0 self-start" />
              <div>
                <h3 className="text-xl font-bold">
                  {m.nombre}{" "}
                  {m.disponible ? null : (
                    <span className="ml-1 inline-block rounded-full bg-resaltador px-2 py-0.5 align-middle font-texto text-xs font-semibold">
                      Próximamente
                    </span>
                  )}
                </h3>
                <p className="mt-1 text-sm font-medium">
                  {grosorTexto(m)}
                  {m.disponible ? ` · ${m.extra > 0 ? `+${pesos(m.extra)} por pieza` : "incluido en el precio"}` : ""}
                </p>
                <p className="mt-2 text-gris">{m.detalle}</p>
                <p className="mt-2 text-sm text-gris">
                  <strong className="text-tinta">Ideal para:</strong> {m.ideal}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-gris">Las imágenes son ilustraciones de cada material.</p>
      </Seccion>

      <Seccion titulo="Comparación de materiales y grosores" fondo>
        <div className="overflow-x-auto rounded-tarjeta border border-linea bg-white">
          <table className="w-full min-w-[40rem] text-left">
            <caption className="sr-only">
              Materiales para gafetes y credenciales: grosor, uso recomendado y costo adicional por
              pieza, {notaIva}
            </caption>
            <thead className="bg-papel text-sm">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">Material</th>
                <th scope="col" className="px-5 py-3 font-semibold">Grosor</th>
                <th scope="col" className="px-5 py-3 font-semibold">Para qué sirve</th>
                <th scope="col" className="px-5 py-3 font-semibold">Costo adicional</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linea">
              {materiales.map((m) => (
                <tr key={m.id}>
                  <th scope="row" className="px-5 py-3 font-medium">{m.nombre}</th>
                  <td className="px-5 py-3 whitespace-nowrap">{grosorTexto(m)}</td>
                  <td className="px-5 py-3 text-gris">{m.resumen}</td>
                  <td className="px-5 py-3">
                    {m.disponible ? (m.extra > 0 ? `+${pesos(m.extra)} por pieza` : "Incluido") : "Próximamente"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Seccion>

      <Seccion titulo="¿De qué tamaño debe ser mi diseño?">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <DiagramaGafete modo="guias" ranura className="mx-auto w-full max-w-md" />
          <div className="min-w-0">
            <p className="text-lg text-gris">
              Prepara tu archivo de{" "}
              <strong className="text-tinta">
                {archivo.medida} a {medidas.resolucionDpi} dpi
              </strong>
              . Tiene tres zonas, de afuera hacia adentro:
            </p>
            <div className="mt-5 overflow-x-auto rounded-tarjeta border border-linea">
              <table className="w-full min-w-[26rem] text-left text-sm">
                <caption className="sr-only">Zonas del archivo de diseño de un gafete CR80</caption>
                <thead className="bg-papel">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Zona</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Medida</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Para qué es</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-linea">
                  {zonas.map((z) => (
                    <tr key={z.id}>
                      <th scope="row" className="px-4 py-3 align-top font-medium">{z.nombre}</th>
                      <td className="px-4 py-3 align-top whitespace-nowrap">
                        {z.medida}
                        <span className="block text-xs text-gris">{z.pixeles}</span>
                      </td>
                      <td className="px-4 py-3 align-top text-gris">{z.texto}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-gris">
              La perforación para broche es opcional: mide {medidas.ranura.ancho} ×{" "}
              {medidas.ranura.alto} mm y va centrada arriba.
            </p>
          </div>
        </div>
      </Seccion>

      <Seccion titulo="Preguntas sobre materiales y medidas" fondo>
        <Faq faqs={faqsMateriales} />
      </Seccion>

      <Cierre
        titulo="Mira tu diseño sobre el gafete"
        texto="En el cotizador eliges material, cargas tu diseño y ves el precio con envío."
      />

      <JsonLd data={[paginaFaq(faqsMateriales), migas(rutaMigas)]} />
    </>
  );
}
