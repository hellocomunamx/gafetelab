import type { Metadata } from "next";
import Link from "next/link";
import { guardarContrasena, guardarPerfil, guardarPublicidad } from "@/app/cuenta/usuarios/acciones";
import { Bloque, Entrada } from "@/components/cuenta/Entrada";
import { Formulario } from "@/components/cuenta/Formulario";
import { LARGO_MINIMO_CONTRASENA } from "@/lib/cuenta/roles";
import { miAceptacion, proveedoresActivos, requerirUsuario } from "@/lib/cuenta/sesion";
import { afiliados, site } from "@/lib/site";

export const metadata: Metadata = { title: "Mi acceso" };

const NOMBRES = { google: "Google", azure: "Microsoft" } as const;

export default async function Acceso() {
  const { supabase, usuario } = await requerirUsuario();
  const { data: perfil } = await supabase.from("perfiles").select("nombre, publicidad").eq("id", usuario.id).maybeSingle();
  const conContrasena = usuario.user_metadata?.con_contrasena === true;
  const proveedores = proveedoresActivos().map((p) => NOMBRES[p]);
  const { aceptacion } = await miAceptacion();

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

      <Bloque titulo="Novedades y promociones">
        <Formulario accion={guardarPublicidad} boton="Guardar">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              name="publicidad"
              defaultChecked={perfil?.publicidad ?? false}
              className="mt-1 size-5 shrink-0 accent-tinta"
            />
            <span>
              Quiero recibir novedades y promociones de {site.nombre} y de sus negocios afiliados
              {afiliados.length ? `, como ${afiliados.map((a) => a.nombre).join(" y ")}` : ""}.
              <span className="mt-1 block text-sm text-gris">
                Es opcional. Te las mandamos nosotros: no compartimos tu correo con nadie, y nunca usamos
                los datos de tu personal para publicidad.
              </span>
            </span>
          </label>
        </Formulario>
      </Bloque>

      <p className="text-sm text-gris">
        {aceptacion
          ? `Aceptaste los términos y condiciones (versión ${aceptacion.terminos_version}) y el aviso de privacidad (versión ${aceptacion.aviso_version}) el ${new Date(aceptacion.aceptado_en).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Mexico_City" })}. `
          : ""}
        <Link href="/terminos" className="underline">Términos y condiciones</Link> ·{" "}
        <Link href="/aviso-de-privacidad" className="underline">Aviso de privacidad</Link>
      </p>
    </div>
  );
}
