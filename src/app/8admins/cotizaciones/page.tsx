import type { Metadata } from "next";
import { Bloque } from "@/components/cuenta/Entrada";
import { requerirAdmin } from "@/lib/admin/sesion";
import { pesos } from "@/lib/precios";

export const metadata: Metadata = { title: "Cotizaciones" };

const numero = (n: number) => n.toLocaleString("es-MX");
const fecha = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Hermosillo",
});
const modalidades: Record<string, string> = { impreso: "Impreso", digital: "Digital", ambos: "Impreso y digital" };

/** De dónde llegó: la búsqueda del anuncio, o la fuente de la liga, o directo. */
function procedencia(c: { origen: string | null; medio: string | null; termino: string | null }) {
  if (c.termino) return c.termino;
  if (c.origen) return c.medio ? `${c.origen} (${c.medio})` : c.origen;
  return "Sin anuncio";
}

export default async function Cotizaciones() {
  const { servicio } = await requerirAdmin();
  if (!servicio) {
    return (
      <p role="alert" className="rounded-tarjeta border border-rojo/30 bg-white p-4 text-sm">
        Falta configurar <code>SUPABASE_SECRET_KEY</code> en el servidor para ver las cotizaciones.
      </p>
    );
  }
  const { data, error } = await servicio
    .from("cotizaciones")
    .select("en, folio, canal, correo, empresa, piezas, modalidad, dos_caras, paquete, total, origen, medio, termino, entrada, dispositivo")
    .order("en", { ascending: false })
    .limit(500);
  if (error) {
    return (
      <div className="space-y-5">
        <h1 className="text-3xl font-extrabold">Cotizaciones</h1>
        <p role="alert" className="rounded-tarjeta border border-rojo/30 bg-white p-4 text-sm">
          Todavía no se pueden leer las cotizaciones. Falta aplicar la migración <code>20261127000000_cotizaciones</code> en Supabase.
        </p>
      </div>
    );
  }
  const filas = data ?? [];

  const grupos = new Map<string, { cotizaciones: number; correos: number; piezas: number; total: number }>();
  for (const c of filas) {
    const clave = procedencia(c);
    const g = grupos.get(clave) ?? { cotizaciones: 0, correos: 0, piezas: 0, total: 0 };
    g.cotizaciones += 1;
    if (c.canal === "correo") g.correos += 1;
    g.piezas += c.piezas;
    g.total += Number(c.total);
    grupos.set(clave, g);
  }
  const resumen = [...grupos.entries()].sort((a, b) => b[1].cotizaciones - a[1].cotizaciones);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">Cotizaciones</h1>
        <p className="mt-1 text-gris">
          Cada cotización que se descarga en PDF o se pide por correo, con la búsqueda del anuncio que la trajo. Las de PDF no
          tienen correo: solo las pedidas por correo se pueden seguir.
        </p>
      </div>

      <Bloque titulo="Por búsqueda o fuente">
        {resumen.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-gris">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-semibold">Búsqueda o fuente</th>
                  <th scope="col" className="py-2 pr-4 text-right font-semibold">Cotizaciones</th>
                  <th scope="col" className="py-2 pr-4 text-right font-semibold">Por correo</th>
                  <th scope="col" className="py-2 pr-4 text-right font-semibold">Piezas</th>
                  <th scope="col" className="py-2 text-right font-semibold">Total cotizado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-linea">
                {resumen.map(([clave, g]) => (
                  <tr key={clave}>
                    <th scope="row" className="py-2.5 pr-4 font-normal break-all">{clave}</th>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{numero(g.cotizaciones)}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{numero(g.correos)}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{numero(g.piezas)}</td>
                    <td className="py-2.5 text-right tabular-nums">{pesos(g.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gris">Todavía no hay cotizaciones guardadas.</p>
        )}
      </Bloque>

      {filas.length ? (
        <Bloque titulo={`Últimas ${numero(filas.length)}`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-left text-sm">
              <thead className="text-gris">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-semibold">Fecha</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Folio</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Quién</th>
                  <th scope="col" className="py-2 pr-4 text-right font-semibold">Piezas</th>
                  <th scope="col" className="py-2 pr-4 font-semibold">Modalidad</th>
                  <th scope="col" className="py-2 pr-4 text-right font-semibold">Total</th>
                  <th scope="col" className="py-2 font-semibold">Llegó por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-linea">
                {filas.map((c) => (
                  <tr key={c.folio} className="align-top">
                    <td className="py-2.5 pr-4 whitespace-nowrap">{fecha.format(new Date(c.en))}</td>
                    <td className="py-2.5 pr-4 font-mono whitespace-nowrap">{c.folio}</td>
                    <td className="py-2.5 pr-4 break-all">
                      {c.correo ? (
                        <a className="underline" href={`mailto:${c.correo}?subject=${encodeURIComponent(`Tu cotización ${c.folio}`)}`}>
                          {c.correo}
                        </a>
                      ) : (
                        <span className="text-gris">PDF</span>
                      )}
                      {c.empresa ? <span className="block text-gris">{c.empresa}</span> : null}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{numero(c.piezas)}</td>
                    <td className="py-2.5 pr-4">
                      {c.paquete ? `Paquete de ${numero(c.paquete)}` : modalidades[c.modalidad] ?? c.modalidad}
                      {c.dos_caras ? <span className="block text-gris">Dos caras</span> : null}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{pesos(Number(c.total))}</td>
                    <td className="py-2.5 break-all">
                      {procedencia(c)}
                      {c.dispositivo ? <span className="block text-gris">{c.dispositivo}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Bloque>
      ) : null}
    </div>
  );
}
