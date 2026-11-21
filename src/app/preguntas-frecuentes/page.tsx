import { Faq } from "@/components/Faq";
import { JsonLd } from "@/components/JsonLd";
import { Cierre, Portada, Seccion } from "@/components/ui";
import { faqsGenerales } from "@/lib/faqs";
import { migas, paginaFaq } from "@/lib/schema";
import { metadatos } from "@/lib/seo";
import { site } from "@/lib/site";

const ruta = "/preguntas-frecuentes";
const rutaMigas = [{ nombre: "Preguntas frecuentes", ruta }];

export const metadata = metadatos({
  titulo: "Preguntas frecuentes sobre gafetes y credenciales",
  descripcion:
    "Respuestas claras sobre gafetes y credenciales para empleados: precios, pedido mínimo, tiempos de entrega, envíos a todo México, carga con Excel, materiales, factura y manejo de datos.",
  ruta,
});

const fecha = new Date(`${site.actualizado}T12:00:00`).toLocaleDateString("es-MX", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default function PreguntasFrecuentes() {
  return (
    <>
      <Portada migas={rutaMigas} titulo="Preguntas frecuentes sobre gafetes y credenciales">
        <p>
          Lo que más nos preguntan antes de pedir, con la respuesta corta primero. Si falta la tuya,
          escríbenos a{" "}
          <a href={`mailto:${site.correo}`} className="text-tinta underline">
            {site.correo}
          </a>
          .
        </p>
      </Portada>

      <Seccion>
        <div className="max-w-3xl">
          <Faq faqs={faqsGenerales} abiertas />
          <p className="mt-6 text-sm text-gris">
            Última actualización: <time dateTime={site.actualizado}>{fecha}</time>.
          </p>
        </div>
      </Seccion>

      <Cierre
        titulo="¿Quedó claro? Cotiza tu pedido"
        texto="Dinos cuántos gafetes necesitas y te decimos el precio con envío."
      />

      <JsonLd data={[paginaFaq(faqsGenerales), migas(rutaMigas)]} />
    </>
  );
}
