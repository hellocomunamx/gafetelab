import Link from "next/link";
import { Etiqueta } from "@/components/Etiqueta";
import { Faq } from "@/components/Faq";
import { JsonLd } from "@/components/JsonLd";
import { TablaPrecios } from "@/components/TablaPrecios";
import { Boton, Cierre, Contenedor, CTA_TEXTO, Seccion } from "@/components/ui";
import { faqsGenerales } from "@/lib/faqs";
import { giros } from "@/lib/giros";
import { formasDeEmpezar, pasos } from "@/lib/pasos";
import { notaIva, pesos, precioMinimo } from "@/lib/precios";
import { paginaFaq, producto } from "@/lib/schema";
import { metadatos } from "@/lib/seo";
import { entregaTexto, site } from "@/lib/site";

export const metadata = metadatos({
  titulo: `${site.titulo} | ${site.nombre}`,
  tituloAbsoluto: true,
  descripcion: site.descripcion,
  ruta: "/",
});

const faqsInicio = faqsGenerales.slice(0, 6);
const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export default function Inicio() {
  return (
    <>
      <section className="overflow-hidden bg-papel">
        <Contenedor className="grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="font-mano text-2xl text-rojo">Hola, soy tu gafete</p>
            <h1 className="mt-2 text-4xl leading-[1.05] font-extrabold sm:text-6xl">
              Gafetes y credenciales para todo tu equipo,{" "}
              <span className="resaltado">sin vueltas</span>.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-gris">
              Sube tu Excel, revisa cada gafete y conoce el precio con envío desde el primer paso.
              Imprimimos en PVC y enviamos a todo México en {entregaTexto}.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Boton href="/cotizar">{CTA_TEXTO}</Boton>
              <Boton href="/como-funciona" variante="secundario">
                Ver cómo funciona
              </Boton>
            </div>
          </div>
          <div className="relative mx-auto flex h-80 w-full max-w-sm items-center justify-center">
            <Etiqueta nombre="Karla" puesto="Cajera" giro={-3} className="relative z-10" />
            <Etiqueta
              nombre="Luis"
              puesto="Mesero"
              giro={3}
              className="absolute top-2 right-0 hidden scale-75 opacity-90 sm:block"
            />
          </div>
        </Contenedor>
      </section>

      <section aria-label="Datos clave" className="border-b border-linea">
        <Contenedor>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-8 py-10 lg:grid-cols-4">
            {[
              { dato: `Desde ${pesos(precioMinimo)}`, detalle: `por pieza, ${notaIva}` },
              { dato: "Desde 1 pieza", detalle: "sin pedido mínimo" },
              { dato: entregaTexto.replace(" días hábiles", " días"), detalle: "hábiles de entrega" },
              { dato: "Todo México", detalle: "envío por paquetería" },
            ].map((d) => (
              <div key={d.detalle}>
                <dt className="font-titulos text-2xl font-extrabold sm:text-3xl">{d.dato}</dt>
                <dd className="mt-1 text-sm text-gris">{d.detalle}</dd>
              </div>
            ))}
          </dl>
        </Contenedor>
      </section>

      <Seccion titulo="¿Cómo se piden los gafetes y credenciales en LaGafetería?">
        <p className="-mt-2 mb-8 max-w-2xl text-lg text-gris">
          En cinco pasos, todos en línea. No mandas archivos por correo ni esperas una cotización
          para saber cuánto vas a pagar.
        </p>
        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {pasos.map((p, i) => (
            <li key={p.titulo} className="rounded-tarjeta border border-linea p-5">
              <span className="font-mano text-4xl text-rojo">{i + 1}</span>
              <h3 className="mt-2 text-lg font-bold">{p.titulo}</h3>
              <p className="mt-2 text-sm text-gris">{p.texto}</p>
            </li>
          ))}
        </ol>
      </Seccion>

      <Seccion titulo="Tres formas de empezar tu gafete" fondo>
        <ul className="grid gap-5 md:grid-cols-3">
          {formasDeEmpezar.map((f) => (
            <li key={f.titulo} className="rounded-tarjeta bg-white p-6">
              <h3 className="text-xl font-bold">{f.titulo}</h3>
              <p className="mt-2 text-gris">{f.texto}</p>
            </li>
          ))}
        </ul>
      </Seccion>

      <Seccion titulo="¿Cuánto cuestan los gafetes y credenciales?">
        <p className="-mt-2 mb-6 max-w-2xl text-lg text-gris">
          El precio depende solo de cuántas piezas pides. El software para diseñar y cargar tus
          datos es gratis. Precios en pesos mexicanos, {notaIva}.
        </p>
        <TablaPrecios />
        <p className="mt-5">
          <Link href="/precios" className="font-semibold text-rojo underline underline-offset-4">
            Ver precios y calcular mi pedido
          </Link>
        </p>
      </Seccion>

      <Seccion titulo="Gafetes y credenciales para tu giro" fondo>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {giros.map((g) => (
            <li key={g.slug}>
              <Link
                href={`/gafetes-para/${g.slug}`}
                className="block h-full rounded-tarjeta bg-white p-5 transition-shadow hover:shadow-md"
              >
                <h3 className="text-lg font-bold">{mayuscula(g.nombre)}</h3>
                <p className="mt-1 text-sm text-gris">{g.resumen}</p>
              </Link>
            </li>
          ))}
        </ul>
      </Seccion>

      <Seccion titulo="Preguntas frecuentes">
        <Faq faqs={faqsInicio} />
        <p className="mt-5">
          <Link
            href="/preguntas-frecuentes"
            className="font-semibold text-rojo underline underline-offset-4"
          >
            Ver todas las preguntas
          </Link>
        </p>
      </Seccion>

      <Cierre
        titulo="¿Listo para decir “Hola, soy”?"
        texto="Dinos cuántos gafetes necesitas y te decimos el precio con envío."
      />

      <JsonLd data={[producto(), paginaFaq(faqsInicio)]} />
    </>
  );
}
