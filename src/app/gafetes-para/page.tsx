import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { Cierre, Portada, Seccion } from "@/components/ui";
import { giros } from "@/lib/giros";
import { migas } from "@/lib/schema";
import { metadatos } from "@/lib/seo";

const ruta = "/gafetes-para";
const rutaMigas = [{ nombre: "Por giro", ruta }];
const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export const metadata = metadatos({
  titulo: "Gafetes y credenciales por giro de empresa",
  descripcion:
    "Gafetes y credenciales pensados para cada giro: tiendas, restaurantes, seguridad privada, limpieza, call centers, clínicas, escuelas y eventos. Qué datos poner y cómo pedirlos.",
  ruta,
});

export default function PorGiro() {
  return (
    <>
      <Portada migas={rutaMigas} titulo="Gafetes y credenciales para cada giro">
        <p>
          Un mesero, un guardia y una doctora no necesitan el mismo gafete. Elige tu giro y ve qué
          datos conviene poner y cómo pedirlos para todo tu equipo.
        </p>
      </Portada>
      <Seccion>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {giros.map((g) => (
            <li key={g.slug}>
              <Link
                href={`${ruta}/${g.slug}`}
                className="block h-full rounded-tarjeta border border-linea p-6 transition-shadow hover:shadow-md"
              >
                <h2 className="text-xl font-bold">{mayuscula(g.nombre)}</h2>
                <p className="mt-2 text-gris">{g.resumen}</p>
              </Link>
            </li>
          ))}
        </ul>
      </Seccion>
      <Cierre
        titulo="¿Tu giro no está en la lista?"
        texto="También te atendemos. Dinos cuántos gafetes necesitas y te decimos el precio con envío."
      />
      <JsonLd data={migas(rutaMigas)} />
    </>
  );
}
