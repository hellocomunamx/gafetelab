import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Contenedor } from "@/components/ui";
import { site } from "@/lib/site";
import { fotoVerificada, verificarGafete } from "@/lib/verificacion";

export const metadata: Metadata = {
  title: "Verificación de gafete",
  description: `Comprueba si un gafete o credencial emitido con ${site.nombre} está vigente.`,
  robots: { index: false, follow: false },
};

// Cada consulta va a la base de datos: el estado puede cambiar en cualquier momento.
export const dynamic = "force-dynamic";

const ZONA = "America/Mexico_City";
const fechaLarga = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

const ESTADOS = {
  vigente: {
    sello: "Vigente",
    clase: "bg-[#0a7d4f] text-white",
    texto: "Este gafete está vigente.",
    trazo: "M5 12.5l4.5 4.5L19 7.5",
  },
  expirado: {
    sello: "Expirado",
    clase: "bg-rojo-oscuro text-white",
    texto: "Este gafete ya venció.",
    trazo: "M6 6l12 12M18 6L6 18",
  },
  baja: {
    sello: "No válido",
    clase: "bg-tinta text-white",
    texto: "Este gafete ya no es válido.",
    trazo: "M6 6l12 12M18 6L6 18",
  },
  pendiente: {
    sello: "Aún no activo",
    clase: "bg-resaltador text-tinta",
    texto: "Este gafete todavía no está activo.",
    trazo: "M12 6v7M12 17.5v.5",
  },
} as const;

export default async function Verificar({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const gafete = await verificarGafete(codigo);
  if (!gafete) notFound();
  const estado = ESTADOS[gafete.estado] ?? ESTADOS.baja;
  const foto = gafete.con_foto ? await fotoVerificada(codigo) : null;
  const ahora = new Date().toLocaleString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: ZONA,
  });
  // `datos` trae los campos que eligió la empresa con su nombre actual; sin él
  // (base de datos aún sin actualizar) se usan los tres de antes.
  const renglones =
    gafete.datos ??
    [
      { clave: "puesto", etiqueta: "Puesto", tipo: "texto", valor: gafete.puesto },
      { clave: "numero_empleado", etiqueta: "Número de empleado", tipo: "texto", valor: gafete.numero_empleado },
      { clave: "departamento", etiqueta: "Departamento", tipo: "texto", valor: gafete.departamento },
    ].filter((r): r is { clave: string; etiqueta: string; tipo: string; valor: string } => Boolean(r.valor));
  const valorDe = (r: { tipo: string; valor: string }) =>
    r.tipo === "fecha" && /^\d{4}-\d{2}-\d{2}$/.test(r.valor) ? fechaLarga(r.valor) : r.valor;

  return (
    <Contenedor className="py-10 sm:py-14">
      <div className="mx-auto max-w-sm">
        <h1 className="sr-only">Verificación de gafete</h1>
        <div className="overflow-hidden rounded-tarjeta border border-linea bg-white shadow-lg">
          <div className={`flex items-center justify-center gap-2 px-5 py-4 ${estado.clase}`}>
            <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
              <path d={estado.trazo} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="font-titulos text-2xl font-extrabold tracking-wide uppercase">{estado.sello}</p>
          </div>

          <div className="px-6 py-7 text-center">
            {foto ? (
              // eslint-disable-next-line @next/next/no-img-element -- liga temporal de almacenamiento privado
              <img
                src={foto}
                alt={gafete.nombre ? `Fotografía de ${gafete.nombre}` : "Fotografía"}
                width={150}
                height={200}
                className="mx-auto mb-5 aspect-[3/4] w-36 rounded-tarjeta-chica object-cover"
              />
            ) : null}
            {gafete.nombre ? <p className="font-titulos text-2xl leading-tight font-extrabold">{gafete.nombre}</p> : null}
            {renglones.length ? (
              <dl className="mx-auto mt-4 max-w-xs space-y-2 text-left">
                {renglones.map((r) => (
                  <div key={r.clave} className="flex items-baseline justify-between gap-4 border-b border-linea pb-2 last:border-0">
                    <dt className="text-sm text-gris">{r.etiqueta}</dt>
                    <dd className="text-right font-semibold break-words">{valorDe(r)}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {gafete.empresa ? (
              <p className={`font-semibold ${gafete.nombre || renglones.length ? "mt-4 border-t border-linea pt-4" : ""}`}>
                {gafete.empresa}
              </p>
            ) : null}
            <p className="mt-4 text-sm text-gris">
              {estado.texto}
              {gafete.vigente_hasta
                ? gafete.estado === "expirado"
                  ? ` Venció el ${fechaLarga(gafete.vigente_hasta)}.`
                  : ` Vence el ${fechaLarga(gafete.vigente_hasta)}.`
                : ""}
            </p>
          </div>

          <p className="border-t border-linea bg-papel px-5 py-3 text-center text-xs text-gris">
            Consultado el {ahora} (hora del centro de México).
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-gris">
          Esta página la genera {site.nombre} con la información que la empresa decidió mostrar.{" "}
          <Link href="/plataforma" className="underline">¿Quieres gafetes y credenciales así para tu equipo?</Link>
        </p>
      </div>
    </Contenedor>
  );
}
