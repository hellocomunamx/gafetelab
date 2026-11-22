import type { Metadata } from "next";
import Link from "next/link";
import { Bloque } from "@/components/cuenta/Entrada";
import { SubirConstancia } from "@/components/cuenta/SubirConstancia";
import { constanciaDe, fechaLarga, ventanaDeEmision } from "@/lib/cuenta/constancia";
import { requerirEmpresa } from "@/lib/cuenta/sesion";
import { constancia as textos, site } from "@/lib/site";

export const metadata: Metadata = { title: "Constancia de Situación Fiscal" };

const PORTAL_SAT = "https://www.sat.gob.mx/aplicacion/53027/genera-tu-constancia-de-situacion-fiscal";

export default async function PaginaConstancia({ searchParams }: { searchParams: Promise<{ nueva?: string }> }) {
  const { supabase, empresa, administra } = await requerirEmpresa();
  const [actual, { nueva }] = await Promise.all([constanciaDe(supabase, empresa.id), searchParams]);
  const { desde, hasta } = ventanaDeEmision();
  const reciente = Boolean(nueva) && !actual;
  const puedeSubir = administra && actual?.estado !== "aprobada" && actual?.estado !== "pendiente";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        {reciente ? <p className="text-sm font-semibold text-rojo">Tu plataforma ya está creada. Un paso más:</p> : null}
        <h1 className="text-3xl font-extrabold">{textos.nombre}</h1>
        <p className="mt-2 text-gris">
          {textos.corto} {textos.motivo}
        </p>
      </div>

      {actual?.estado === "aprobada" ? (
        <Bloque>
          <p className="font-semibold text-[#0a5c3b]">✓ Tu constancia está aprobada.</p>
          <p className="mt-1 text-sm text-gris">
            Emitida el {fechaLarga(actual.fecha_emision)}. Ya puedes hacer pedidos; no necesitas subirla otra vez.
          </p>
        </Bloque>
      ) : null}

      {actual?.estado === "pendiente" ? (
        <Bloque>
          <p className="font-semibold">Recibimos tu constancia y la estamos revisando.</p>
          <p className="mt-1 text-sm text-gris">
            La subiste el {fechaLarga(actual.creado_en)}, con fecha de emisión del {fechaLarga(actual.fecha_emision)}.
            Normalmente la revisamos en un día hábil. Mientras, puedes seguir armando tu equipo y tus diseños.
          </p>
        </Bloque>
      ) : null}

      {actual?.estado === "rechazada" ? (
        <div role="alert" className="rounded-tarjeta border border-rojo/30 bg-white p-5">
          <p className="font-semibold text-rojo-oscuro">No pudimos aceptar la constancia que subiste.</p>
          <p className="mt-1 text-sm">{actual.motivo || "Revisa que sea legible, reciente y de la empresa de esta cuenta."}</p>
          {administra ? <p className="mt-1 text-sm text-gris">Sube una nueva aquí abajo.</p> : null}
        </div>
      ) : null}

      {puedeSubir ? (
        <Bloque titulo={actual ? "Sube una constancia nueva" : "Sube tu constancia"}>
          <SubirConstancia empresaId={empresa.id} desde={desde} hasta={hasta} meses={site.constanciaMeses} />
          <p className="mt-5 text-sm text-gris">
            ¿No la tienes a la mano? Se descarga gratis en{" "}
            <a href={PORTAL_SAT} target="_blank" rel="noopener" className="underline">
              el portal del SAT
            </a>{" "}
            con el RFC y la contraseña de tu empresa.
          </p>
        </Bloque>
      ) : null}

      {!administra && !actual ? (
        <Bloque>
          <p className="text-sm">
            Solo quien administra la empresa puede subir la constancia. Pídeselo a alguien con rol de dueño o
            administrador en{" "}
            <Link href="/cuenta/usuarios" className="font-semibold underline underline-offset-4">Usuarios</Link>.
          </p>
        </Bloque>
      ) : null}

      <p className="text-sm">
        {reciente ? (
          <Link href="/cuenta" className="font-semibold underline underline-offset-4">
            Lo hago después
          </Link>
        ) : (
          <Link href="/cuenta" className="underline">Volver al resumen</Link>
        )}
        {reciente ? <span className="text-gris"> · La vas a necesitar antes de tu primer pedido.</span> : null}
      </p>
    </div>
  );
}
