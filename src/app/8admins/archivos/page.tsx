import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { Bloque } from "@/components/cuenta/Entrada";
import { haceCuanto } from "@/lib/admin/clientes";
import { RUTA_ADMIN } from "@/lib/admin/ruta";
import { requerirAdmin } from "@/lib/admin/sesion";
import { CATEGORIAS, moderacion, moderacionActiva } from "@/lib/seguridad/moderacion";
import { revisarHuerfanos } from "@/lib/seguridad/revisar";
import { decidirArchivo, revisarPendientes } from "./acciones";

export const metadata: Metadata = { title: "Archivos" };

const ORIGEN: Record<string, string> = {
  foto: "Foto de gafete",
  liga: "Foto mandada por su liga",
  diseno: "Imagen de diseño",
  gafete: "Gafete ya diseñado",
  verificacion: "Verificación (INE, constancia o negocio)",
};
const boton = "rounded-full px-4 py-2 text-sm font-semibold";

export default async function Archivos() {
  const { servicio } = await requerirAdmin();
  if (!servicio) {
    return (
      <p role="alert" className="rounded-tarjeta border border-rojo/30 bg-white p-4 text-sm">
        Falta configurar <code>SUPABASE_SECRET_KEY</code> en el servidor para ver los archivos.
      </p>
    );
  }
  // Cada vez que se abre, revisa en segundo plano lo que se haya subido sin pasar por el sitio.
  after(() => revisarHuerfanos(30));

  const inicioMes = new Date();
  inicioMes.setUTCDate(1);
  inicioMes.setUTCHours(0, 0, 0, 0);
  const [{ data: retenidos }, { data: rechazados }, { count: revisadasMes }, { data: empresas }] = await Promise.all([
    servicio.from("revision_archivos").select("*").eq("estado", "retenido").order("creado_en", { ascending: false }).limit(100),
    servicio.from("revision_archivos").select("*").eq("estado", "rechazado").order("revisado_en", { ascending: false }).limit(20),
    servicio
      .from("revision_archivos")
      .select("id", { count: "exact", head: true })
      .not("modelo", "is", null)
      .gte("revisado_en", inicioMes.toISOString()),
    servicio.from("empresas").select("id, nombre").limit(20000),
  ]);
  const nombreDe = new Map((empresas ?? []).map((e) => [e.id, e.nombre]));
  const lista = retenidos ?? [];
  const ligas = new Map<string, string>();
  await Promise.all(
    lista.map(async (f) => {
      const { data } = await servicio.storage.from(f.bucket).createSignedUrl(f.ruta, 600);
      if (data?.signedUrl) ligas.set(f.id, data.signedUrl);
    }),
  );
  const costo = ((revisadasMes ?? 0) * 0.0003).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">Archivos</h1>
        <p className="mt-1 text-gris">
          Fotos, diseños y documentos que la revisión automática marcó. Nada se usa para imprimir hasta que decidas.
        </p>
        <p className="mt-2 text-sm text-gris">
          {moderacionActiva()
            ? `Revisadas este mes: ${(revisadasMes ?? 0).toLocaleString("es-MX")} de ${moderacion.topeMensual.toLocaleString("es-MX")} (≈ USD ${costo}).`
            : "La revisión automática de imágenes está apagada: falta ANTHROPIC_API_KEY. El tipo real de cada archivo sí se revisa."}
        </p>
      </div>

      <Bloque titulo={lista.length ? `Por decidir: ${lista.length}` : "Por decidir"}>
        {lista.length ? (
          <ul className="divide-y divide-linea">
            {lista.map((f) => {
              const url = ligas.get(f.id);
              const esPdf = f.tipo_real === "pdf";
              return (
                <li key={f.id} className="flex flex-col gap-4 py-4 sm:flex-row sm:items-start">
                  <div className="w-full shrink-0 sm:w-40">
                    {url && !esPdf ? (
                      <a href={url} target="_blank" rel="noreferrer" className="group block overflow-hidden rounded-tarjeta-chica bg-papel" title="Abrir sin desenfoque">
                        {/* eslint-disable-next-line @next/next/no-img-element -- liga temporal de almacenamiento privado */}
                        <img src={url} alt="" className="aspect-[3/4] w-full object-cover blur-xl transition group-hover:blur-sm" />
                      </a>
                    ) : (
                      <div className="flex aspect-[3/4] items-center justify-center rounded-tarjeta-chica bg-papel text-sm text-gris">
                        {url ? <a href={url} target="_blank" rel="noreferrer" className="underline">Abrir PDF</a> : "Ya no existe"}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-semibold">{ORIGEN[f.origen ?? ""] ?? f.bucket}</p>
                    <p className="text-gris">
                      {f.empresa_id ? (
                        <Link href={`${RUTA_ADMIN}/clientes/${f.empresa_id}`} className="underline underline-offset-4">
                          {nombreDe.get(f.empresa_id) ?? "Empresa"}
                        </Link>
                      ) : (
                        "Sin empresa"
                      )}{" "}
                      · {haceCuanto(f.creado_en)}
                    </p>
                    {f.categorias.length ? (
                      <ul className="mt-2 flex flex-wrap gap-1">
                        {f.categorias.map((c) => (
                          <li key={c} className="rounded-full bg-rojo/10 px-3 py-1 text-xs font-semibold text-rojo-oscuro">
                            {CATEGORIAS[c as keyof typeof CATEGORIAS] ?? c}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {f.motivo ? <p className="mt-2">{f.motivo}</p> : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <form action={decidirArchivo}>
                        <input type="hidden" name="id" value={f.id} />
                        <input type="hidden" name="decision" value="aprobar" />
                        <button type="submit" className={`${boton} border border-tinta hover:bg-papel`}>Está bien, aprobar</button>
                      </form>
                      <form action={decidirArchivo}>
                        <input type="hidden" name="id" value={f.id} />
                        <input type="hidden" name="decision" value="rechazar" />
                        <button type="submit" className={`${boton} bg-rojo text-white hover:bg-rojo-oscuro`}>Rechazar y borrar</button>
                      </form>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-gris">No hay nada retenido.</p>
        )}
        <form action={revisarPendientes} className="mt-4">
          <button type="submit" className="text-sm underline underline-offset-4">
            Revisar ahora lo que falte por revisar
          </button>
        </form>
      </Bloque>

      <Bloque titulo="Rechazados recientes">
        {rechazados?.length ? (
          <ul className="divide-y divide-linea text-sm">
            {rechazados.map((f) => (
              <li key={f.id} className="py-2.5">
                <span className="font-semibold">{ORIGEN[f.origen ?? ""] ?? f.bucket}</span>
                {" · "}
                {f.empresa_id ? nombreDe.get(f.empresa_id) ?? "Empresa" : "Sin empresa"}
                {" · "}
                <span className="text-gris">{haceCuanto(f.revisado_en ?? f.creado_en)}</span>
                {f.motivo ? <span className="block text-gris">{f.motivo}</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gris">Nada rechazado todavía.</p>
        )}
      </Bloque>
    </div>
  );
}
