import Link from "next/link";
import { Faq } from "@/components/Faq";
import { GruposFunciones, MuyPronto, SinCostoExtra } from "@/components/Funciones";
import { JsonLd } from "@/components/JsonLd";
import { VentanaPlataforma } from "@/components/Muestras";
import { Boton, Contenedor, CTA_TEXTO, Portada, Seccion } from "@/components/ui";
import { type Faq as FaqItem, faqsGenerales } from "@/lib/faqs";
import { formasDeCargar } from "@/lib/plataforma";
import { migas, paginaFaq, plataforma } from "@/lib/schema";
import { metadatos } from "@/lib/seo";
import { site } from "@/lib/site";

const ruta = "/plataforma";
const rutaMigas = [{ nombre: "Plataforma", ruta }];

export const metadata = metadatos({
  titulo: "Plataforma para administrar gafetes y credenciales de empleados, sin costo extra",
  descripcion: `La plataforma de ${site.nombre} viene incluida con tu cuenta: altas y bajas de tu equipo, carga con Excel, editor de diseño, vista previa de cada gafete y datos de envío y facturación guardados. Sin mensualidad ni costo por usuario.`,
  ruta,
});

const preguntas = [
  "¿Hay que pagar una suscripción o mensualidad?",
  "¿Cómo mando los datos de mis empleados?",
  "¿Puedo ver cómo quedan antes de pagar?",
  "¿Puedo usar el diseño que ya tiene mi empresa?",
  "¿Qué pasa con los datos y las fotos de mis empleados?",
];

const faqs: FaqItem[] = [
  {
    pregunta: `¿La plataforma de ${site.nombre} tiene costo?`,
    respuesta:
      "No. La plataforma viene incluida con tu cuenta y no tiene mensualidad, anualidad, costo por usuario ni costo por persona guardada. Solo pagas los gafetes que pides, impresos o digitales.",
  },
  {
    pregunta: "¿Necesito hacer un pedido para usar la plataforma?",
    respuesta:
      "No. Puedes crear tu cuenta, subir a tu equipo, armar tu diseño y revisar la vista previa de cada gafete antes de pedir. Tampoco hay pedido mínimo: puedes pedir desde una pieza.",
  },
  ...preguntas.flatMap((p) => faqsGenerales.filter((f) => f.pregunta === p)),
];

export default function Plataforma() {
  return (
    <>
      <Portada migas={rutaMigas} titulo="Tu plataforma para administrar los gafetes y credenciales de tu equipo">
        <p>
          Es el lugar donde tu empresa guarda a su equipo, su diseño y sus datos de envío y
          facturación, para pedir gafetes sin empezar de cero cada vez. Viene incluida con tu
          cuenta de {site.nombre}: no tiene mensualidad, costo por usuario ni pedido mínimo.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Boton href="/cuenta">Crear mi cuenta gratis</Boton>
          <Boton href="/cotizar" variante="secundario">
            {CTA_TEXTO}
          </Boton>
        </div>
      </Portada>

      <section id="costo" className="scroll-mt-28 bg-tinta text-white">
        <Contenedor className="grid items-center gap-10 py-14 lg:grid-cols-[1fr_1.05fr]">
          <div>
            <h2 className="text-3xl font-extrabold">¿Cuánto cuesta la plataforma?</h2>
            <p className="mt-3 font-titulos text-5xl font-extrabold text-resaltador">Nada.</p>
            <p className="mt-3 max-w-xl text-lg text-white/75">
              Usarla no tiene costo extra. Pagas una sola vez por cada gafete que pides, impreso o
              digital, y todo lo demás viene incluido.
            </p>
            <SinCostoExtra oscuro className="mt-6 max-w-xl" />
            <p className="mt-6">
              <Link href="/precios" className="font-semibold underline underline-offset-4 hover:text-resaltador">
                Ver el precio de los gafetes
              </Link>
            </p>
          </div>
          <div
            role="img"
            aria-label={`La plataforma de ${site.nombre}: la lista del equipo con el estatus de cada persona y la vista previa de su gafete.`}
          >
            <div aria-hidden>
              <VentanaPlataforma />
            </div>
          </div>
        </Contenedor>
      </section>

      <Seccion id="funciones" titulo="¿Qué incluye la plataforma?" fondo>
        <p className="-mt-2 mb-8 max-w-2xl text-lg text-gris">
          Todo lo que tu área de Recursos Humanos necesita para tener al día los gafetes de la
          empresa. Lo marcado como <MuyPronto /> ya está en camino.
        </p>
        <GruposFunciones />
      </Seccion>

      <Seccion id="cargar" titulo="Cuatro formas de subir a tu equipo">
        <p className="-mt-2 mb-8 max-w-2xl text-lg text-gris">
          No todo es Excel. Usa la que te acomode, o varias: lo que subes por un lado se junta con
          lo que ya tenías.
        </p>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {formasDeCargar.map((f, i) => (
            <li key={f.titulo} className="rounded-tarjeta border border-linea p-5">
              <span aria-hidden className="font-mano text-4xl text-rojo">
                {i + 1}
              </span>
              <h3 className="mt-2 text-lg font-bold">{f.titulo}</h3>
              {f.pronto ? (
                <p className="mt-1">
                  <MuyPronto />
                </p>
              ) : null}
              <p className="mt-2 text-sm text-gris">{f.texto}</p>
            </li>
          ))}
        </ul>
      </Seccion>

      <Seccion titulo="Preguntas sobre la plataforma" fondo>
        <Faq faqs={faqs} />
      </Seccion>

      <section className="bg-tinta text-white">
        <Contenedor className="flex flex-col items-start gap-6 py-14 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-extrabold">Crea tu cuenta y sube a tu equipo hoy</h2>
            <p className="mt-2 max-w-xl text-white/75">
              No pagas nada hasta que pidas tus gafetes, y puedes pedir desde una pieza.
            </p>
          </div>
          <Boton href="/cuenta" className="shrink-0">
            Crear mi cuenta gratis
          </Boton>
        </Contenedor>
      </section>

      <JsonLd data={[plataforma(), paginaFaq(faqs), migas(rutaMigas)]} />
    </>
  );
}
