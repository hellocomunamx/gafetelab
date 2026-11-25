import Link from "next/link";
import { DiagramaGafete } from "@/components/DiagramaGafete";
import { Faq } from "@/components/Faq";
import { BarrasGrosor, GafeteConCotas, TamanoAEscala } from "@/components/GuiaMedidas";
import { JsonLd } from "@/components/JsonLd";
import { Cierre, Portada, Seccion } from "@/components/ui";
import {
  cr80,
  datosCuriosos,
  faqsMedidas,
  glosario,
  medidaCorta,
  medidaMm,
  orientaciones,
  rutaGuiaMedidas,
  tamanoTexto,
  tamanos,
} from "@/lib/guia-medidas";
import { medidas, zonas } from "@/lib/materiales";
import { articulo, glosarioSchema, migas, paginaFaq } from "@/lib/schema";
import { metadatos } from "@/lib/seo";
import { site } from "@/lib/site";

const ruta = rutaGuiaMedidas;
const rutaMigas = [{ nombre: "Medidas de gafetes", ruta }];
const titulo = `Medida de un gafete: tamaño estándar CR80 (${medidaCorta})`;
const descripcion = `¿Cuál es la medida de un gafete? El tamaño estándar es CR80: ${medidaCorta} (${medidaMm}), igual que una tarjeta bancaria. Tamaños de gafetes y credenciales, vertical u horizontal, grosores y glosario.`;

export const metadata = metadatos({ titulo, descripcion, ruta });

/** Letras del índice del glosario. */
const letras = [...new Set(glosario.map((t) => t.termino[0].toUpperCase()))];

