import Link from "next/link";
import { BotonAgregar } from "@/components/carrito/BotonAgregar";
import { CalculadoraCasa } from "@/components/CalculadoraCasa";
import { Afiliados } from "@/components/Afiliados";
import { Faq } from "@/components/Faq";
import { GruposFunciones, MuyPronto, Palomita, SinCostoExtra } from "@/components/Funciones";
import { HeroAnimado } from "@/components/HeroAnimado";
import { JsonLd } from "@/components/JsonLd";
import { Celular, CelularPortal, GafeteHorizontal, VentanaPlataforma } from "@/components/Muestras";
import { TablaPrecios } from "@/components/TablaPrecios";
import { VideosAlternados } from "@/components/VideosAlternados";
import { Boton, Cierre, Contenedor, CTA_TEXTO, Seccion } from "@/components/ui";
import { faqsGenerales } from "@/lib/faqs";
import { giros } from "@/lib/giros";
import { formasDeEmpezar, pasos } from "@/lib/pasos";
import { funcionesPlataforma, modalidadesDetalle, portalEmpleados, verificaciones } from "@/lib/plataforma";
import { envio, notaIva, paqueteDistinto, paqueteVigenciaMeses, paquetes, pesos, precioMinimo, precioPaquete } from "@/lib/precios";
import { paginaFaq, producto, video, videoEventos, videoPitch } from "@/lib/schema";
import { metadatos } from "@/lib/seo";
import { entregaTexto, site } from "@/lib/site";

export const metadata = metadatos({
  titulo: `${site.titulo} | ${site.nombre}`,
  tituloAbsoluto: true,
  descripcion: site.descripcion,
  ruta: "/",
});

