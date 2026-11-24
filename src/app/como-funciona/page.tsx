import Link from "next/link";
import { Etiqueta } from "@/components/Etiqueta";
import { MuyPronto, Palomita } from "@/components/Funciones";
import { JsonLd } from "@/components/JsonLd";
import { Cierre, Portada, Seccion } from "@/components/ui";
import { formasDeEmpezar, pasos } from "@/lib/pasos";
import { accionesPlataforma, ajustesPlataforma, formasDeCargar, verificaciones } from "@/lib/plataforma";
import { comoHacerlo, migas } from "@/lib/schema";
import { metadatos } from "@/lib/seo";
import { entregaTexto, site, verificacion } from "@/lib/site";

const ruta = "/como-funciona";
const rutaMigas = [{ nombre: "Cómo funciona", ruta }];

export const metadata = metadatos({
  titulo: "Cómo pedir gafetes y credenciales para tu equipo, paso a paso",
  descripcion:
    "Así se piden gafetes y credenciales para empleados en LaGafetería: eliges plantilla o subes tu diseño, marcas los campos variables, subes a tu equipo con Excel, uno por uno o con las fotos de todos juntas, revisas cada gafete y pagas con el envío a la vista. Verificamos tu empresa una sola vez y cada gafete se comprueba con su código QR.",
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
          subes a tu equipo, revisas la vista previa de cada uno y pagas. Tus gafetes impresos
          llegan en {entregaTexto}. Solo antes de tu primer pedido verificamos tu empresa, una
          sola vez.
        </p>
      </Portada>

      <Seccion id="verificacion" titulo="Antes de empezar: verifica tu empresa, con RFC o sin RFC" fondo>
        <div className="max-w-3xl space-y-3 text-lg text-gris">
          <p>{verificacion.corto}</p>
          <p>{verificacion.motivo}</p>
          <ul className="list-disc space-y-1 pl-6">
            {Object.values(verificacion.metodos).map((m) => (
              <li key={m.titulo}>
                <strong className="text-tinta">{m.titulo}.</strong> {m.texto}
              </li>
            ))}
          </ul>
          <p>
            En las tres aceptas una carta de responsabilidad y la revisamos a mano, normalmente en
            menos de un día hábil. Se hace una sola vez: al aprobarse, tu plataforma muestra la
            insignia «Empresa verificada» y ya puedes pedir. No hacemos gafetes ni credenciales de
            una empresa distinta a la que hace el pedido.
          </p>
        </div>
      </Seccion>

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

      <Seccion id="verificaciones" titulo="¿Qué verificamos, de principio a fin?" fondo>
        <p className="-mt-2 mb-6 max-w-2xl text-lg text-gris">
          Un gafete abre puertas, así que lo cuidamos de principio a fin: quién lo pide, qué se
          imprime, quién entra a la plataforma y si sigue vigente cuando alguien lo escanea. Todo
          viene incluido, sin costo extra.
        </p>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {verificaciones.map((v) => (
            <li key={v.titulo} className="flex gap-2.5 rounded-tarjeta bg-white p-5">
              <Palomita className="mt-0.5 text-[#0a7d4f]" />
              <div>
                <h3 className="font-semibold">{v.titulo}</h3>
                <p className="mt-1 text-sm text-gris">{v.texto}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-6 max-w-3xl text-gris">
          ¿Cómo se ve la verificación de un gafete? Al escanear su código QR se abre una página con
          un sello grande (vigente, expirado, no válido o aún no activo), los datos que tú decidas
          mostrar y la fecha y hora de la consulta. Funciona igual en el gafete impreso y en el
          digital. Si prefieres, tu código QR puede llevar a una liga tuya o contener solo un dato,
          como el número de empleado.{" "}
          <Link href="/preguntas-frecuentes" className="font-semibold text-rojo underline underline-offset-4">
            Ver más preguntas
          </Link>
        </p>
      </Seccion>

      <Seccion id="cargar" titulo="¿Cómo subo a mi equipo?">
        <p className="-mt-2 mb-6 max-w-2xl text-lg text-gris">
          No todo es Excel. En el paso 3 usas la forma que te acomode, o varias: lo que subes por
          un lado se junta con lo que ya tenías.
        </p>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {formasDeCargar.map((f) => (
            <li key={f.titulo} className="rounded-tarjeta border border-linea p-5">
              <h3 className="text-lg font-bold">{f.titulo}</h3>
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
              los llena con los datos de cada persona.
            </p>
            <dl className="mt-6 divide-y divide-linea rounded-tarjeta border border-linea bg-white">
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

      <Seccion titulo="¿Qué puedo hacer después, en mi cuenta?" fondo>
        <p className="-mt-2 mb-8 max-w-2xl text-lg text-gris">
          Una vez creada tu cuenta tienes acceso a tu plataforma de {site.nombre}. Ahí queda tu
          equipo guardado y administras sus gafetes sin volver a empezar, sin costo extra.{" "}
          <Link href="/plataforma" className="font-semibold text-rojo underline underline-offset-4">
            Ver todo lo que incluye la plataforma
          </Link>
        </p>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accionesPlataforma.map((a) => (
            <div key={a.titulo} className="rounded-tarjeta bg-white p-5">
              <dt className="text-lg font-bold">{a.titulo}</dt>
              <dd className="mt-1 text-sm text-gris">{a.texto}</dd>
            </div>
          ))}
        </dl>
      </Seccion>

      <Seccion titulo="¿Cómo dejo configurados los gafetes de mi empresa?">
        <p className="-mt-2 mb-8 max-w-2xl text-lg text-gris">
          Lo configuras una vez y cada pedido siguiente sale casi solo:
        </p>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ajustesPlataforma.map((a) => (
            <div key={a.titulo} className="rounded-tarjeta border border-linea p-5">
              <dt className="text-lg font-bold">{a.titulo}</dt>
              <dd className="mt-1 text-sm text-gris">{a.texto}</dd>
            </div>
          ))}
        </dl>
      </Seccion>

      <Cierre
        titulo="Empieza con tu lista de personal"
      />

      <JsonLd data={[comoHacerlo(pasos), migas(rutaMigas)]} />
    </>
  );
}
