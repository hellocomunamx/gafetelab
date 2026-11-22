import type { Metadata } from "next";
import { guardarContrasena, guardarPerfil } from "@/app/cuenta/usuarios/acciones";
import { Bloque, Entrada } from "@/components/cuenta/Entrada";
import { Formulario } from "@/components/cuenta/Formulario";
import { LARGO_MINIMO_CONTRASENA } from "@/lib/cuenta/roles";
import { proveedoresActivos, requerirUsuario } from "@/lib/cuenta/sesion";

export const metadata: Metadata = { title: "Mi acceso" };

const NOMBRES = { google: "Google", azure: "Microsoft" } as const;

export default async function Acceso() {
  const { supabase, usuario } = await requerirUsuario();
  const { data: perfil } = await supabase.from("perfiles").select("nombre").eq("id", usuario.id).maybeSingle();
  const conContrasena = usuario.user_metadata?.con_contrasena === true;
  const proveedores = proveedoresActivos().map((p) => NOMBRES[p]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">Mi acceso</h1>
        <p className="mt-2 text-gris">
          Entras con <strong className="break-all text-tinta">{usuario.email}</strong>.
        </p>
      </div>

      <Bloque titulo="Tu nombre">
        <Formulario accion={guardarPerfil} boton="Guardar">
          <Entrada
            etiqueta="Cómo te llamas"
            name="nombre"
            maxLength={120}
            autoComplete="name"
            defaultValue={perfil?.nombre ?? ""}
            className="max-w-md"
            ayuda="Así te ven las demás personas con acceso a tu empresa."
          />
        </Formulario>
      </Bloque>

      <Bloque titulo={conContrasena ? "Cambiar contraseña" : "Crear una contraseña"}>
        <p className="mb-4 text-sm text-gris">
          {conContrasena
            ? "Ya tienes contraseña. Escribe una nueva para cambiarla."
            : "Es opcional: con ella entras sin esperar el correo."}{" "}
          La liga y el código por correo siguen funcionando siempre, así que si la olvidas entras con
          ellos y creas otra aquí.
        </p>
        <Formulario
          accion={guardarContrasena}
          boton={conContrasena ? "Cambiar contraseña" : "Crear contraseña"}
          limpiarAlGuardar
        >
          {/* Ayuda a los administradores de contraseñas a guardar el par correcto. */}
          <input type="hidden" name="correo" autoComplete="username" value={usuario.email ?? ""} readOnly />
          <div className="grid gap-4 sm:grid-cols-2">
            <Entrada
              etiqueta="Contraseña nueva"
              name="contrasena"
              type="password"
              required
              minLength={LARGO_MINIMO_CONTRASENA}
              maxLength={72}
              autoComplete="new-password"
              ayuda={`Al menos ${LARGO_MINIMO_CONTRASENA} caracteres.`}
            />
            <Entrada
              etiqueta="Repítela"
              name="repetir"
              type="password"
              required
              minLength={LARGO_MINIMO_CONTRASENA}
              maxLength={72}
              autoComplete="new-password"
            />
          </div>
        </Formulario>
      </Bloque>

      <Bloque titulo="Formas de entrar">
        <ul className="space-y-2 text-sm">
          <li>
            <strong>Liga y código por correo:</strong> siempre disponible, sin contraseña.
          </li>
          <li>
            <strong>Correo y contraseña:</strong> {conContrasena ? "activa." : "se activa al crear tu contraseña."}
          </li>
          {proveedores.length ? (
            <li>
              <strong>Cuenta de {proveedores.join(" o ")}:</strong> entra con el botón de la pantalla de
              acceso, usando este mismo correo.
            </li>
          ) : null}
        </ul>
      </Bloque>
    </div>
  );
}
