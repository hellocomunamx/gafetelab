import Link from "next/link";
import { FormularioContacto } from "@/components/FormularioContacto";
import { JsonLd } from "@/components/JsonLd";
import { Boton, Portada, Seccion } from "@/components/ui";
import { migas, paginaContacto } from "@/lib/schema";
import { metadatos } from "@/lib/seo";
import { site } from "@/lib/site";

const ruta = "/contacto";
const rutaMigas = [{ nombre: "Contacto", ruta }];

export const metadata = metadatos({
  titulo: "Contacto",
  descripcion: `Escríbele a ${site.nombre} desde el formulario de contacto: dudas, pedidos especiales, seguimiento y facturas. Para saber el precio no hace falta escribir: el cotizador en línea te lo da al momento.`,
  ruta,
});

const atajos = [
  {
    titulo: "¿Quieres saber cuánto cuesta?",
    texto: "No hace falta escribirnos. El cotizador en línea te da tu total con envío e IVA al momento.",
    href: "/cotizar",
    accion: "Ir al cotizador en línea",
  },
  {
    titulo: "¿Tienes una duda rápida?",
    texto: "Precios, entrega, envíos, materiales y factura ya están respondidos.",
    href: "/preguntas-frecuentes",
    accion: "Ver preguntas frecuentes",
  },
];

export default function Contacto() {
  return (
    <>
      <Portada migas={rutaMigas} titulo="Escríbenos">
        <p>
          Cuéntanos tu duda, tu pedido especial o lo que necesites, y te respondemos por correo. Si
          lo que buscas es el precio, lo tienes al momento en el{" "}
          <Link href="/cotizar" className="text-tinta underline">
            cotizador en línea
          </Link>
          .
        </p>
      </Portada>

      <Seccion>
        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
          <FormularioContacto correoSitio={site.correo} />

          <aside className="space-y-4">
            {atajos.map((a, i) => (
              <div
                key={a.href}
                className={`rounded-tarjeta p-6 ${i === 0 ? "bg-tinta text-white" : "border border-linea"}`}
              >
                <h2 className="text-xl font-bold">{a.titulo}</h2>
                <p className={`mt-2 ${i === 0 ? "text-white/75" : "text-gris"}`}>{a.texto}</p>
                <Boton
                  href={a.href}
                  variante={i === 0 ? "primario" : "secundario"}
                  className="mt-4 px-5 py-2.5 text-sm"
                >
                  {a.accion}
                </Boton>
              </div>
            ))}
            <p className="px-1 text-sm text-gris">
              ¿Prefieres tu correo de siempre? Escríbenos a{" "}
              <a href={`mailto:${site.correo}`} className="text-tinta underline">
                {site.correo}
              </a>
              .
            </p>
          </aside>
        </div>
      </Seccion>

      <JsonLd data={[paginaContacto(), migas(rutaMigas)]} />
    </>
  );
}
