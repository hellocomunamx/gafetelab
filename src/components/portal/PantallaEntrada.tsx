import Link from "next/link";
import { AccesoPortal } from "@/components/portal/AccesoPortal";
import { site } from "@/lib/site";

/** Entrada al portal de una empresa. */
export function PantallaEntrada({ handle, empresa, error }: { handle: string; empresa: string; error?: string | null }) {
  return (
    <div className="mx-auto max-w-md">
      <p className="text-sm font-semibold text-gris">{empresa}</p>
      <h1 className="mt-1 text-3xl font-extrabold">Mi gafete</h1>
      <p className="mt-2 text-gris">Entra para ver tu gafete, pedir cambios y saber en qué van.</p>
      {error ? <p role="alert" className="mt-4 rounded-tarjeta-chica bg-rojo/10 p-3 text-sm font-medium text-rojo-oscuro">{error}</p> : null}
      <div className="mt-6 rounded-tarjeta border border-linea bg-white p-5 sm:p-6">
        <AccesoPortal handle={handle} />
      </div>
      <p className="mt-5 text-center text-sm text-gris">
        ¿No tienes correo registrado ni NIP? Pídelo en Recursos Humanos de {empresa}.
      </p>
      <p className="mt-4 text-center text-xs text-gris">
        Portal de {empresa} en {site.nombre}. <Link href="/aviso-de-privacidad" className="underline">Aviso de privacidad</Link>.
      </p>
    </div>
  );
}
