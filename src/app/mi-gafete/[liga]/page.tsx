import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { type CampoDeLiga, FormularioLiga } from "@/components/FormularioLiga";
import { Contenedor } from "@/components/ui";
import { personaDeLiga } from "@/lib/cuenta/liga-publica";
import { datosPropuestos, valorDe } from "@/lib/cuenta/ligas";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Mi gafete",
  description: "Llena tus datos y sube tu foto para tu gafete.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

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

  const aviso =
    propuesta?.estado === "pendiente"
      ? {
          clase: "border-[#0a7d4f] bg-[#dff3ea]",
          titulo: "Listo, ya lo recibimos.",
          texto: `${empresa.nombre} va a revisar lo que mandaste. Si te equivocaste en algo, corrígelo aquí mismo y vuelve a enviarlo.`,
        }
      : propuesta?.estado === "rechazada"
        ? {
            clase: "border-rojo bg-rojo/10",
            titulo: `${empresa.nombre} te pide una corrección.`,
            texto: propuesta.motivo || "Revisa tus datos y tu foto, y vuelve a enviarlos.",
          }
        : propuesta?.estado === "aprobada"
          ? {
              clase: "border-[#0a7d4f] bg-[#dff3ea]",
              titulo: "Tus datos ya están aprobados.",
              texto: `No tienes que hacer nada más. Si algo cambió, puedes mandarle una corrección a ${empresa.nombre}.`,
            }
          : null;

  return (
    <Contenedor className="py-8 sm:py-12">
      <div className="mx-auto max-w-md">
        <p className="text-sm font-semibold text-gris">{empresa.nombre}</p>
        <h1 className="mt-1 text-3xl font-extrabold">Hola, {primerNombre}</h1>
        <p className="mt-2 text-gris">
          {empresa.nombre} está preparando tu gafete.{" "}
          {nadaQuePedir
            ? "Por ahora no necesita nada de ti."
            : `${lista.length ? "Revisa que tus datos estén bien escritos" : "Sube tu foto"}${lista.length && empresa.liga_foto ? " y sube tu foto" : ""}. Toma un minuto.`}
        </p>

        {aviso ? (
          <div role="status" className={`mt-5 rounded-tarjeta border p-4 ${aviso.clase}`}>
            <p className="font-titulos text-lg font-extrabold">{aviso.titulo}</p>
            <p className="mt-1 text-sm">{aviso.texto}</p>
          </div>
        ) : null}

        {nadaQuePedir ? null : (
          <div className="mt-5 rounded-tarjeta border border-linea bg-white p-5 sm:p-6">
            <FormularioLiga
              liga={liga}
              campos={lista}
              conFoto={empresa.liga_foto}
              fotoActual={fotoActual}
              boton={propuesta ? "Enviar de nuevo" : `Enviar a ${empresa.nombre}`}
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
