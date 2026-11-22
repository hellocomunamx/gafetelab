import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Faq } from "@/components/Faq";
import { JsonLd } from "@/components/JsonLd";
import { TablaPrecios } from "@/components/TablaPrecios";
import { Cierre, Portada, Seccion } from "@/components/ui";
import { ciudadPorSlug, ciudades } from "@/lib/ciudades";
import type { Faq as FaqItem } from "@/lib/faqs";
import { giroPorSlug } from "@/lib/giros";
import { pasos } from "@/lib/pasos";
import { envio, notaIva, pesos, precioMaximo, precioMinimo } from "@/lib/precios";
import { migas, paginaFaq, servicio } from "@/lib/schema";
import { metadatos } from "@/lib/seo";
import { entregaTexto, site } from "@/lib/site";

// Solo existen las rutas de la lista; cualquier otra responde 404 real.
export const dynamicParams = false;

export function generateStaticParams() {
  return ciudades.map((c) => ({ ciudad: c.slug }));
}

function descripcionDe(nombre: string) {
  return `Gafetes y credenciales para empleados con envío a ${nombre} en ${entregaTexto}. Desde ${pesos(precioMinimo)} por pieza, sin pedido mínimo y con envío gratis desde ${pesos(envio.gratisDesde)}: sube tu Excel, revisa cada gafete y recibe en tu empresa.`;
}

export async function generateMetadata({
  params,
}: PageProps<"/gafetes-en/[ciudad]">): Promise<Metadata> {
  const ciudad = ciudadPorSlug((await params).ciudad);
  if (!ciudad) return {};
  return metadatos({
    titulo: `Gafetes y credenciales ${ciudad.enTexto}`,
    descripcion: descripcionDe(ciudad.nombre),
    ruta: `/gafetes-en/${ciudad.slug}`,
  });
}

export default async function PaginaCiudad({ params }: PageProps<"/gafetes-en/[ciudad]">) {
  const ciudad = ciudadPorSlug((await params).ciudad);
  if (!ciudad) notFound();

  const ruta = `/gafetes-en/${ciudad.slug}`;
  const titulo = `Gafetes y credenciales ${ciudad.enTexto}`;
  const rutaMigas = [
    { nombre: "Envíos a todo México", ruta: "/gafetes-en" },
    { nombre: ciudad.nombre, ruta },
  ];
  const girosLocales = ciudad.giros.map(giroPorSlug).filter((g) => g !== undefined);
  const otras = ciudades.filter((c) => c.slug !== ciudad.slug);

  const faqs: FaqItem[] = [
    {
      pregunta: `¿Envían gafetes y credenciales a ${ciudad.nombre}?`,
      respuesta: `Sí. Enviamos por paquetería a ${ciudad.nombre}, ${ciudad.estado}, desde ${site.estadoBase}. El envío cuesta ${pesos(envio.tarifa)} y es gratis en pedidos desde ${pesos(envio.gratisDesde)} antes de IVA.`,
    },
    {
      pregunta: `¿Cuánto tardan en llegar los gafetes a ${ciudad.nombre}?`,
      respuesta: `En ${entregaTexto}, contadas desde que confirmas el pago y apruebas la vista previa de tus gafetes. Los gafetes digitales se activan en tu plataforma, sin envío.`,
    },
    {
      pregunta: `¿Cuánto cuestan los gafetes y credenciales ${ciudad.enTexto}?`,
      respuesta: `Lo mismo que en todo México: entre ${pesos(precioMinimo)} y ${pesos(precioMaximo)} pesos por pieza a una cara (${notaIva}), según la cantidad. El envío tiene la misma tarifa a cualquier ciudad.`,
    },
    {
      pregunta: `¿Necesito ir a una sucursal ${ciudad.enTexto}?`,
      respuesta:
        "No. Todo el pedido se hace en línea: diseñas, cargas tu Excel, revisas la vista previa y pagas. Los gafetes llegan a la dirección que indiques.",
    },
  ];

  return (
    <>
      <Portada migas={rutaMigas} titulo={titulo}>
        <p>
          Enviamos gafetes y credenciales para empleados a {ciudad.nombre}, {ciudad.estado}, en{" "}
          {entregaTexto}. Desde {pesos(precioMinimo)} por pieza, sin pedido mínimo y con envío gratis
          desde {pesos(envio.gratisDesde)}.
        </p>
      </Portada>

      <Seccion titulo={`¿Quién pide gafetes y credenciales ${ciudad.enTexto}?`}>
        <p className="max-w-3xl text-lg text-gris">{ciudad.contexto}</p>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {girosLocales.map((g) => (
            <li key={g.slug}>
              <Link
                href={`/gafetes-para/${g.slug}`}
                className="block h-full rounded-tarjeta border border-linea p-5 transition-shadow hover:shadow-md"
              >
                <h3 className="text-lg font-bold">Gafetes para {g.nombre}</h3>
                <p className="mt-1 text-sm text-gris">{g.resumen}</p>
              </Link>
            </li>
          ))}
        </ul>
      </Seccion>

      <Seccion titulo={`¿Cómo pido mis gafetes desde ${ciudad.nombre}?`} fondo>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {pasos.map((p, i) => (
            <li key={p.titulo} className="rounded-tarjeta bg-white p-5">
              <span className="font-mano text-3xl text-rojo">{i + 1}</span>
              <h3 className="mt-1 font-bold">{p.titulo}</h3>
              <p className="mt-1 text-sm text-gris">{p.texto}</p>
            </li>
          ))}
        </ol>
      </Seccion>

      <Seccion titulo={`Precios de gafetes y credenciales ${ciudad.enTexto}`}>
        <p className="-mt-2 mb-6 max-w-2xl text-lg text-gris">
          Precios por pieza en pesos mexicanos, {notaIva}. El envío a {ciudad.nombre} cuesta{" "}
          {pesos(envio.tarifa)} y es gratis en pedidos desde {pesos(envio.gratisDesde)}.
        </p>
        <TablaPrecios />
      </Seccion>

      <Seccion titulo={`Preguntas sobre envíos a ${ciudad.nombre}`} fondo>
        <div className="max-w-3xl">
          <Faq faqs={faqs} />
        </div>
      </Seccion>

      <Seccion titulo="Otras ciudades">
        <ul className="flex flex-wrap gap-2">
          {otras.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/gafetes-en/${c.slug}`}
                className="inline-block rounded-full border border-linea px-4 py-2 hover:border-tinta"
              >
                {c.nombre}
              </Link>
            </li>
          ))}
        </ul>
      </Seccion>

      <Cierre
        titulo={`Gafetes ${ciudad.enTexto}, sin vueltas`}
      />

      <JsonLd
        data={[
          servicio({
            nombre: titulo,
            descripcion: descripcionDe(ciudad.nombre),
            ruta,
            ciudad: { nombre: ciudad.nombre, estado: ciudad.estado },
          }),
          paginaFaq(faqs),
          migas(rutaMigas),
        ]}
      />
    </>
  );
}
