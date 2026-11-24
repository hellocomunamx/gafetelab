import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { type CampoDeLiga, FormularioLiga } from "@/components/FormularioLiga";
import { CambiarFotoDigital } from "@/components/CambiarFotoDigital";
import { GafeteDigitalVista } from "@/components/GafeteDigitalVista";
import { Contenedor } from "@/components/ui";
import { cambioFotoDe } from "@/lib/cuenta/cambio-foto";
import { gafeteDigitalDe } from "@/lib/cuenta/gafete-digital";
import { personaDeLiga } from "@/lib/cuenta/liga-publica";
import { datosPropuestos, FORMATO_LIGA, fraseCorreccion, RUTA_LIGA, valorDe } from "@/lib/cuenta/ligas";
import { site } from "@/lib/site";
import { verificarGafete } from "@/lib/verificacion";

export async function generateMetadata({ params }: { params: Promise<{ liga: string }> }): Promise<Metadata> {
  const { liga } = await params;
  return {
    title: "Mi gafete",
    description: "Tu gafete de la empresa: tus datos, tu foto y tu gafete digital.",
    robots: { index: false, follow: false },
    referrer: "no-referrer",
    // Para guardarlo en la pantalla de inicio del celular y abrirlo como una app.
    ...(FORMATO_LIGA.test(liga)
      ? {
          manifest: `${RUTA_LIGA}/${liga}/manifest.webmanifest`,
          appleWebApp: { capable: true, title: "Mi gafete", statusBarStyle: "default" as const },
        }
      : {}),
  };
}

// Cada visita lee la base de datos: lo que la persona mandó puede cambiar en cualquier momento.
export const dynamic = "force-dynamic";

