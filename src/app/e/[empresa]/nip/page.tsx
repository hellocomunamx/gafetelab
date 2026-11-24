import Link from "next/link";
import { notFound } from "next/navigation";
import { Entrada } from "@/components/cuenta/Entrada";
import { Formulario } from "@/components/cuenta/Formulario";
import { BarraPortal } from "@/components/portal/InicioPortal";
import { FORMATO_HANDLE, rutaPortal } from "@/lib/portal/reglas";
import { requerirPortal } from "@/lib/portal/sesion";
import { cambiarNip } from "../../acciones";

export const dynamic = "force-dynamic";

const nip = { inputMode: "numeric" as const, pattern: "\\d{6}", maxLength: 6, minLength: 6, required: true, type: "password" };

export default async function CambiarNip({ params }: { params: Promise<{ empresa: string }> }) {
  const { empresa: handle } = await params;
  if (!FORMATO_HANDLE.test(handle)) notFound();
  const sesion = await requerirPortal(handle, { permitirNipTemporal: true });
  if (sesion.metodo !== "nip") notFound();
  const primera = sesion.debeCambiarNip;
  return (
    <div className="mx-auto max-w-md">
      <BarraPortal handle={handle} empresa={sesion.empresa.nombre} />
      <h1 className="mt-6 text-3xl font-extrabold">{primera ? "Crea tu NIP" : "Cambiar mi NIP"}</h1>
      <p className="mt-2 text-gris">
        {primera
          ? `El NIP que te dio ${sesion.empresa.nombre} es temporal. Crea uno que solo tú sepas para seguir.`
          : "Elige un NIP nuevo de 6 números."}
      </p>
      <div className="mt-6 rounded-tarjeta border border-linea bg-white p-5 sm:p-6">
        <Formulario accion={cambiarNip} boton="Guardar mi NIP">
          <div className="space-y-4">
            <Entrada etiqueta={primera ? "NIP que te dieron" : "NIP actual"} name="actual" autoComplete="current-password" {...nip} />
            <Entrada etiqueta="NIP nuevo" name="nuevo" autoComplete="new-password" {...nip} ayuda="6 números. Que no sea 123456, ni el mismo número repetido, ni tu número de empleado." />
            <Entrada etiqueta="Repite el NIP nuevo" name="confirma" autoComplete="new-password" {...nip} />
          </div>
        </Formulario>
      </div>
      {primera ? null : (
        <p className="mt-5 text-center text-sm"><Link href={rutaPortal(handle)} className="underline underline-offset-4">Volver</Link></p>
      )}
    </div>
  );
}
