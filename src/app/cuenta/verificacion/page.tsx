import type { Metadata } from "next";
import Link from "next/link";
import { Bloque } from "@/components/cuenta/Entrada";
import { PorQueConstancia } from "@/components/cuenta/PorQueConstancia";
import { ElegirVerificacion } from "@/components/cuenta/ElegirVerificacion";
import { SubirConstancia } from "@/components/cuenta/SubirConstancia";
import { SubirIne } from "@/components/cuenta/SubirIne";
import { VerificarCorreo } from "@/components/cuenta/VerificarCorreo";
import { constanciaDe, esCorreoGratuito, fechaLarga, nombreMetodo, ventanaDeEmision } from "@/lib/cuenta/constancia";
import { requerirEmpresa } from "@/lib/cuenta/sesion";
import { correoActivo } from "@/lib/correo";
import { site, verificacion as textos } from "@/lib/site";

export const metadata: Metadata = { title: "Verificación de tu empresa" };

const PORTAL_SAT = "https://www.sat.gob.mx/aplicacion/53027/genera-tu-constancia-de-situacion-fiscal";

export default async function PaginaConstancia({ searchParams }: { searchParams: Promise<{ nueva?: string }> }) {
  const { supabase, empresa, empresas, usuario, administra } = await requerirEmpresa();
  const [actual, { nueva }] = await Promise.all([constanciaDe(supabase, empresa.id), searchParams]);
  // Un evento usa la verificación de su organización: se hace desde ella.
  if (empresa.tipo === "evento" && actual?.estado !== "aprobada") {
    const organizacion = empresas.find((e) => e.id === empresa.padre_id);
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <h1 className="text-3xl font-extrabold">{textos.nombre}</h1>
        <Bloque>
          <p>
            Tu evento usa la verificación de {organizacion ? <strong>{organizacion.nombre}</strong> : "tu organización"}. Elige tu empresa en
            el selector de arriba y verifícala desde ahí; en cuanto quede, también puedes pedir para este evento.
          </p>
        </Bloque>
      </div>
    );
  }
  const { desde, hasta } = ventanaDeEmision();
  const reciente = Boolean(nueva) && !actual;
  const puedeSubir = administra && actual?.estado !== "aprobada" && actual?.estado !== "pendiente";
  const miCorreo = usuario.email?.toLowerCase() ?? "";
  // El correo se confirma con un código: hace falta el envío de correos y la llave del servidor.
  const conCorreo = correoActivo() && Boolean(process.env.SUPABASE_SECRET_KEY);
  const metodo = actual ? nombreMetodo(actual.metodo).toLowerCase() : "";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        {reciente ? <p className="text-sm font-semibold text-rojo">Tu plataforma ya está creada. Un paso más:</p> : null}
        <h1 className="text-3xl font-extrabold">{textos.nombre}</h1>
        <p className="mt-2 text-gris">
          {textos.corto} {textos.motivo}
        </p>
        <PorQueConstancia className="mt-3" />
      </div>

      {actual?.estado === "aprobada" ? (
        <Bloque>
          <p className="font-semibold text-[#0a5c3b]">✓ Tu empresa está verificada.</p>
          <p className="mt-1 text-sm text-gris">
            Con {metodo}
            {actual.fecha_emision ? `, emitida el ${fechaLarga(actual.fecha_emision)}` : ""}. Ya puedes hacer pedidos; no
            necesitas verificarla otra vez.
          </p>
        </Bloque>
      ) : null}

      {actual?.estado === "pendiente" ? (
        <Bloque>
          <p className="font-semibold">Recibimos tu verificación y la estamos revisando.</p>
          <p className="mt-1 text-sm text-gris">
            La mandaste el {fechaLarga(actual.creado_en)}, con {metodo}. Normalmente la revisamos en un día hábil.
            Mientras, puedes seguir armando tu equipo y tus diseños.
          </p>
        </Bloque>
      ) : null}

      {actual?.estado === "retirada" ? (
        <div role="alert" className="rounded-tarjeta border border-rojo/30 bg-white p-5">
          <p className="font-semibold text-rojo-oscuro">Quitamos la verificación de tu empresa.</p>
          <p className="mt-1 text-sm">Motivo: {actual.motivo}</p>
          <p className="mt-1 text-sm text-gris">
            Mientras no la verifiques de nuevo no puedes hacer pedidos nuevos. Tu equipo, tus diseños y tus datos siguen
            aquí. Si ya tenías un pedido pagado, lo revisamos y te escribimos. Si crees que es un error, escríbenos a{" "}
            <a href={`mailto:${site.correo}`} className="underline">{site.correo}</a>.
          </p>
          {administra ? <p className="mt-1 text-sm text-gris">Para verificarla otra vez, elige una opción aquí abajo.</p> : null}
        </div>
      ) : null}

      {actual?.estado === "rechazada" ? (
        <div role="alert" className="rounded-tarjeta border border-rojo/30 bg-white p-5">
          <p className="font-semibold text-rojo-oscuro">No pudimos aceptar tu verificación.</p>
          <p className="mt-1 text-sm">{actual.motivo || "Revisa que sea legible y de la empresa de esta cuenta."}</p>
          {administra ? <p className="mt-1 text-sm text-gris">Inténtalo de nuevo aquí abajo, con la misma opción u otra.</p> : null}
        </div>
      ) : null}

      {puedeSubir ? (
        <ElegirVerificacion
          formas={{
            constancia: (
              <>
                <SubirConstancia empresaId={empresa.id} desde={desde} hasta={hasta} meses={site.constanciaMeses} />
                <p className="mt-5 text-sm text-gris">
                  ¿No la tienes a la mano? Se descarga gratis en{" "}
                  <a href={PORTAL_SAT} target="_blank" rel="noopener" className="underline">
                    el portal del SAT
                  </a>{" "}
                  con tu RFC y tu contraseña.
                </p>
              </>
            ),
            ine: <SubirIne empresaId={empresa.id} nombreEmpresa={empresa.nombre} />,
            correo: conCorreo ? (
              <VerificarCorreo nombreEmpresa={empresa.nombre} correoSugerido={miCorreo && !esCorreoGratuito(miCorreo) ? miCorreo : ""} />
            ) : null,
          }}
        />
      ) : null}

      {!administra && !actual ? (
        <Bloque>
          <p className="text-sm">
            Solo quien administra la empresa puede verificarla. Pídeselo a alguien con rol de dueño o
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
        {reciente ? <span className="text-gris"> · La necesitas antes de tu primer pedido.</span> : null}
      </p>
    </div>
  );
}
