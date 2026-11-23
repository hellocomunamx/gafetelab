import type { Metadata } from "next";
import { cambiarRol, cancelarInvitacion, invitarUsuario, quitarUsuario } from "@/app/cuenta/usuarios/acciones";
import { Confirmar } from "@/components/cuenta/Confirmar";
import { Bloque, Entrada } from "@/components/cuenta/Entrada";
import { Formulario } from "@/components/cuenta/Formulario";
import { roles, rolesInvitables } from "@/lib/cuenta/roles";
import { type Rol, requerirEmpresa } from "@/lib/cuenta/sesion";

export const metadata: Metadata = { title: "Usuarios" };

const chipRol: Record<Rol, string> = {
  propietario: "bg-tinta text-white",
  administrador: "bg-resaltador/60 text-tinta",
  editor: "bg-papel text-tinta",
};
const enlace = "font-semibold underline underline-offset-4";
const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });

export default async function Usuarios() {
  const { supabase, usuario, empresa, rol, administra } = await requerirEmpresa();
  const [{ data: usuarios }, { data: invitaciones }] = await Promise.all([
    supabase.rpc("usuarios_de", { p_empresa: empresa.id }),
    administra
      ? supabase.from("invitaciones").select("id, correo, rol, creado_en").eq("empresa_id", empresa.id).order("creado_en")
      : Promise.resolve({ data: [] }),
  ]);
  const invitables = rolesInvitables(rol);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">Usuarios</h1>
        <p className="mt-2 max-w-2xl text-gris">
          Las personas que pueden entrar a la plataforma de {empresa.nombre} para ayudarte con los
          gafetes y credenciales. No son las personas que llevan gafete: esas están en Equipo.
        </p>
      </div>

      <Bloque titulo="Quién tiene acceso">
        <ul className="divide-y divide-linea">
          {(usuarios ?? []).map((u) => {
            const suRol = u.rol as Rol;
            const soyYo = u.usuario_id === usuario.id;
            const puedoQuitar =
              !soyYo && suRol !== "propietario" && (rol === "propietario" || (rol === "administrador" && suRol === "editor"));
            return (
              <li key={u.usuario_id} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    <span className="break-all">{u.nombre || u.correo}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${chipRol[suRol]}`}>
                      {roles[suRol].nombre}
                    </span>
                    {soyYo ? <span className="text-xs font-normal text-gris">Tú</span> : null}
                  </p>
                  <p className="mt-0.5 text-sm break-all text-gris">
                    {u.nombre ? `${u.correo} · ` : ""}Desde el {fecha(u.desde)}
                  </p>
                </div>
                <div className="flex flex-wrap items-start gap-x-4 gap-y-2 text-sm">
                  {rol === "propietario" && suRol !== "propietario" ? (
                    <form action={cambiarRol}>
                      <input type="hidden" name="usuario" value={u.usuario_id} />
                      <input type="hidden" name="rol" value={suRol === "editor" ? "administrador" : "editor"} />
                      <button type="submit" className={enlace}>
                        {suRol === "editor" ? "Hacer administrador" : "Hacer editor"}
                      </button>
                    </form>
                  ) : null}
                  {puedoQuitar ? (
                    <Confirmar accion={quitarUsuario} id={u.usuario_id} texto="Quitar acceso" confirmar="Sí, quitar">
                      Ya no podrá entrar a la plataforma de {empresa.nombre}.
                    </Confirmar>
                  ) : null}
                  {soyYo && suRol !== "propietario" ? (
                    <Confirmar accion={quitarUsuario} id={u.usuario_id} texto="Salir de esta empresa" confirmar="Sí, salir">
                      Para volver a entrar tendrán que invitarte otra vez.
                    </Confirmar>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </Bloque>

      {administra ? (
        <Bloque titulo="Invitar a alguien">
          <Formulario accion={invitarUsuario} boton="Enviar invitación" limpiarAlGuardar>
            <div className="space-y-5">
              <Entrada
                etiqueta="Su correo"
                name="correo"
                type="email"
                required
                maxLength={254}
                placeholder="persona@empresa.com"
                autoComplete="off"
                className="max-w-md"
                ayuda="Le llega un correo con la liga para entrar. Si todavía no tiene cuenta, se crea sola."
              />
              <fieldset>
                <legend className="text-sm font-semibold">¿Qué podrá hacer?</legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {invitables.map((r, i) => (
                    <label key={r} className="cursor-pointer">
                      <input type="radio" name="rol" value={r} defaultChecked={i === 0} className="peer sr-only" />
                      <span className="block h-full rounded-tarjeta-chica border border-linea p-4 transition-colors peer-checked:border-tinta peer-checked:bg-tinta peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-rojo">
                        <span className="block font-semibold">{roles[r].nombre}</span>
                        <span className="mt-1 block text-sm opacity-80">{roles[r].puede}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </Formulario>

          {invitaciones?.length ? (
            <div className="mt-6 border-t border-linea pt-5">
              <h3 className="font-titulos text-lg font-bold">Invitaciones por aceptar</h3>
              <ul className="mt-3 divide-y divide-linea">
                {invitaciones.map((i) => (
                  <li key={i.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
                    <p className="min-w-0 text-sm">
                      <span className="font-semibold break-all">{i.correo}</span>
                      <span className="text-gris">
                        {" "}· {roles[i.rol as Rol].nombre} · Invitado el {fecha(i.creado_en)}
                      </span>
                    </p>
                    <Confirmar accion={cancelarInvitacion} id={i.id} texto="Cancelar invitación" confirmar="Sí, cancelar" />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Bloque>
      ) : null}

      <Bloque titulo="Qué puede hacer cada quien">
        <dl className="grid gap-4 sm:grid-cols-3">
          {(Object.keys(roles) as Rol[]).map((r) => (
            <div key={r} className="rounded-tarjeta-chica border border-linea p-4">
              <dt>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${chipRol[r]}`}>
                  {roles[r].nombre}
                </span>
              </dt>
              <dd className="mt-2 text-sm text-gris">{roles[r].puede}</dd>
            </div>
          ))}
        </dl>
      </Bloque>
    </div>
  );
}
