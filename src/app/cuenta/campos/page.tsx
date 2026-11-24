import type { Metadata } from "next";
import Link from "next/link";
import { agregarCampo, borrarCampo, guardarCampos } from "@/app/cuenta/acciones";
import { AjusteQrForm } from "@/components/cuenta/AjusteQrForm";
import { BotonPlantilla } from "@/components/cuenta/BotonPlantilla";
import { Bloque, Entrada, Seleccion } from "@/components/cuenta/Entrada";
import { Formulario } from "@/components/cuenta/Formulario";
import { claseBoton } from "@/components/cuenta/clases";
import { camposDe } from "@/lib/cuenta/consultas";
import { datosVerificables, modosQr, resumenQr, rutaVerificacion } from "@/lib/cuenta/qr";
import { requerirEmpresa } from "@/lib/cuenta/sesion";
import { claveDe } from "@/lib/cuenta/texto";

export const metadata: Metadata = { title: "Datos del equipo" };

const TIPOS: Record<string, string> = { texto: "Texto", fecha: "Fecha", foto: "Fotografía", qr: "Código QR" };
const entradaChica = "w-full rounded-tarjeta-chica border border-linea bg-white px-2.5 py-1.5";

export default async function Campos() {
  const { supabase, empresa, administra, esEvento } = await requerirEmpresa();
  const [campos, { data: ejemplo }] = await Promise.all([
    camposDe(supabase, empresa.id),
    supabase.from("empleados").select("nombre, codigo").eq("empresa_id", empresa.id).eq("estatus", "activo").neq("nombre", "").order("nombre").limit(1).maybeSingle(),
  ]);
  const opciones = (tipos: string[]) =>
    campos.filter((c) => tipos.includes(c.tipo)).map(({ clave, etiqueta }) => ({ clave, etiqueta }));

  const paso = "flex flex-col rounded-tarjeta border border-linea bg-white p-5";
  const numeroPaso = "mb-2 flex size-8 items-center justify-center rounded-full bg-tinta text-sm font-extrabold text-white";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">{esEvento ? "Los datos de tus asistentes" : "Los datos de tu equipo"}</h1>
        <p className="mt-2 max-w-2xl text-gris">
          Aquí decides qué datos guardas de cada persona. No todos tienen que imprimirse: eso lo eliges en cada
          diseño. Así funciona, en tres partes:
        </p>
      </div>

      <ol className="grid gap-4 lg:grid-cols-3">
        <li className={`${paso} border-2 border-tinta`}>
          <span aria-hidden className={numeroPaso}>1</span>
          <h2 className="text-lg font-extrabold">Aquí: qué datos guardas</h2>
          <p className="mt-1 flex-1 text-sm text-gris">
            Cada dato de esta lista es una columna de tu plantilla de Excel. Es la misma para todo tu equipo, aunque
            tengas varios diseños.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <BotonPlantilla
              campos={campos.map(({ clave, etiqueta, tipo }) => ({ clave, etiqueta, tipo }))}
              empresa={claveDe(empresa.nombre).replace(/_/g, "-")}
              className={claseBoton}
            >
              Descargar mi plantilla
            </BotonPlantilla>
            <Link href="/cuenta/equipo/importar" className="text-sm font-semibold underline underline-offset-4">
              Subir mi Excel lleno
            </Link>
          </div>
        </li>
        <li className={paso}>
          <span aria-hidden className={numeroPaso}>2</span>
          <h2 className="text-lg font-extrabold">En cada diseño: qué va impreso</h2>
          <p className="mt-1 flex-1 text-sm text-gris">
            Al crear un diseño eliges cuáles de estos datos se imprimen, en qué cara y cómo se acomodan. Por ejemplo,
            el de planta con foto y puesto, y el de visitante sin nombre.
          </p>
          <Link href="/cuenta/disenos" className="mt-4 text-sm font-semibold underline underline-offset-4">
            Ir a mis diseños
          </Link>
        </li>
        <li className={paso}>
          <span aria-hidden className={numeroPaso}>3</span>
          <h2 className="text-lg font-extrabold">En tu QR: qué se ve al escanearlo</h2>
          <p className="mt-1 flex-1 text-sm text-gris">
            Cada persona tiene un solo código QR, igual en todos tus diseños, para que siga sirviendo aunque cambies de
            diseño o reimprimas. Por eso se elige una vez, abajo.
          </p>
          <a href="#qr" className="mt-4 text-sm font-semibold underline underline-offset-4">Elegir qué muestra el QR</a>
        </li>
      </ol>

      <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
        <Bloque titulo="Tus datos" className="min-w-0">
          <Formulario accion={guardarCampos} boton="Guardar cambios">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[26rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-linea">
                    <th scope="col" className="py-2 pr-3 font-semibold">Nombre del dato</th>
                    <th scope="col" className="py-2 pr-3 font-semibold">Tipo</th>
                    <th scope="col" className="py-2 font-semibold">Orden en el Excel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-linea">
                  {campos.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2 pr-3">
                        <input name={`etiqueta_${c.id}`} defaultValue={c.etiqueta} required maxLength={60} autoComplete="off" aria-label={`Nombre del dato ${c.etiqueta}`} className={entradaChica} />
                      </td>
                      <td className="py-2 pr-3 text-gris">{TIPOS[c.tipo] ?? c.tipo}</td>
                      <td className="py-2">
                        <input type="number" name={`orden_${c.id}`} defaultValue={c.orden} min={0} max={99} aria-label={`Orden de ${c.etiqueta} en el Excel`} className={`${entradaChica} w-16`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-gris">
              Puedes cambiar el nombre de cualquier dato, por ejemplo «Puesto» por «Área». Ninguno es obligatorio: sin
              nombre, la persona queda como gafete genérico.
            </p>
          </Formulario>
        </Bloque>

        <div className="space-y-5">
          <Bloque titulo="Agregar un dato">
            <Formulario accion={agregarCampo} boton="Agregar" limpiarAlGuardar>
              <div className="space-y-3">
                <Entrada etiqueta="Nombre del dato" name="etiqueta" required maxLength={60} autoComplete="off" placeholder="Tipo de sangre, NSS, Vigencia" />
                <Seleccion etiqueta="Tipo" name="tipo" defaultValue="texto">
                  <option value="texto">Texto</option>
                  <option value="fecha">Fecha</option>
                </Seleccion>
                <p className="text-xs text-gris">Aparece como columna nueva en tu Excel. Para imprimirlo, elígelo en tu diseño.</p>
              </div>
            </Formulario>
          </Bloque>

          {campos.some((c) => !c.de_sistema) ? (
            <Bloque titulo="Quitar un dato">
              <ul className="space-y-2 text-sm">
                {campos.filter((c) => !c.de_sistema).map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3">
                    {c.etiqueta}
                    <form action={borrarCampo}>
                      <input type="hidden" name="id" value={c.id} />
                      <button type="submit" className="font-semibold text-rojo-oscuro underline underline-offset-4">Quitar</button>
                    </form>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-gris">Lo capturado en ese dato deja de mostrarse.</p>
            </Bloque>
          ) : null}
        </div>
      </div>
      <section id="qr" className="scroll-mt-28 rounded-tarjeta border border-linea bg-white p-5 sm:p-6">
        <h2 className="text-xl font-extrabold">Qué muestra tu QR</h2>
        <p className="mt-1 mb-5 max-w-2xl text-sm text-gris">
          Decide a dónde lleva el código QR de tus gafetes. Aplica a todos los gafetes de{" "}
          {empresa.nombre} que lleven QR en su diseño.
        </p>
        {administra ? (
          <AjusteQrForm
            ajuste={empresa}
            empresa={empresa.nombre}
            camposTexto={opciones(["texto", "fecha"])}
            camposFecha={opciones(["fecha"])}
            datos={datosVerificables(campos, Boolean(process.env.SUPABASE_SECRET_KEY))}
          />
        ) : (
          <p className="rounded-tarjeta-chica bg-papel p-4 text-sm">
            <strong>{modosQr.find((m) => m.id === empresa.qr_modo)?.titulo}.</strong>{" "}
            {resumenQr(empresa, Object.fromEntries(campos.map((c) => [c.clave, c.etiqueta])))} Solo quien
            administra la empresa puede cambiarlo.
          </p>
        )}
        {empresa.qr_modo === "verificacion" && ejemplo ? (
          <p className="mt-5 border-t border-linea pt-4 text-sm">
            <a
              href={rutaVerificacion(ejemplo.codigo)}
              target="_blank"
              rel="noopener"
              className="font-semibold text-rojo underline underline-offset-4"
            >
              Ver la página de verificación de {ejemplo.nombre}
            </a>
            <span className="text-gris"> · Así la ve cualquiera que escanee su gafete.</span>
          </p>
        ) : null}
      </section>
    </div>
  );
}