export default function MedidasDeGafetes() {
  return (
    <>
      <Portada migas={rutaMigas} titulo="¿Cuál es la medida de un gafete?">
        <p>
          El tamaño estándar de los gafetes y credenciales es el{" "}
          <strong className="text-tinta">CR80: {medidaCorta}</strong> ({cr80.anchoMm} × {cr80.altoMm} mm),
          el mismo de tu tarjeta del banco o de tu INE. Su grosor más común es de {cr80.grosorMm} mm. Aquí
          tienes todo lo demás: otros tamaños, vertical u horizontal, grosores y un glosario para
          entenderle a los proveedores.
        </p>
      </Portada>

      <Seccion>
        <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
          <GafeteConCotas className="mx-auto w-full max-w-xl" />
          <div>
            <p className="font-mano text-2xl text-rojo">La respuesta corta</p>
            <dl className="mt-4 divide-y divide-linea rounded-tarjeta border border-linea">
              {[
                ["Medida", `${medidaCorta} (${medidaMm})`],
                ["En pulgadas", `${cr80.anchoPulg} × ${cr80.altoPulg} in`],
                ["Nombre", "CR80 · ISO/IEC 7810 ID-1"],
                ["Grosor", `${cr80.grosorMm} mm (30 mil)`],
                ["Esquinas", `Redondeadas, de ${cr80.radioEsquinaMm} mm`],
                ["A 300 dpi", zonas[1].pixeles],
              ].map(([dato, valor]) => (
                <div key={dato} className="flex flex-wrap justify-between gap-x-4 gap-y-1 px-5 py-3">
                  <dt className="text-gris">{dato}</dt>
                  <dd className="font-semibold">{valor}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Seccion>

      <Seccion titulo="Datos curiosos del gafete estándar" fondo>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {datosCuriosos.map((d) => (
            <li key={d.titulo} className="rounded-tarjeta border border-linea bg-white p-5">
              <p className="font-titulos text-3xl font-extrabold text-rojo">{d.cifra}</p>
              <h3 className="mt-2 text-lg font-bold">{d.titulo}</h3>
              <p className="mt-1 text-gris">{d.texto}</p>
            </li>
          ))}
        </ul>
      </Seccion>

      <Seccion titulo="Tamaños de gafetes y credenciales, comparados a escala" id="tamanos">
        <p className="max-w-3xl text-lg text-gris">
          Todos están dibujados a la misma escala. La línea punteada roja es un gafete CR80, para que
          veas cuánto cambia cada uno.
        </p>
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {tamanos.map((t) => (
            <li
              key={t.id}
              id={t.id}
              className={`scroll-mt-28 rounded-tarjeta border p-4 ${t.nuestro ? "border-rojo bg-rojo/5" : "border-linea"}`}
            >
              <TamanoAEscala tamano={t} />
              <h3 className="mt-3 text-lg font-bold">
                {t.nombre}
                {t.nuestro ? (
                  <span className="ml-2 inline-block rounded-full bg-resaltador px-2 py-0.5 align-middle font-texto text-xs font-semibold">
                    El estándar
                  </span>
                ) : null}
              </h3>
              {t.alias ? <p className="text-sm text-gris">{t.alias}</p> : null}
              <p className="mt-1 text-sm font-medium">{tamanoTexto(t)}</p>
              <p className="mt-2 text-sm text-gris">{t.uso}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-gris">
          En {site.nombre} imprimimos todos los gafetes y credenciales en tamaño CR80, porque es el que
          cabe en cualquier portagafete, cordón o yoyo.
        </p>
      </Seccion>

      <Seccion titulo="¿Gafete vertical u horizontal?" fondo id="orientacion">
        <p className="max-w-3xl text-lg text-gris">
          Es el mismo gafete, solo girado: mide lo mismo y cuesta lo mismo. Lo que cambia es cómo se
          porta y cuánto se luce la foto.
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {orientaciones.map((o) => (
            <article
              key={o.id}
              className={`rounded-tarjeta border bg-white p-6 ${o.favorito ? "border-rojo" : "border-linea"}`}
            >
              <DiagramaGafete
                modo="resultado"
                vertical={o.id === "vertical"}
                ranura
                className={`mx-auto ${o.id === "vertical" ? "h-56" : "h-40"}`}
              />
              <h3 className="mt-4 text-2xl font-extrabold">
                {o.nombre}
                {o.favorito ? (
                  <span className="ml-2 inline-block rounded-full bg-resaltador px-2 py-0.5 align-middle font-texto text-xs font-semibold">
                    Nuestro favorito
                  </span>
                ) : null}
              </h3>
              <p className="mt-1 text-sm font-medium">{o.medida}</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-gris">
                {o.ventajas.map((v) => (
                  <li key={v}>{v}</li>
                ))}
              </ul>
              <p className="mt-3 text-sm">
                <strong>Ideal para:</strong> <span className="text-gris">{o.idealPara}</span>
              </p>
            </article>
          ))}
        </div>
      </Seccion>

      <Seccion titulo="¿Qué grosor tiene un gafete?" id="grosor">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="text-lg text-gris">
            <p>
              El grosor de las tarjetas se mide en <strong className="text-tinta">mil</strong>:
              milésimas de pulgada. El gafete estándar es de{" "}
              <strong className="text-tinta">30 mil, o {cr80.grosorMm} mm</strong>, rígido como una
              tarjeta bancaria.
            </p>
            <p className="mt-4">
              Las barras están a escala entre sí. ¿Quieres ver qué materiales hay en cada grosor?{" "}
              <Link href="/materiales" className="font-semibold text-rojo underline underline-offset-4">
                Mira los materiales
              </Link>
              .
            </p>
          </div>
          <BarrasGrosor />
        </div>
      </Seccion>

      <Seccion titulo="¿De qué tamaño hago mi diseño?" fondo id="diseno">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <DiagramaGafete modo="guias" ranura className="mx-auto w-full max-w-md" />
          <div className="text-lg text-gris">
            <p>
              Para imprimir, el archivo es un poco más grande que el gafete: lleva{" "}
              {medidas.sangrado} mm de margen de corte por lado. Prepáralo de{" "}
              <strong className="text-tinta">
                {zonas[0].medida} ({zonas[0].pixeles}) a {medidas.resolucionDpi} dpi
              </strong>{" "}
              y deja textos, foto y logo a {medidas.margenSeguro} mm o más de la orilla.
            </p>
            <p className="mt-4">
              ¿No tienes diseño? En el cotizador eliges una plantilla y ves cómo queda cada gafete
              antes de pagar.
            </p>
          </div>
        </div>
      </Seccion>

      <Seccion titulo="Glosario de gafetes y credenciales" id="glosario">
        <p className="max-w-3xl text-lg text-gris">
          Las palabras que vas a escuchar cuando pidas gafetes y credenciales, explicadas en palabras sencillas.
        </p>
        <nav aria-label="Letras del glosario" className="mt-6 flex flex-wrap gap-2">
          {letras.map((l) => {
            const primero = glosario.find((t) => t.termino[0].toUpperCase() === l);
            return (
              <a
                key={l}
                href={`#${primero?.id}`}
                className="grid h-9 w-9 place-items-center rounded-full border border-linea font-titulos font-extrabold hover:border-rojo hover:text-rojo"
              >
                {l}
              </a>
            );
          })}
        </nav>
        <dl className="mt-8 grid gap-4 md:grid-cols-2">
          {glosario.map((t) => (
            <div key={t.id} id={t.id} className="scroll-mt-28 rounded-tarjeta border border-linea p-5">
              <dt>
                <dfn className="font-titulos text-xl font-extrabold not-italic">{t.termino}</dfn>
                {t.alias?.length ? (
                  <span className="ml-2 text-sm text-gris">también: {t.alias.join(", ")}</span>
                ) : null}
              </dt>
              <dd className="mt-2 text-gris">{t.definicion}</dd>
            </div>
          ))}
        </dl>
      </Seccion>

      <Seccion titulo="Preguntas sobre el tamaño de los gafetes" fondo>
        <Faq faqs={faqsMedidas} />
      </Seccion>

      <Cierre
        titulo="Ya sabes la medida, ahora el precio"
        texto="En el cotizador en línea eliges cuántos gafetes y credenciales CR80 necesitas y ves tu total con envío e IVA al momento."
      />

      <JsonLd
        data={[
          articulo({ titulo, descripcion, ruta, publicado: "2026-11-25", actualizado: site.actualizado }),
          paginaFaq(faqsMedidas),
          glosarioSchema({ nombre: "Glosario de gafetes y credenciales", ruta, terminos: glosario }),
          migas(rutaMigas),
        ]}
      />
    </>
  );
}
