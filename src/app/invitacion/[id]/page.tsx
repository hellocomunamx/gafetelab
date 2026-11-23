import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FormularioEntrar } from "@/app/entrar/FormularioEntrar";
import { Contenedor } from "@/components/ui";
import { roles } from "@/lib/cuenta/roles";
import { type Rol, proveedoresActivos } from "@/lib/cuenta/sesion";
import { site } from "@/lib/site";
import { crearClienteServidor } from "@/lib/supabase/server";
import { salirYVolver } from "./acciones";

export const metadata: Metadata = {
  title: "Tu invitación",
  robots: { index: false, follow: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const boton =
  "inline-flex items-center justify-center rounded-full bg-rojo px-6 py-3 font-semibold text-white transition-colors hover:bg-rojo-oscuro";

/** Une nombres en español: "A", "A y B", "A, B y C". */
const unir = (v: string[]) =>
  v.length < 2 ? (v[0] ?? "") : `${v.slice(0, -1).join(", ")} y ${v.at(-1)}`;

export default async function Invitacion({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await crearClienteServidor();
  const [{ data: invitaciones }, { data: sesion }] = await Promise.all([
    UUID.test(id)
      ? supabase.rpc("ver_invitacion", { p_invitacion: id })
      : Promise.resolve({ data: null }),
    supabase.auth.getUser(),
  ]);

  if (!invitaciones?.length) {
    return (
      <Contenedor className="py-14 sm:py-20">
        <div className="mx-auto max-w-md">
          <p className="font-mano text-2xl text-rojo">Uy</p>
          <h1 className="text-4xl font-extrabold">
            Esta invitación ya no está disponible
          </h1>
          <p className="mt-3 text-lg text-gris">
            Puede que ya la hayas aceptado o que la hayan cancelado. Entra con
            tu correo para ver tu cuenta, o pide a quien te invitó que te mande
            otra.
          </p>
          <Link href="/entrar" className={`${boton} mt-8`}>
            Iniciar sesión
          </Link>
        </div>
      </Contenedor>
    );
  }

  const { correo, invita, tiene_cuenta } = invitaciones[0];
  const aceptar = `/invitacion/${id}/aceptar`;
  const usuario = sesion.user;
  // Con la sesión del correo invitado, se une de una vez.
  if (usuario && usuario.email?.toLowerCase() === correo) redirect(aceptar);

  const empresas = unir(invitaciones.map((i) => i.empresa));
  const quien = invita ?? `Alguien de ${invitaciones[0].empresa}`;

  return (
    <Contenedor className="py-14 sm:py-20">
      <div className="mx-auto max-w-md">
        <p className="font-mano text-2xl text-rojo">¡Hola!</p>
        <h1 className="text-4xl font-extrabold">Te invitaron a {empresas}</h1>
        <p className="mt-3 text-lg text-gris">
          {quien} te dio acceso a la plataforma de {site.nombre}, donde se
          administran los gafetes y credenciales del equipo.{" "}
          {usuario
            ? null
            : tiene_cuenta
              ? "Entra con tu cuenta y quedarás en el equipo."
              : "Crea tu cuenta en un minuto y quedarás en el equipo."}
        </p>

        <ul className="mt-6 space-y-2">
          {invitaciones.map((i) => (
            <li
              key={i.id}
              className="flex items-center justify-between gap-3 rounded-tarjeta-chica bg-papel px-4 py-3"
            >
              <span className="font-semibold">{i.empresa}</span>
              <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold">
                {roles[i.rol as Rol].nombre}
              </span>
            </li>
          ))}
        </ul>

        {usuario ? (
          <div className="mt-8 rounded-tarjeta border border-linea p-6 sm:p-7">
            <p>
              Entraste como{" "}
              <strong className="break-all">{usuario.email}</strong>, pero la
              invitación es para <strong className="break-all">{correo}</strong>
              .
            </p>
            <form action={salirYVolver} className="mt-5">
              <input type="hidden" name="id" value={id} />
              <button type="submit" className={`${boton} w-full`}>
                Salir y entrar con {correo}
              </button>
            </form>
          </div>
        ) : (
          <div className="mt-8 overflow-hidden rounded-tarjeta border border-linea p-6 sm:p-7">
            <FormularioEntrar
              proveedores={proveedoresActivos()}
              correoInicial={correo}
              correoFijo
              invitacion
              siguiente={aceptar}
              modoInicial={tiene_cuenta ? "entrar" : "crear"}
            />
          </div>
        )}

        <p className="mt-4 text-sm text-gris">
          {usuario ? null : (
            <>
              La invitación es para {correo}
              {proveedoresActivos().includes("google")
                ? "; si entras con Google, usa la cuenta de ese correo"
                : ""}
              .{" "}
            </>
          )}
          La primera vez te pediremos aceptar nuestros{" "}
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
