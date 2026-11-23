import type { Metadata } from "next";
import Link from "next/link";
import { aceptarInvitacion, rechazarInvitacion } from "@/app/cuenta/usuarios/acciones";
import { Bloque } from "@/components/cuenta/Entrada";
import { claseBoton } from "@/components/cuenta/Formulario";
import { roles } from "@/lib/cuenta/roles";
import { misInvitaciones, type Rol } from "@/lib/cuenta/sesion";

export const metadata: Metadata = { title: "Invitaciones" };

export default async function Invitaciones() {
  const invitaciones = await misInvitaciones();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">Tus invitaciones</h1>
        <p className="mt-2 text-gris">
          {invitaciones.length
            ? "Al aceptar entras a la plataforma de esa empresa para ayudar con sus gafetes y credenciales."
            : "No tienes invitaciones por aceptar."}
        </p>
      </div>

      {invitaciones.map((i) => (
        <Bloque key={i.id}>
          <p className="font-mano text-2xl text-rojo">Te invitaron a</p>
          <h2 className="text-2xl font-extrabold">{i.empresa}</h2>
          <p className="mt-2 text-gris">
            Como <strong className="text-tinta">{roles[i.rol as Rol].nombre.toLowerCase()}</strong>.{" "}
            {roles[i.rol as Rol].puede}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <form action={aceptarInvitacion}>
              <input type="hidden" name="id" value={i.id} />
              <button type="submit" className={claseBoton}>Aceptar y entrar</button>
            </form>
            <form action={rechazarInvitacion}>
              <input type="hidden" name="id" value={i.id} />
              <button type="submit" className="text-sm font-semibold underline underline-offset-4">
                No, gracias
              </button>
            </form>
          </div>
        </Bloque>
      ))}

      <p className="text-sm text-gris">
        <Link href="/cuenta" className="underline">Ir a mi cuenta</Link>
        {" · "}
        <Link href="/cuenta/empresa/nueva" className="underline">Crear mi propia empresa</Link>
      </p>
    </div>
  );
}
