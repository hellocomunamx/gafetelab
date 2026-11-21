import type { Metadata } from "next";
import Link from "next/link";
import { agregarCampo, borrarCampo, guardarCampos } from "@/app/cuenta/acciones";
import { Bloque, Entrada, Seleccion } from "@/components/cuenta/Entrada";
import { Formulario } from "@/components/cuenta/Formulario";
import { camposDe } from "@/lib/cuenta/consultas";
import { requerirEmpresa } from "@/lib/cuenta/sesion";

export const metadata: Metadata = { title: "Campos" };

const TIPOS: Record<string, string> = { texto: "Texto", fecha: "Fecha", foto: "Fotografía", qr: "Código QR" };
const entradaChica = "w-full rounded-tarjeta-chica border border-linea bg-white px-2.5 py-1.5";

export default async function Campos() {
  const { supabase, empresa } = await requerirEmpresa();
  const campos = await camposDe(supabase, empresa.id);
  const enCara = (cara: string) => campos.filter((c) => c.en_gafete && c.cara === cara);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">Campos de tu gafete</h1>
      <p className="max-w-2xl text-gris">
        Elige qué datos lleva el gafete, en qué cara y en qué orden. Con estos mismos campos se arma
        tu <Link href="/cuenta/equipo/importar" className="underline">plantilla de Excel</Link>.
      </p>

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
              plataforma. El acomodo exacto lo ajustas en el editor de diseño (próximamente).
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
    </div>
  );
}
