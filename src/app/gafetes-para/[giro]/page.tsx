import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Etiqueta } from "@/components/Etiqueta";
import { Faq } from "@/components/Faq";
import { JsonLd } from "@/components/JsonLd";
import { TablaPrecios } from "@/components/TablaPrecios";
import { Cierre, Portada, Seccion } from "@/components/ui";
import { faqsGenerales } from "@/lib/faqs";
import { giroPorSlug, giros } from "@/lib/giros";
import { notaIva } from "@/lib/precios";
import { migas, paginaFaq, servicio } from "@/lib/schema";
import { metadatos } from "@/lib/seo";

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

// Preguntas generales que aplican a cualquier giro: precio, mínimo y entrega.
const faqsBase = faqsGenerales.filter((f) =>
  ["¿Hay pedido mínimo?", "¿Cuánto tarda en llegar mi pedido?"].includes(f.pregunta),
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
            <p className="mt-6 max-w-2xl rounded-gl border-l-4 border-resaltador bg-papel p-5">
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
            <li key={r} className="rounded-gl bg-white p-5">
              {r}
            </li>
          ))}
        </ul>
        <p className="mt-6 max-w-2xl text-gris">
          En GafeteLab cargas tu lista con Excel, revisas la vista previa de cada gafete y pides
          desde una pieza, así que cada ingreso tiene su gafete sin esperar al siguiente pedido
          grande.{" "}
          <Link href="/como-funciona" className="font-semibold text-rojo underline underline-offset-4">
            Ver cómo funciona
          </Link>
        </p>
      </Seccion>

      <Seccion titulo={`¿Cuánto cuestan los gafetes para ${giro.nombre}?`}>
        <p className="-mt-2 mb-6 max-w-2xl text-lg text-gris">
          El precio depende solo de la cantidad de piezas, no del giro. Precios en pesos mexicanos,{" "}
          {notaIva}.
        </p>
        <TablaPrecios />
      </Seccion>

      <Seccion titulo={`Preguntas sobre gafetes para ${giro.nombre}`} fondo>
        <div className="max-w-3xl">
          <Faq faqs={faqs} />
        </div>
      </Seccion>

      <Seccion titulo="Otros giros">
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
        texto="Dinos cuántos necesitas y te decimos el precio con envío."
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
