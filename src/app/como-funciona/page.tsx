import { Etiqueta } from "@/components/Etiqueta";
import { JsonLd } from "@/components/JsonLd";
import { Cierre, Portada, Seccion } from "@/components/ui";
import { formasDeEmpezar, pasos } from "@/lib/pasos";
import { comoHacerlo, migas } from "@/lib/schema";
import { metadatos } from "@/lib/seo";
import { entregaTexto } from "@/lib/site";

const ruta = "/como-funciona";
const rutaMigas = [{ nombre: "Cómo funciona", ruta }];

export const metadata = metadatos({
  titulo: "Cómo pedir gafetes y credenciales con Excel, paso a paso",
  descripcion:
    "Así se piden gafetes y credenciales para empleados en LaGafetería: eliges plantilla o subes tu diseño, marcas los campos variables, cargas tu Excel, revisas cada gafete y pagas con el envío a la vista.",
  ruta,
});

const campos = [
  { nombre: "Nombre", detalle: "De pila o completo, como lo use tu empresa." },
  { nombre: "Puesto", detalle: "O área, sucursal, campaña o grado." },
  { nombre: "Número de empleado", detalle: "También matrícula o folio." },
  { nombre: "Fotografía", detalle: "Una por persona, recortada al mismo tamaño." },
  { nombre: "Código QR", detalle: "Distinto para cada gafete." },
];

export default function ComoFunciona() {
  return (
    <>
      <Portada migas={rutaMigas} titulo="¿Cómo se piden gafetes y credenciales en LaGafetería?">
        <p>
          En cinco pasos y todo en línea: eliges cómo empezar, marcas lo que cambia en cada gafete,
          subes tu Excel, revisas la vista previa de cada uno y pagas. Tu pedido llega en{" "}
          {entregaTexto}.
        </p>
      </Portada>

      <Seccion titulo="Los cinco pasos">
        <ol className="max-w-3xl space-y-6">
          {pasos.map((p, i) => (
            <li key={p.titulo} className="flex gap-5">
              <span
                aria-hidden
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rojo font-mano text-3xl text-white"
              >
                {i + 1}
              </span>
              <div>
                <h3 className="text-xl font-bold">
                  <span className="sr-only">Paso {i + 1}: </span>
                  {p.titulo}
                </h3>
                <p className="mt-1 text-gris">{p.texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </Seccion>

      <Seccion titulo="¿Con qué puedo empezar mi gafete?" fondo>
        <p className="-mt-2 mb-6 max-w-2xl text-lg text-gris">
          Con lo que tengas. Hay tres formas de empezar y las tres terminan igual: un diseño con
          campos que se llenan solos para cada persona.
        </p>
        <ul className="grid gap-5 md:grid-cols-3">
          {formasDeEmpezar.map((f) => (
            <li key={f.titulo} className="rounded-tarjeta bg-white p-6">
              <h3 className="text-xl font-bold">{f.titulo}</h3>
              <p className="mt-2 text-gris">{f.texto}</p>
            </li>
          ))}
        </ul>
      </Seccion>

      <Seccion titulo="¿Qué es un campo variable?">
        <div className="grid items-center gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="max-w-2xl text-lg text-gris">
              Es la parte del gafete que cambia de una persona a otra. El logo y los colores son
              fijos; el nombre, el puesto o la foto son variables. Tú marcas cuáles son y el sistema
              los llena con cada renglón de tu Excel.
            </p>
            <dl className="mt-6 divide-y divide-linea rounded-tarjeta border border-linea">
              {campos.map((c) => (
                <div key={c.nombre} className="grid gap-1 px-5 py-3 sm:grid-cols-[12rem_1fr]">
                  <dt className="font-semibold">{c.nombre}</dt>
                  <dd className="text-gris">{c.detalle}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="flex justify-center py-6">
            <Etiqueta nombre="tu nombre" puesto="Tu puesto" giro={2} />
          </div>
        </div>
      </Seccion>

      <Cierre
        titulo="Empieza con tu lista de Excel"
        texto="Cuéntanos cuántos gafetes necesitas y te decimos el precio con envío."
      />

      <JsonLd data={[comoHacerlo(pasos), migas(rutaMigas)]} />
    </>
  );
}
