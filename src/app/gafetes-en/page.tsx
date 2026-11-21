import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { Cierre, Portada, Seccion } from "@/components/ui";
import { ciudades } from "@/lib/ciudades";
import { migas } from "@/lib/schema";
import { metadatos } from "@/lib/seo";
import { entregaTexto, site } from "@/lib/site";

const ruta = "/gafetes-en";
const rutaMigas = [{ nombre: "Por ciudad", ruta }];

export const metadata = metadatos({
  titulo: "Gafetes y credenciales con envío a todo México",
  descripcion: `Enviamos gafetes y credenciales para empleados a cualquier ciudad de México en ${entregaTexto}: Ciudad de México, Guadalajara, Monterrey, Puebla, Tijuana, Hermosillo y más.`,
  ruta,
});

export default function PorCiudad() {
  return (
    <>
      <Portada migas={rutaMigas} titulo="Gafetes y credenciales con envío a todo México">
        <p>
          Sí enviamos a tu ciudad. Mandamos por paquetería a toda la República desde{" "}
          {site.estadoBase}, en {entregaTexto}, con la misma tarifa a cualquier destino. Estas son
          algunas de las ciudades que atendemos.
        </p>
      </Portada>
      <Seccion>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ciudades.map((c) => (
            <li key={c.slug}>
              <Link
                href={`${ruta}/${c.slug}`}
                className="block h-full rounded-tarjeta border border-linea p-5 transition-shadow hover:shadow-md"
              >
                <h2 className="text-lg font-bold">{c.nombre}</h2>
                <p className="text-sm text-gris">{c.estado}</p>
              </Link>
            </li>
          ))}
        </ul>
      </Seccion>
      <Cierre
        titulo="¿Tu ciudad no aparece?"
        texto="También llegamos. El envío cuesta lo mismo a cualquier parte de México."
      />
      <JsonLd data={migas(rutaMigas)} />
    </>
  );
}