const preguntasInicio = [
  `¿Qué es ${site.nombre}?`,
  "¿Cuánto cuesta un gafete o credencial para empleado?",
  "¿Hay que pagar una suscripción o mensualidad?",
  "¿Qué es «Mi gafete», el portal para empleados?",
  "¿Qué es un gafete digital?",
  "¿Qué pasa cuando alguien escanea el código QR de un gafete?",
  "¿Puedo comprar en línea sin hablar con nadie?",
  "¿Hay pedido mínimo?",
];
const faqsInicio = preguntasInicio.flatMap((p) => faqsGenerales.filter((f) => f.pregunta === p));
const hayPronto = funcionesPlataforma.some((g) => g.funciones.some((f) => f.pronto));
const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export default function Inicio() {
  return (
    <>
      <section className="overflow-hidden bg-papel">
        <Contenedor className="grid items-center gap-6 py-14 sm:py-20 lg:grid-cols-[1.2fr_1fr] lg:gap-12">
          <div>
            <p className="font-mano text-2xl text-rojo">Hola, soy tu gafete</p>
            <h1 className="mt-2 text-[2rem] leading-[1.08] font-extrabold sm:text-5xl">
              Gafetes y credenciales para todo tu equipo o asistentes a eventos.
              <span className="mt-2 block">
                <span className="resaltado">Automático y simplificado</span>.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-gris">
              Diseña tu gafete, sube a tu equipo como te acomode y revisa cada uno antes de pagar.
              Impresos en PVC, digitales o los dos, con envíos a todo México.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Boton href="/cotizar">{CTA_TEXTO}</Boton>
              <Boton href="/plataforma" variante="secundario">
                Conocer la plataforma
              </Boton>
            </div>
            <p className="mt-5 flex max-w-xl items-start gap-2 text-sm font-semibold">
              <Palomita className="text-[#0a7d4f]" />
              <span>
                Incluye tu plataforma para administrar los gafetes de todo tu equipo,{" "}
                <Link href="#plataforma" className="underline underline-offset-4">
                  sin costo extra
                </Link>
                .
              </span>
            </p>
          </div>
          <HeroAnimado />
        </Contenedor>
      </section>

      <section aria-label="Datos clave" className="border-b border-linea">
        <Contenedor>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-8 py-10 lg:grid-cols-4">
            {[
              { dato: `Desde ${pesos(precioMinimo)}`, detalle: `por pieza impresa, ${notaIva}` },
              { dato: "Plataforma incluida", detalle: "sin mensualidad ni costo por usuario" },
              { dato: "Desde 1 pieza", detalle: "sin pedido mínimo" },
              { dato: "Todo México", detalle: `envío gratis desde ${pesos(envio.gratisDesde)}, entrega en ${entregaTexto}` },
            ].map((d) => (
              <div key={d.detalle}>
                <dt className="font-titulos text-2xl font-extrabold sm:text-[26px]">{d.dato}</dt>
                <dd className="mt-1 text-sm text-gris">{d.detalle}</dd>
              </div>
            ))}
          </dl>
        </Contenedor>
      </section>

      <section id="video" className="scroll-mt-28">
        <Contenedor className="py-12 sm:py-16">
          <p className="text-center font-mano text-2xl text-rojo">Te lo contamos rapidito</p>
          <h2 className="mt-1 text-center text-3xl font-extrabold">
            {site.nombre} en menos de un minuto
          </h2>
          <p className="mx-auto mt-3 mb-8 max-w-2xl text-center text-lg text-gris">
            Gafetes y credenciales para tu equipo de trabajo o para tu próximo evento, sin mandar
            archivos por correo.
          </p>
          <VideosAlternados
            videos={[
              { ...videoPitch, etiqueta: "Para tu equipo" },
              { ...videoEventos, etiqueta: "Para tus eventos" },
            ]}
          />
        </Contenedor>
      </section>

      <section id="plataforma" className="scroll-mt-28 bg-tinta text-white">
        <Contenedor className="py-14 sm:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.05fr]">
            <div>
              <p className="font-mano text-2xl text-resaltador">Incluida con tu cuenta</p>
              <h2 className="mt-1 text-3xl leading-tight font-extrabold sm:text-4xl">
                Tu plataforma para administrar los gafetes de todo tu equipo,{" "}
                <span className="text-resaltador">sin costo extra</span>.
              </h2>
              <p className="mt-4 max-w-xl text-lg text-white/75">
                {site.nombre} no es solo una tienda. Al crear tu cuenta, tu empresa tiene su propia
                plataforma: ahí viven tu equipo, tu diseño y tus datos de envío y facturación. Das
                de alta a quien entra, de baja a quien se va y pides solo lo que hace falta. Y tu
                equipo pide sus cambios desde su propio portal, para que tú solo apruebes.
              </p>
              <SinCostoExtra oscuro className="mt-6 max-w-xl" />
              <div className="mt-8 flex flex-wrap gap-3">
                <Boton href="/cuenta">Crear mi cuenta gratis</Boton>
                <Boton href="/plataforma" variante="claro">
                  Ver todo lo que incluye
                </Boton>
              </div>
            </div>
            <div
              role="img"
              aria-label={`La plataforma de ${site.nombre}: la lista del equipo con el estatus de cada persona y la vista previa de su gafete.`}
            >
              <div aria-hidden>
                <VentanaPlataforma />
              </div>
            </div>
          </div>
          <p className="mt-14 mb-5 max-w-2xl text-white/75">
            Esto es todo lo que ya incluye, desde el primer gafete.
            {hayPronto ? (
              <>
                {" "}Lo marcado como <MuyPronto oscuro /> ya está en camino.
              </>
            ) : null}
          </p>
          <div>
            <GruposFunciones oscuro />
          </div>
        </Contenedor>
      </section>

      <section id="mi-gafete" className="scroll-mt-28 border-b border-linea">
        <Contenedor className="grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <p className="font-mano text-2xl text-rojo">Nuevo: «Mi gafete»</p>
            <h2 className="mt-1 text-3xl leading-tight font-extrabold sm:text-4xl">
              Tu equipo pide, tú solo apruebas.
            </h2>
            <p className="mt-4 max-w-xl text-lg text-gris">
              Cada empresa tiene su propio portal para empleados. Ahí cada persona pide cambiar su
              foto, corregir sus datos o reponer su gafete desde el celular, sin crear cuenta y sin
              que tengas que perseguir a nadie por chat.
            </p>
            <ol className="mt-8 grid gap-4 sm:grid-cols-2">
              {portalEmpleados.map((p, i) => (
                <li key={p.titulo} className="rounded-tarjeta border border-linea p-5">
                  <span aria-hidden className="font-mano text-3xl text-rojo">
                    {i + 1}
                  </span>
                  <h3 className="mt-1 font-bold">{p.titulo}</h3>
                  <p className="mt-1 text-sm text-gris">{p.texto}</p>
                </li>
              ))}
            </ol>
            <p className="mt-6">
              <Link href="/plataforma#mi-gafete" className="font-semibold text-rojo underline underline-offset-4">
                Conocer «Mi gafete»
              </Link>
            </p>
          </div>
          <div
            role="img"
            aria-label="El portal «Mi gafete» en un celular: cambiar mi foto, corregir mis datos, reponer mi gafete y el estado de cada solicitud."
            className="flex justify-center"
          >
            <div aria-hidden className="flex items-end gap-4">
              <CelularPortal className="scale-110" />
              <Celular className="hidden -rotate-3 sm:block" />
            </div>
          </div>
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
        <h3 className="mt-12 text-2xl font-extrabold">Verificado de principio a fin</h3>
        <p className="mt-2 max-w-2xl text-gris">
          Un gafete abre puertas. Por eso, antes de tu primer pedido verificamos que los gafetes
          sean de tu propia empresa, y cualquiera puede comprobar con el código QR si uno sigue
          vigente.{" "}
          <Link href="/como-funciona#verificacion" className="underline underline-offset-4">
            Cómo verificar tu empresa
          </Link>
        </p>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {verificaciones.map((c) => (
            <li key={c.titulo} className="flex gap-2.5 rounded-tarjeta bg-papel p-5">
              <Palomita className="mt-0.5 text-[#0a7d4f]" />
              <div>
                <p className="font-semibold">{c.titulo}</p>
                <p className="mt-1 text-sm text-gris">{c.texto}</p>
              </div>
            </li>
          ))}
        </ul>
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

      <Seccion titulo="Impreso, digital o los dos">
        <ul className="grid gap-5 md:grid-cols-3">
          {modalidadesDetalle.map((m, i) => (
            <li key={m.titulo} className="rounded-tarjeta border border-linea p-6">
              <div aria-hidden className="mb-5 flex h-44 items-center justify-center overflow-hidden rounded-tarjeta-chica bg-papel">
                {i !== 1 ? <GafeteHorizontal className={`shrink-0 -rotate-3 ${i ? "-mr-24 scale-[0.55]" : "scale-[0.62]"}`} /> : null}
                {i !== 0 ? <Celular className={`shrink-0 scale-[0.46] ${i === 2 ? "-ml-20" : ""}`} /> : null}
              </div>
              <h3 className="text-xl font-bold">{m.titulo}</h3>
              <p className="mt-2 text-gris">{m.texto}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6 max-w-2xl text-gris">
          Tú decides qué información lleva cada gafete: nombre, puesto, fotografía, número de
          empleado, área, vigencia o código QR. Se paga una sola vez por gafete, sin suscripción.{" "}
          <Link href="/materiales" className="font-semibold text-rojo underline underline-offset-4">
            Ver materiales y medidas
          </Link>
        </p>
      </Seccion>

      <Seccion titulo="¿Cuánto cuestan los gafetes y credenciales?" fondo>
        <p className="-mt-2 mb-6 max-w-2xl text-lg text-gris">
          El precio depende de la modalidad y de cuántas piezas pides. Precios en pesos mexicanos,{" "}
          {notaIva}. El envío cuesta {pesos(envio.tarifa)} a todo México y es gratis desde{" "}
          {pesos(envio.gratisDesde)}.
        </p>
        <TablaPrecios />
        <p className="mt-5">
          <Link href="/cotizar" className="font-semibold text-rojo underline underline-offset-4">
            Cotizar en línea, con envío e IVA al momento
          </Link>
        </p>

        <h3 className="mt-12 text-2xl font-extrabold">¿Pides de a poquitos? Paquetes prepagados</h3>
        <p className="mt-2 mb-5 max-w-2xl text-gris">
          Deja pagados tus gafetes y pídelos conforme los necesites: uno hoy, tres el mes que entra.
          Cada paquete incluye varios envíos y dura {paqueteVigenciaMeses} meses. Son gafetes de PVC
          estándar impresos a una cara, sin gafete digital.
        </p>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {paquetes.map((p) => (
            <li key={p.piezas} className="rounded-tarjeta border border-linea bg-white p-5">
              <p className="font-titulos text-2xl font-extrabold">{p.piezas} gafetes</p>
              <p className="mt-1 text-gris">{pesos(p.porPieza)} por pieza</p>
              <p className="text-gris">{p.envios} envíos incluidos</p>
              <p className="mt-2 text-sm text-gris">PVC estándar · una cara</p>
              <p className="mt-3 font-titulos text-xl font-extrabold">{pesos(precioPaquete(p))}</p>
              <BotonAgregar articulo={{ tipo: "paquete", piezas: p.piezas }} texto="Lo quiero" irAlCarrito className="mt-4" />
            </li>
          ))}
        </ul>
        <p className="mt-4 max-w-3xl text-sm text-gris">
          {paqueteDistinto}{" "}
          <Link href="/precios#paquetes" className="font-semibold text-rojo underline underline-offset-4">
            Ver qué incluye cada paquete
          </Link>
        </p>
        <p className="mt-5">
          <Link href="/precios#paquete-a-la-medida" className="font-semibold text-rojo underline underline-offset-4">
            Arma tu paquete a la medida
          </Link>
          <span className="text-gris">: combina cantidades, una cara o frente y vuelta, y materiales.</span>
        </p>
      </Seccion>

      <Seccion id="cuanto-te-cuesta" titulo="¿Cuánto te cuesta imprimirlo tú mismo?">
        <p className="-mt-2 mb-6 max-w-2xl text-lg text-gris">
          El gafete de papel enmicado parece gratis, pero alguien de tu equipo lo diseña, lo imprime,
          lo recorta y lo enmica. Pon cuántos haces al mes y compara tu costo real con el nuestro.
        </p>
        <CalculadoraCasa />
      </Seccion>

      <Seccion titulo="Gafetes y credenciales para tu giro">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {giros.map((g) => (
            <li key={g.slug}>
              <Link
                href={`/gafetes-para/${g.slug}`}
                className="block h-full rounded-tarjeta border border-linea p-5 transition-shadow hover:shadow-md"
              >
                <h3 className="text-lg font-bold">{mayuscula(g.nombre)}</h3>
                <p className="mt-1 text-sm text-gris">{g.resumen}</p>
              </Link>
            </li>
          ))}
        </ul>
      </Seccion>

      <Seccion titulo="Preguntas frecuentes" fondo>
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

      <Afiliados />

      <Cierre
        titulo="¿Listo para decir “Hola, soy”?"
      />

      <JsonLd data={[producto(), paginaFaq(faqsInicio), video(), video(videoEventos)]} />
    </>
  );
}