export default async function MiGafete({ params }: { params: Promise<{ liga: string }> }) {
  const { liga } = await params;
  const encontrada = await personaDeLiga(liga);
  if (!encontrada) notFound();
  const { servicio, persona, empresa, campos, propuesta } = encontrada;

  // Si ya mandó algo que sigue en revisión o le pidieron corregirlo, parte de eso.
  const enCurso = propuesta && propuesta.estado !== "aprobada" ? propuesta : null;
  const propuestos = datosPropuestos(enCurso?.datos);
  const lista: CampoDeLiga[] = campos.map((c) => ({
    clave: c.clave,
    etiqueta: c.etiqueta,
    tipo: c.tipo,
    obligatorio: c.obligatorio || c.clave === "nombre",
    valor: propuestos[c.clave] ?? valorDe(persona, c.clave),
  }));
  const rutaFoto = (propuesta?.estado === "pendiente" ? propuesta.foto_path : null) ?? persona.foto_path;
  const fotoActual =
    empresa.liga_foto && rutaFoto
      ? ((await servicio.storage.from("fotos").createSignedUrl(rutaFoto, 3600)).data?.signedUrl ?? undefined)
      : undefined;
  const primerNombre = persona.nombre.trim().split(/\s+/)[0];
  const nadaQuePedir = !lista.length && !empresa.liga_foto;
  // Si ya tiene su gafete digital activo, la liga lo muestra primero.
  const digital = await gafeteDigitalDe(servicio, persona);
  const verificado = digital?.verificable ? await verificarGafete(persona.codigo) : null;
  // Con gafete digital, la persona puede pedir cambiar su foto (la empresa la aprueba).
  const cambioFoto = digital ? await cambioFotoDe(servicio, persona.id, empresa.id) : null;
  const fotoVigente =
    digital && persona.foto_path
      ? digital.tipo === "diseno" && digital.foto
        ? digital.foto
        : ((await servicio.storage.from("fotos").createSignedUrl(persona.foto_path, 3600)).data?.signedUrl ?? null)
      : null;

  // Ya mandó su información: la liga queda cerrada hasta que la empresa pida una corrección.
  const cerrada = Boolean(propuesta && propuesta.estado !== "rechazada");
  const loEnviado = empresa.liga_foto ? "Tu fotografía ya fue enviada" : "Tu información ya fue enviada";
  const alDepartamento = `solicítalo al departamento correspondiente de ${empresa.nombre}`;
  // Con gafete digital, la foto se cambia en el bloque «Cambiar mi foto»; lo demás, con la empresa.
  const paraCambiar = digital
    ? `Para cambiar tu foto, usa «Cambiar mi foto», arriba.${lista.length ? ` Si necesitas cambiar un dato, ${alDepartamento}.` : ""}`
    : `Si necesitas cambiar${empresa.liga_foto ? "la" : " algo"}, ${alDepartamento}.`;
  const aviso =
    propuesta?.estado === "pendiente"
      ? {
          clase: "border-[#0a7d4f] bg-[#dff3ea]",
          titulo: `Listo. ${loEnviado}.`,
          texto: `${empresa.nombre} la va a revisar. ${paraCambiar}`,
        }
      : propuesta?.estado === "rechazada"
        ? {
            clase: "border-rojo bg-rojo/10",
            titulo: `${empresa.nombre} te pide una corrección.`,
            texto: propuesta.motivo ? fraseCorreccion(empresa.nombre, propuesta.motivo) : "Revisa tus datos y tu foto, y vuelve a enviarlos.",
          }
        : propuesta?.estado === "aprobada"
          ? {
              clase: "border-[#0a7d4f] bg-[#dff3ea]",
              titulo: `${loEnviado} y ya está aprobada.`,
              texto: `No tienes que hacer nada más. ${paraCambiar}`,
            }
          : null;

  return (
    <Contenedor className="py-8 sm:py-12">
      <div className="mx-auto max-w-md">
        <p className="text-sm font-semibold text-gris">{empresa.nombre}</p>
        <h1 className="mt-1 text-3xl font-extrabold">Hola, {primerNombre}</h1>
        {digital ? (
          <>
            <p className="mt-2 text-gris">Este es tu gafete digital. Muéstralo cuando te lo pidan.</p>
            <div className="mt-5">
              <GafeteDigitalVista gafete={digital} estado={verificado?.estado ?? null} />
            </div>
            {cambioFoto ? (
              <div className="mt-5">
                <CambiarFotoDigital liga={liga} empresa={empresa.nombre} fotoActual={fotoVigente} cambio={cambioFoto} />
              </div>
            ) : null}
            <details className="mt-5 rounded-tarjeta border border-linea bg-white p-5 text-sm">
              <summary className="cursor-pointer font-semibold">Guárdalo en tu pantalla de inicio</summary>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-gris">
                <li>
                  <strong className="text-tinta">iPhone (Safari):</strong> toca Compartir y luego «Agregar a inicio».
                </li>
                <li>
                  <strong className="text-tinta">Android (Chrome):</strong> toca el menú ⋮ y luego «Agregar a la pantalla principal».
                </li>
              </ul>
              <p className="mt-3 text-gris">Así lo abres con un toque, como una app. Si cambian tus datos, tu gafete se actualiza solo.</p>
            </details>
          </>
        ) : (
          <p className="mt-2 text-gris">
            {empresa.nombre} está preparando tu gafete.{" "}
            {cerrada
              ? ""
              : nadaQuePedir
              ? "Por ahora no necesita nada de ti."
              : `${lista.length ? "Revisa que tus datos estén bien escritos" : "Sube tu foto"}${lista.length && empresa.liga_foto ? " y sube tu foto" : ""}. Toma un minuto.`}
          </p>
        )}

        {aviso && !(digital && propuesta?.estado === "aprobada") ? (
          <div role="status" className={`mt-5 rounded-tarjeta border p-4 ${aviso.clase}`}>
            <p className="font-titulos text-lg font-extrabold">{aviso.titulo}</p>
            <p className="mt-1 text-sm">{aviso.texto}</p>
          </div>
        ) : null}

        {nadaQuePedir || cerrada ? null : digital ? (
          // Con gafete digital, la foto se cambia arriba («Cambiar mi foto»); aquí solo los datos.
          lista.length ? (
          <details className="mt-5 rounded-tarjeta border border-linea bg-white p-5 sm:p-6" open={propuesta?.estado === "rechazada"}>
            <summary className="cursor-pointer text-sm font-semibold">¿Cambió algún dato? Mándale una corrección a {empresa.nombre}</summary>
            <div className="mt-4">
              <FormularioLiga liga={liga} campos={lista} conFoto={false} fotoActual={fotoActual} boton={`Enviar a ${empresa.nombre}`} />
            </div>
          </details>
          ) : null
        ) : (
          <div className="mt-5 rounded-tarjeta border border-linea bg-white p-5 sm:p-6">
            <FormularioLiga
              liga={liga}
              campos={lista}
              conFoto={empresa.liga_foto}
              fotoActual={fotoActual}
              boton={propuesta ? "Enviar mi corrección" : `Enviar a ${empresa.nombre}`}
            />
          </div>
        )}

        <p className="mt-6 text-center text-xs text-gris">
          Lo que mandes lo recibe {empresa.nombre}, que lo revisa antes de imprimir tu gafete. {site.nombre} lo guarda
          por encargo de {empresa.nombre}. <Link href="/aviso-de-privacidad" className="underline">Aviso de privacidad</Link>.
          Esta liga es personal: no la compartas.
        </p>
      </div>
    </Contenedor>
  );
}
