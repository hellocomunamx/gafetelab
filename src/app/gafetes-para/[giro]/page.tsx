import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Etiqueta } from "@/components/Etiqueta";
import { Faq } from "@/components/Faq";
import { Palomita } from "@/components/Funciones";
import { JsonLd } from "@/components/JsonLd";
import { TablaPrecios } from "@/components/TablaPrecios";
import { Cierre, Portada, Seccion } from "@/components/ui";
import { faqsGenerales } from "@/lib/faqs";
import { giroPorSlug, giros } from "@/lib/giros";
import { notaIva } from "@/lib/precios";
import { migas, paginaFaq, servicio } from "@/lib/schema";
import { metadatos } from "@/lib/seo";
import { site } from "@/lib/site";

// Solo existen las rutas de la lista; cualquier otra responde 404 real.
export const dynamicParams = false;

export function generateStaticParams() {
  return giros.map((g) => ({ giro: g.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/gafetes-para/[giro]">): Promise<Metadata> {
  const giro = giroPorSlug((await params).giro);
  if (!giro) return {};
  return metadatos({
    titulo: `Gafetes y credenciales para ${giro.nombre}`,
    descripcion: giro.descripcion,
    ruta: `/gafetes-para/${giro.slug}`,
  });
}

// Preguntas generales que aplican a cualquier giro: mínimo, entrega y portal de empleados.
const faqsBase = faqsGenerales.filter((f) =>
  ["¿Hay pedido mínimo?", "¿Cuánto tarda en llegar mi pedido?", "¿Qué es «Mi gafete», el portal para empleados?"].includes(f.pregunta),
);

export default async function PaginaGiro({ params }: PageProps<"/gafetes-para/[giro]">) {
  const giro = giroPorSlug((await params).giro);
  if (!giro) notFound();

  const ruta = `/gafetes-para/${giro.slug}`;
  const titulo = `Gafetes y credenciales para ${giro.nombre}`;
  const rutaMigas = [
    { nombre: "Por giro", ruta: "/gafetes-para" },
    { nombre: giro.nombre.charAt(0).toUpperCase() + giro.nombre.slice(1), ruta },
  ];
  const faqs = [...giro.faqs, ...faqsBase];
  const otros = giros.filter((g) => g.slug !== giro.slug);

  return (
    <>
      <Portada migas={rutaMigas} titulo={titulo}>
        <p>{giro.respuesta}</p>
      </Portada>

      <Seccion titulo={`¿Qué debe llevar un gafete para ${giro.nombre}?`}>
        <div className="grid items-center gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <ul className="flex flex-wrap gap-2">
              {giro.campos.map((c) => (
                <li key={c} className="rounded-full bg-papel px-4 py-2 font-medium">
                  {c}
                </li>
              ))}
            </ul>
            <p className="mt-6 max-w-2xl rounded-tarjeta border-l-4 border-resaltador bg-papel p-5">
              <strong>Consejo:</strong> {giro.consejo}
            </p>
          </div>
          <div className="flex justify-center py-6">
            <Etiqueta nombre={giro.ejemplo.nombre} puesto={giro.ejemplo.puesto} giro={-2} />
          </div>
        </div>
      </Seccion>

      <Seccion titulo={`Lo que complica los gafetes en ${giro.nombre}`} fondo>
        <ul className="grid gap-4 md:grid-cols-3">
          {giro.retos.map((r) => (
            <li key={r} className="rounded-tarjeta bg-white p-5">
              {r}
            </li>
          ))}
        </ul>
      </Seccion>

      <Seccion titulo={`Lo que te resuelve la plataforma en ${giro.nombre}`}>
        <p className="-mt-2 mb-8 max-w-2xl text-lg text-gris">
          Con tu cuenta de {site.nombre} tienes, sin costo extra, una plataforma para administrar los
          gafetes de tu equipo. Pides desde una pieza y cada ingreso tiene su gafete sin esperar al
          siguiente pedido grande.
        </p>
        <ul className="grid gap-4 md:grid-cols-3">
          {giro.plataforma.map((f) => (
            <li key={f.titulo} className="flex gap-2.5 rounded-tarjeta border border-linea p-5">
              <Palomita className="mt-0.5 text-rojo" />
              <div>
                <h3 className="font-bold">{f.titulo}</h3>
                <p className="mt-1 text-sm text-gris">{f.texto}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-6">
          <Link href="/plataforma" className="font-semibold text-rojo underline underline-offset-4">
            Ver todo lo que incluye la plataforma
          </Link>
        </p>
      </Seccion>

      <Seccion titulo={`¿Cuánto cuestan los gafetes para ${giro.nombre}?`} fondo>
        <p className="-mt-2 mb-6 max-w-2xl text-lg text-gris">
          El precio depende solo de la cantidad de piezas, no del giro. Precios en pesos mexicanos,{" "}
          {notaIva}.
        </p>
        <TablaPrecios />
      </Seccion>

      <Seccion titulo={`Preguntas sobre gafetes para ${giro.nombre}`}>
        <div className="max-w-3xl">
          <Faq faqs={faqs} />
        </div>
      </Seccion>

      <Seccion titulo="Otros giros" fondo>
        <ul className="flex flex-wrap gap-2">
          {otros.map((g) => (
            <li key={g.slug}>
              <Link
                href={`/gafetes-para/${g.slug}`}
                className="inline-block rounded-full border border-linea px-4 py-2 hover:border-tinta"
              >
                Gafetes para {g.nombre}
              </Link>
            </li>
          ))}
        </ul>
      </Seccion>

      <Cierre
        titulo={`Gafetes para ${giro.nombre}, sin vueltas`}
        texto="El precio es el mismo para cualquier giro. Elige cuántos necesitas en el cotizador en línea y ve tu total con envío e IVA al momento, sin esperar un correo."
      />

      <JsonLd
        data={[
          servicio({ nombre: titulo, descripcion: giro.descripcion, ruta, audiencia: giro.nombre }),
          paginaFaq(faqs),
          migas(rutaMigas),
        ]}
      />
    </>
  );
}
