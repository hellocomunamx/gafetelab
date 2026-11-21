import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Contenedor } from "@/components/ui";
import { proveedoresActivos } from "@/lib/cuenta/sesion";
import { site } from "@/lib/site";
import { crearClienteServidor } from "@/lib/supabase/server";
import { FormularioEntrar } from "./FormularioEntrar";

export const metadata: Metadata = {
  title: "Entrar a mi cuenta",
  robots: { index: false, follow: false },
};

const AVISOS: Record<string, string> = {
  liga: "Esa liga ya se usó o venció. Pide una nueva.",
  proveedor: "No pudimos entrar con esa cuenta. Intenta con tu correo.",
};

export default async function Entrar({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/cuenta");
  const { error } = await searchParams;

  return (
    <Contenedor className="py-14 sm:py-20">
      <div className="mx-auto max-w-md">
        <h1 className="text-4xl font-extrabold">Entra a tu cuenta</h1>
        <p className="mt-3 text-lg text-gris">
          Tu plataforma de {site.nombre}: tu equipo, sus gafetes y tus datos guardados.
        </p>
        <div className="mt-8 rounded-tarjeta border border-linea p-6 sm:p-7">
          <FormularioEntrar proveedores={proveedoresActivos()} aviso={error ? AVISOS[error] : undefined} />
        </div>
        <p className="mt-4 text-sm text-gris">
          Al entrar aceptas nuestro{" "}
          <Link href="/aviso-de-privacidad" className="underline">
            aviso de privacidad
          </Link>
          .
        </p>
      </div>
    </Contenedor>
  );
}
