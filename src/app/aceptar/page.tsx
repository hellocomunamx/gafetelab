import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Formulario } from "@/components/cuenta/Formulario";
import { Contenedor } from "@/components/ui";
import { miAceptacion, usuarioDeSesion } from "@/lib/cuenta/sesion";
import { destinoSeguro } from "@/lib/cuenta/siguiente";
import { afiliados, site } from "@/lib/site";
import { aceptarTerminos } from "./acciones";

export const metadata: Metadata = {
  title: "Antes de empezar",
  robots: { index: false, follow: false },
};

export default async function Aceptar({ searchParams }: { searchParams: Promise<{ siguiente?: string }> }) {
  const siguiente = destinoSeguro((await searchParams).siguiente);
  const { usuario } = await usuarioDeSesion();
  const { pendiente, actualizar } = await miAceptacion();
  if (!pendiente) redirect(siguiente ?? "/cuenta");

  return (
    <Contenedor className="py-14 sm:py-20">
      <div className="mx-auto max-w-md">
        <p className="font-mano text-2xl text-rojo">{actualizar ? "Hola de nuevo" : "Ya casi"}</p>
        <h1 className="mt-1 text-4xl font-extrabold">{actualizar ? "Actualizamos nuestras reglas" : "Antes de empezar"}</h1>
        {actualizar ? (
          <p className="mt-3 text-lg text-gris">
            Hicimos un cambio importante en los términos y condiciones o en el aviso de privacidad.
            Para seguir usando tu cuenta de {site.nombre} con{" "}
            <strong className="break-all text-tinta">{usuario.email}</strong>, revísalos y acéptalos
            de nuevo.
          </p>
        ) : (
          <p className="mt-3 text-lg text-gris">
            Para usar tu cuenta de {site.nombre} con{" "}
            <strong className="break-all text-tinta">{usuario.email}</strong>, necesitamos que aceptes
            nuestras reglas. Son cortas y están en español claro.
          </p>
        )}
        <div className="mt-8 rounded-tarjeta border border-linea p-6 sm:p-7">
          <Formulario accion={aceptarTerminos} boton="Aceptar y continuar">
            {siguiente ? <input type="hidden" name="siguiente" value={siguiente} /> : null}
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" name="acepto" required className="mt-1 size-5 shrink-0 accent-tinta" />
              <span>
                Leí y acepto los{" "}
                <Link href="/terminos" target="_blank" className="font-semibold underline underline-offset-4">
                  términos y condiciones
                </Link>{" "}
                y el{" "}
                <Link href="/aviso-de-privacidad" target="_blank" className="font-semibold underline underline-offset-4">
                  aviso de privacidad
                </Link>
                .
              </span>
            </label>
            {actualizar ? null : (
            <label className="mt-4 flex cursor-pointer items-start gap-3 border-t border-linea pt-4">
              <input type="checkbox" name="publicidad" className="mt-1 size-5 shrink-0 accent-tinta" />
              <span>
                Quiero recibir novedades y promociones de {site.nombre} y de sus negocios afiliados
                {afiliados.length ? `, como ${afiliados.map((a) => a.nombre).join(" y ")}` : ""}.{" "}
                <span className="text-gris">Es opcional y lo puedes cambiar cuando quieras.</span>
              </span>
            </label>
            )}
          </Formulario>
        </div>
        <form action="/salir" method="post" className="mt-4 text-sm text-gris">
          ¿No eres tú o prefieres no continuar?{" "}
          <button type="submit" className="underline">Salir</button>
        </form>
      </div>
    </Contenedor>
  );
}
