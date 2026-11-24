import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Contenedor } from "@/components/ui";
import { proveedoresActivos } from "@/lib/cuenta/sesion";
import { destinoSeguro } from "@/lib/cuenta/siguiente";
import { site } from "@/lib/site";
import { crearClienteServidor } from "@/lib/supabase/server";
import { FormularioEntrar, type Modo } from "./FormularioEntrar";

export const metadata: Metadata = {
  title: "Iniciar sesión o crear cuenta",
  robots: { index: false, follow: false },
};

const AVISOS: Record<string, string> = {
  liga: "Esa liga ya se usó o venció. Pide una nueva.",
  proveedor: "No pudimos entrar con esa cuenta. Intenta con tu correo.",
};

export default async function Entrar({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; correo?: string; siguiente?: string; modo?: string }>;
}) {
  const { error, correo, siguiente: pedido, modo } = await searchParams;
  const modoInicial: Modo = modo === "crear" || modo === "liga" ? modo : "entrar";
  const siguiente = destinoSeguro(pedido);
  const supabase = await crearClienteServidor();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect(siguiente ?? "/cuenta");

  return (
    <Contenedor className="py-14 sm:py-20">
      <div className="mx-auto max-w-md">
        <h1 className="text-4xl font-extrabold">{siguiente ? "Entra o crea tu cuenta" : "Te damos la bienvenida"}</h1>
        <p className="mt-3 text-lg text-gris">
          {siguiente
            ? "Necesitas una cuenta para guardar tu compra. Si es tu primera vez, créala en un minuto: tu carrito te espera."
            : `Tu plataforma de ${site.nombre}: tu equipo, sus gafetes y tus datos guardados.`}
        </p>
        <div className="mt-8 overflow-hidden rounded-tarjeta border border-linea p-6 sm:p-7">
          <FormularioEntrar
            proveedores={proveedoresActivos()}
            aviso={error ? AVISOS[error] : undefined}
            correoInicial={typeof correo === "string" ? correo.slice(0, 254) : undefined}
            siguiente={siguiente ?? undefined}
            modoInicial={modoInicial}
          />
        </div>
        <p className="mt-4 text-sm text-gris">
          La primera vez que entres te pediremos aceptar nuestros{" "}
          <Link href="/terminos" className="underline">
            términos y condiciones
          </Link>{" "}
          y nuestro{" "}
          <Link href="/aviso-de-privacidad" className="underline">
            aviso de privacidad
          </Link>
          .
        </p>
      </div>
    </Contenedor>
  );
}
