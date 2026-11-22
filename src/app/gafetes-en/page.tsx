import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { Cierre, Contenedor, Portada, Seccion } from "@/components/ui";
import { ciudades } from "@/lib/ciudades";
import { migas } from "@/lib/schema";
import { envio, pesos } from "@/lib/precios";
import { metadatos } from "@/lib/seo";
import { entregaTexto, site } from "@/lib/site";

const ruta = "/gafetes-en";
const rutaMigas = [{ nombre: "Envíos a todo México", ruta }];

export const metadata = metadatos({
  titulo: "Gafetes y credenciales con envío a todo México",
  descripcion: `Enviamos gafetes y credenciales para empleados a cualquier ciudad de México en ${entregaTexto}: Ciudad de México, Guadalajara, Monterrey, Puebla, Tijuana, Hermosillo y más.`,
  ruta,
});

const datosEnvio = [
  { dato: "Toda la República", detalle: `por paquetería, desde ${site.estadoBase}` },
  { dato: pesos(envio.tarifa), detalle: "la misma tarifa a cualquier destino" },
  { dato: "Envío gratis", detalle: `en pedidos desde ${pesos(envio.gratisDesde)} antes de IVA` },
  { dato: entregaTexto, detalle: "de entrega" },
];

export default function Cobertura() {
  return (
    <>
      <Portada migas={rutaMigas} titulo="Gafetes y credenciales con envío a todo México">
        <p>
          Sí enviamos a tu ciudad. Mandamos por paquetería a toda la República desde{" "}
          {site.estadoBase}, en {entregaTexto}, con la misma tarifa a cualquier destino.
        </p>
      </Portada>
      <section aria-label="Datos del envío" className="border-b border-linea">
        <Contenedor>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-8 py-10 lg:grid-cols-4">
            {datosEnvio.map((d) => (
              <div key={d.detalle}>
                <dt className="font-titulos text-2xl font-extrabold sm:text-[26px]">{d.dato}</dt>
                <dd className="mt-1 text-sm text-gris">{d.detalle}</dd>
              </div>
            ))}
          </dl>
        </Contenedor>
      </section>
      <Seccion titulo="Ciudades a las que más enviamos">
        <p className="-mt-2 mb-8 max-w-2xl text-lg text-gris">
          Elige la tuya para ver los giros más comunes y las preguntas de envío de tu ciudad. Si
          no aparece, también llegamos: el envío cuesta lo mismo.
        </p>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ciudades.map((c) => (
            <li key={c.slug}>
              <Link
                href={`${ruta}/${c.slug}`}
                className="block h-full rounded-tarjeta border border-linea p-5 transition-shadow hover:shadow-md"
              >
                <h3 className="text-lg font-bold">{c.nombre}</h3>
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
