import type { Metadata } from "next";
import Link from "next/link";
import { agregarCampo, borrarCampo, guardarCampos } from "@/app/cuenta/acciones";
import { AjusteQrForm } from "@/components/cuenta/AjusteQrForm";
import { BotonPlantilla } from "@/components/cuenta/BotonPlantilla";
import { Bloque, Entrada, Seleccion } from "@/components/cuenta/Entrada";
import { claseBoton, Formulario } from "@/components/cuenta/Formulario";
import { camposDe } from "@/lib/cuenta/consultas";
import { modosQr, resumenQr, rutaVerificacion } from "@/lib/cuenta/qr";
import { requerirEmpresa } from "@/lib/cuenta/sesion";
import { claveDe } from "@/lib/cuenta/texto";

export const metadata: Metadata = { title: "Campos" };

const TIPOS: Record<string, string> = { texto: "Texto", fecha: "Fecha", foto: "Fotografía", qr: "Código QR" };
const entradaChica = "w-full rounded-tarjeta-chica border border-linea bg-white px-2.5 py-1.5";

export default async function Campos() {
  const { supabase, empresa, administra } = await requerirEmpresa();
  const [campos, { data: ejemplo }] = await Promise.all([
    camposDe(supabase, empresa.id),
    supabase.from("empleados").select("nombre, codigo").eq("empresa_id", empresa.id).eq("estatus", "activo").order("nombre").limit(1).maybeSingle(),
  ]);
  const opciones = (tipos: string[]) =>
    campos.filter((c) => tipos.includes(c.tipo)).map(({ clave, etiqueta }) => ({ clave, etiqueta }));
  const enCara = (cara: string) => campos.filter((c) => c.en_gafete && c.cara === cara);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">Campos de tu gafete</h1>
      <p className="max-w-2xl text-gris">
        Elige qué datos lleva el gafete, en qué cara y en qué orden. Con estos mismos campos se arma
        tu plantilla de Excel.
      </p>

      <section className="flex flex-col gap-4 rounded-tarjeta bg-tinta p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 className="text-xl font-extrabold">Personaliza tus campos y descarga tu plantilla de Excel</h2>
          <p className="mt-1 max-w-xl text-sm text-white/75">
            La plantilla trae una columna por cada campo guardado aquí. Llénala con tu equipo, una
            persona por renglón, y súbela para dar de alta a todos de forma masiva.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2">
          <BotonPlantilla
            campos={campos.map(({ clave, etiqueta, tipo }) => ({ clave, etiqueta, tipo }))}
            empresa={claveDe(empresa.nombre).replace(/_/g, "-")}
            className={claseBoton}
          >
            Descargar mi plantilla
          </BotonPlantilla>
          <Link href="/cuenta/equipo/importar" className="font-semibold underline underline-offset-4">
            Subir mi Excel lleno
          </Link>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_18rem]">
        <Bloque className="min-w-0">
          <Formulario accion={guardarCampos} boton="Guardar campos">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-linea">
                    <th scope="col" className="py-2 pr-3 font-semibold">Campo</th>
                    <th scope="col" className="py-2 pr-3 font-semibold">Tipo</th>
                    <th scope="col" className="py-2 pr-3 text-center font-semibold">En el gafete</th>
                    <th scope="col" className="py-2 pr-3 font-semibold">Cara</th>
                    <th scope="col" className="py-2 font-semibold">Orden</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-linea">
                  {campos.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2 pr-3">
                        <input name={`etiqueta_${c.id}`} defaultValue={c.etiqueta} required maxLength={60} aria-label={`Nombre del campo ${c.etiqueta}`} className={entradaChica} />
                      </td>
                      <td className="py-2 pr-3 text-gris">{TIPOS[c.tipo] ?? c.tipo}</td>
                      <td className="py-2 pr-3 text-center">
                        <input
                          type="checkbox"
                          name={`en_${c.id}`}
                          defaultChecked={c.en_gafete}
                          disabled={c.clave === "nombre"}
                          aria-label={`${c.etiqueta} va en el gafete`}
                          className="size-4 accent-tinta"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <select name={`cara_${c.id}`} defaultValue={c.cara} aria-label={`Cara de ${c.etiqueta}`} className={entradaChica}>
                          <option value="frente">Frente</option>
                          <option value="vuelta">Vuelta</option>
                        </select>
                      </td>
                      <td className="py-2">
                        <input type="number" name={`orden_${c.id}`} defaultValue={c.orden} min={0} max={99} aria-label={`Orden de ${c.etiqueta}`} className={`${entradaChica} w-16`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-gris">
              El nombre siempre va en el gafete. Los campos que no van impresos se guardan igual en tu
              plataforma. El acomodo exacto lo ajustas en{" "}
              <Link href="/cuenta/disenos" className="underline">tus diseños</Link>.
            </p>
          </Formulario>
        </Bloque>

        <div className="space-y-5">
          <Bloque titulo="Así queda">
            {(["frente", "vuelta"] as const).map((cara) => (
              <div key={cara} className="mb-4 last:mb-0">
                <p className="text-sm font-semibold capitalize">{cara}</p>
                {enCara(cara).length ? (
                  <ol className="mt-1 list-inside list-decimal text-sm text-gris">
                    {enCara(cara).map((c) => (
                      <li key={c.id}>{c.etiqueta}</li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-1 text-sm text-gris">Sin campos: se imprime solo tu diseño.</p>
                )}
              </div>
            ))}
          </Bloque>

          <Bloque titulo="Agregar campo">
            <Formulario accion={agregarCampo} boton="Agregar" limpiarAlGuardar>
              <div className="space-y-3">
                <Entrada etiqueta="Nombre del campo" name="etiqueta" required maxLength={60} placeholder="Tipo de sangre, NSS, Vigencia" />
                <Seleccion etiqueta="Tipo" name="tipo" defaultValue="texto">
                  <option value="texto">Texto</option>
                  <option value="fecha">Fecha</option>
                </Seleccion>
                <Seleccion etiqueta="Cara" name="cara" defaultValue="vuelta">
                  <option value="frente">Frente</option>
                  <option value="vuelta">Vuelta</option>
                </Seleccion>
              </div>
            </Formulario>
          </Bloque>

          {campos.some((c) => !c.de_sistema) ? (
            <Bloque titulo="Quitar un campo">
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
              <p className="mt-3 text-xs text-gris">Lo capturado en ese campo deja de mostrarse.</p>
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
            conFoto={Boolean(process.env.SUPABASE_SECRET_KEY)}
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
