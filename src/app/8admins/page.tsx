import type { Metadata } from "next";
import Link from "next/link";
import { claseBoton, claseBotonSecundario, claseEntrada } from "@/components/cuenta/Formulario";
import { palabrasSensibles, textosDeDiseno } from "@/lib/admin/alertas";
import { RUTA_ADMIN } from "@/lib/admin/ruta";
import { requerirAdmin } from "@/lib/admin/sesion";
import { fechaLarga } from "@/lib/cuenta/constancia";
import { ligasDe } from "@/lib/cuenta/fotos";
import { revisarConstancia } from "./acciones";

export const metadata: Metadata = { title: "Empresas" };

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Hermosillo" });

export default async function Admin() {
  const { supabase, servicio } = await requerirAdmin();
  const [{ data: empresas }, { data: disenos }, { data: constancias }, { data: fiscales }] = await Promise.all([
    supabase.rpc("admin_empresas"),
    servicio
      ? servicio.from("disenos").select("empresa_id, nombre, frente, vuelta").limit(5000)
      : Promise.resolve({ data: null }),
    servicio
      ? servicio.from("constancias").select("*").order("creado_en", { ascending: false }).limit(5000)
      : Promise.resolve({ data: null }),
    servicio
      ? servicio.from("datos_fiscales").select("empresa_id, rfc, razon_social").order("predeterminado", { ascending: false }).limit(5000)
      : Promise.resolve({ data: null }),
  ]);

  // La constancia vigente de cada empresa es la más reciente.
  const constanciaDe = new Map<string, NonNullable<typeof constancias>[number]>();
  for (const c of constancias ?? []) if (!constanciaDe.has(c.empresa_id)) constanciaDe.set(c.empresa_id, c);
  const pendientes = [...constanciaDe.values()].filter((c) => c.estado === "pendiente").reverse();
  const archivos = servicio ? await ligasDe(servicio, "constancias", pendientes.map((c) => c.ruta)) : new Map<string, string>();
  const nombreDe = new Map((empresas ?? []).map((e) => [e.id, e.nombre]));
  const estadoConstancia = (empresaId: string) => {
    const estado = constanciaDe.get(empresaId)?.estado;
    return estado === "aprobada" ? "Aprobada" : estado === "pendiente" ? "Por revisar" : estado === "rechazada" ? "Rechazada" : "Sin subir";
  };

  // Palabras que piden revisión, por empresa: su nombre y los textos fijos de sus diseños.
  const textos = new Map<string, string[]>();
  for (const d of disenos ?? []) {
    textos.set(d.empresa_id, [...(textos.get(d.empresa_id) ?? []), ...textosDeDiseno(d)]);
  }
  const filas = (empresas ?? []).map((e) => ({
    ...e,
    alertas: palabrasSensibles([e.nombre, ...(textos.get(e.id) ?? [])]),
  }));
  const conAlerta = filas.filter((f) => f.alertas.length).length;

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-extrabold">Empresas</h1>
      {servicio ? null : (
        <p role="alert" className="rounded-tarjeta border border-rojo/30 bg-white p-4 text-sm">
          Falta configurar <code>SUPABASE_SECRET_KEY</code> en el servidor. Sin esa llave no se pueden revisar
          los diseños ni armar los PDF de impresión.
        </p>
      )}
      {conAlerta ? (
        <p className="rounded-tarjeta bg-resaltador/30 p-4 text-sm">
          <strong>
            {conAlerta === 1 ? "1 empresa necesita revisión" : `${conAlerta} empresas necesitan revisión`}
          </strong>{" "}
          porque su nombre o sus diseños mencionan autoridades, dependencias o identificaciones oficiales.
          Revísalas a mano antes de producir.
        </p>
      ) : null}

      {pendientes.length ? (
        <section className="rounded-tarjeta border border-linea bg-white p-5 sm:p-6">
          <h2 className="text-xl font-extrabold">
            {pendientes.length === 1 ? "1 constancia por revisar" : `${pendientes.length} constancias por revisar`}
          </h2>
          <p className="mt-1 text-sm text-gris">
            Comprueba que sea legible, que su fecha de emisión coincida y que el RFC y la razón social sean los
            de la empresa de la cuenta. Sin constancia aprobada, la empresa no puede hacer su primer pedido.
          </p>
          <ul className="mt-4 divide-y divide-linea">
            {pendientes.map((c) => {
              const datos = (fiscales ?? []).filter((f) => f.empresa_id === c.empresa_id);
              return (
                <li key={c.id} className="grid gap-4 py-4 lg:grid-cols-[1fr_1.2fr]">
                  <div className="min-w-0 text-sm">
                    <p className="text-base font-semibold">{nombreDe.get(c.empresa_id) ?? "Empresa"}</p>
                    <p className="text-gris">
                      Emitida el {fechaLarga(c.fecha_emision)} · subida el {fechaLarga(c.creado_en)}
                    </p>
                    <p className="mt-1">
                      {datos.length
                        ? datos.map((f) => `${f.rfc} · ${f.razon_social}`).join(" / ")
                        : "La empresa todavía no captura sus datos de facturación."}
                    </p>
                    {archivos.get(c.ruta) ? (
                      <a href={archivos.get(c.ruta)} target="_blank" rel="noopener" className="mt-2 inline-block font-semibold text-rojo underline underline-offset-4">
                        Abrir constancia
                      </a>
                    ) : (
                      <p className="mt-2 text-rojo-oscuro">No se encontró el archivo.</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <form action={revisarConstancia} className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-end">
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="decision" value="rechazar" />
                      <label className="block flex-1">
                        <span className="text-sm font-semibold">Si la rechazas, dile por qué</span>
                        <input name="motivo" required maxLength={300} placeholder="Por ejemplo: la constancia es de otra empresa" className={claseEntrada} />
                      </label>
                      <button type="submit" className={claseBotonSecundario}>Rechazar</button>
                    </form>
                    <form action={revisarConstancia}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="decision" value="aprobar" />
                      <button type="submit" className={claseBoton}>Aprobar</button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {filas.length ? (
        <div className="relative overflow-x-auto rounded-tarjeta border border-linea bg-white">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="bg-papel text-gris">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Empresa</th>
                <th scope="col" className="px-4 py-3 font-semibold">Alta</th>
                <th scope="col" className="px-4 py-3 font-semibold">Constancia</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Activos</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Diseños</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Gafetes listos</th>
                <th scope="col" className="px-4 py-3"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linea">
              {filas.map((e) => (
                <tr key={e.id}>
                  <th scope="row" className="px-4 py-3 font-semibold">
                    {e.nombre}
                    {e.alertas.length ? (
                      <span className="mt-1 block w-fit rounded-full bg-resaltador/40 px-2.5 py-0.5 text-xs font-semibold">
                        Revisar: menciona {e.alertas.join(", ")}
                      </span>
                    ) : null}
                  </th>
                  <td className="px-4 py-3 whitespace-nowrap text-gris">{fecha(e.creado_en)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{estadoConstancia(e.id)}</td>
                  <td className="px-4 py-3 text-right">{Number(e.activos).toLocaleString("es-MX")}</td>
                  <td className="px-4 py-3 text-right">{Number(e.disenos).toLocaleString("es-MX")}</td>
                  <td className="px-4 py-3 text-right">{Number(e.listos).toLocaleString("es-MX")}</td>
                  <td className="px-4 py-3 text-right">
                    {Number(e.disenos) + Number(e.listos) > 0 ? (
                      <Link href={`${RUTA_ADMIN}/imprimir/${e.id}`} className="font-semibold text-rojo underline underline-offset-4">
                        Imprimir
                      </Link>
                    ) : (
                      <span className="text-gris">Sin gafetes</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-tarjeta border border-dashed border-linea bg-white p-8 text-center font-semibold">
          Todavía no hay empresas registradas.
        </p>
      )}
    </div>
  );
}
