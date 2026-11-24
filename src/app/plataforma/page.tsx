import Link from "next/link";
import { Faq } from "@/components/Faq";
import { GruposFunciones, MuyPronto, Palomita, SinCostoExtra } from "@/components/Funciones";
import { JsonLd } from "@/components/JsonLd";
import { CelularPortal, VentanaPlataforma } from "@/components/Muestras";
import { Boton, Contenedor, CTA_TEXTO, Portada, Seccion } from "@/components/ui";
import { funcionesEvento } from "@/lib/eventos-publico";
import { type Faq as FaqItem, faqsGenerales } from "@/lib/faqs";
import { formasDeCargar, funcionesPlataforma, portalEmpleados, verificaciones } from "@/lib/plataforma";
import { migas, paginaFaq, plataforma } from "@/lib/schema";
import { metadatos } from "@/lib/seo";
import { site } from "@/lib/site";

const ruta = "/plataforma";
const rutaMigas = [{ nombre: "Plataforma", ruta }];

export const metadata = metadatos({
  titulo: "Plataforma para administrar gafetes y credenciales de empleados, sin costo extra",
  descripcion: `La plataforma de ${site.nombre} viene incluida con tu cuenta: altas y bajas, carga con Excel o por liga, portal de empleados «Mi gafete», editor de diseño, código QR de verificación, paquetes prepagados, envíos con rastreo y facturas. Sin mensualidad ni costo por usuario.`,
  ruta,
});

const preguntas = [
  "¿Hay que pagar una suscripción o mensualidad?",
  "¿Cómo mando los datos de mis empleados?",
  "¿Qué es «Mi gafete», el portal para empleados?",
  "¿Un empleado puede cambiar la foto de su gafete?",
  "¿Me avisan cuando alguien de mi equipo pide algo?",
  "¿Puedo darle acceso a otras personas de mi empresa?",
  `¿Qué verifican en ${site.nombre}?`,
  "¿Cómo protegen mi cuenta y la de mi equipo?",
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

const hayPronto = funcionesPlataforma.some((g) => g.funciones.some((f) => f.pronto));

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
          empresa.{" "}
          {hayPronto ? (
            <>
              Lo marcado como <MuyPronto /> ya está en camino.
            </>
          ) : (
            "Todo ya está disponible."
          )}
        </p>
        <GruposFunciones />
      </Seccion>

      <section id="mi-gafete" className="scroll-mt-28 border-b border-linea">
        <Contenedor className="grid items-center gap-10 py-14 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <h2 className="text-3xl font-extrabold">«Mi gafete»: el portal para tu equipo</h2>
            <p className="mt-3 max-w-2xl text-lg text-gris">
              Deja de juntar fotos por chat y de pasar correcciones a mano. Cada persona de tu equipo
              entra a su portal desde el celular y te pide lo que necesita. Tú lo apruebas en una
              sola bandeja y te avisamos por correo como prefieras: al momento o en un resumen
              semanal.
            </p>
            <ol className="mt-8 grid gap-4 sm:grid-cols-2">
              {portalEmpleados.map((p, i) => (
                <li key={p.titulo} className="rounded-tarjeta border border-linea p-5">
                  <span aria-hidden className="font-mano text-3xl text-rojo">
                    {i + 1}
                  </span>
                  <h3 className="mt-1 font-bold">{p.titulo}</h3>
                  <p className="mt-1 text-sm text-gris">{p.texto}</p>
                </li>
              ))}
            </ol>
          </div>
          <div
            role="img"
            aria-label="El portal «Mi gafete» en un celular: cambiar mi foto, corregir mis datos, reponer mi gafete y el estado de cada solicitud."
            className="flex justify-center"
          >
            <div aria-hidden>
              <CelularPortal className="scale-110" />
            </div>
          </div>
        </Contenedor>
      </section>

      <Seccion id="eventos" titulo="También para tus eventos" fondo>
        <p className="-mt-2 mb-8 max-w-2xl text-lg text-gris">
          Congresos, expos, capacitaciones y graduaciones: cada evento es un proyecto aparte dentro
          de tu organización, con lo mismo que ya usas para tu equipo y esto de más.
        </p>
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {funcionesEvento.map((f) => (
            <li key={f.titulo} className="flex gap-2.5 rounded-tarjeta bg-white p-5">
              <Palomita className="mt-0.5 text-rojo" />
              <div>
                <h3 className="font-bold">{f.titulo}</h3>
                <p className="mt-1 text-sm text-gris">{f.texto}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-6">
          <Link href="/gafetes-para/eventos" className="font-semibold text-rojo underline underline-offset-4">
            Ver gafetes y credenciales para eventos
          </Link>
        </p>
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

      <Seccion id="confianza" titulo="Segura para tu empresa y para tu equipo" fondo>
        <p className="-mt-2 mb-8 max-w-2xl text-lg text-gris">
          Verificamos tu empresa antes de tu primer pedido para que nadie pueda hacer gafetes con
          tu nombre o tu logo, y cada gafete se puede comprobar con su código QR. Esto es todo lo
          que verificamos:
        </p>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {verificaciones.map((c) => (
            <li key={c.titulo} className="flex gap-2.5 rounded-tarjeta bg-white p-5">
              <Palomita className="mt-0.5 text-[#0a7d4f]" />
              <div>
                <h3 className="font-semibold">{c.titulo}</h3>
                <p className="mt-1 text-sm text-gris">{c.texto}</p>
              </div>
            </li>
          ))}
        </ul>
      </Seccion>

      <Seccion titulo="Preguntas sobre la plataforma">
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
