import type { Metadata } from "next";
import Link from "next/link";
import { palabrasSensibles, textosDeDiseno } from "@/lib/admin/alertas";
import { requerirAdmin } from "@/lib/admin/sesion";

export const metadata: Metadata = { title: "Empresas" };

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Hermosillo" });

export default async function Admin() {
  const { supabase, servicio } = await requerirAdmin();
  const [{ data: empresas }, { data: disenos }] = await Promise.all([
    supabase.rpc("admin_empresas"),
    servicio
      ? servicio.from("disenos").select("empresa_id, nombre, frente, vuelta").limit(5000)
      : Promise.resolve({ data: null }),
  ]);

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

      {filas.length ? (
        <div className="relative overflow-x-auto rounded-tarjeta border border-linea bg-white">
          <table className="w-full min-w-[42rem] text-left text-sm">
            <thead className="bg-papel text-gris">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Empresa</th>
                <th scope="col" className="px-4 py-3 font-semibold">Alta</th>
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
                  <td className="px-4 py-3 text-right">{Number(e.activos).toLocaleString("es-MX")}</td>
                  <td className="px-4 py-3 text-right">{Number(e.disenos).toLocaleString("es-MX")}</td>
                  <td className="px-4 py-3 text-right">{Number(e.listos).toLocaleString("es-MX")}</td>
                  <td className="px-4 py-3 text-right">
                    {Number(e.disenos) + Number(e.listos) > 0 ? (
                      <Link href={`/admin/imprimir/${e.id}`} className="font-semibold text-rojo underline underline-offset-4">
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
