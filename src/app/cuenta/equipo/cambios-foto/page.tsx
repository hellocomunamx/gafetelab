import type { Metadata } from "next";
import Link from "next/link";
import { Bloque, Chips, Entrada } from "@/components/cuenta/Entrada";
import { Formulario } from "@/components/cuenta/Formulario";
import { claseEntrada } from "@/components/cuenta/clases";
import { RUTA_AVISOS } from "@/lib/avisos/tipos";
import { ligasDeFotos } from "@/lib/cuenta/fotos";
import { IMPRESO_VIGENTE, pesos, REQUISITOS, reposicionDe } from "@/lib/cuenta/reposicion";
import { requerirEmpresa } from "@/lib/cuenta/sesion";
import { site } from "@/lib/site";
import { aprobarCambioFoto, guardarReposicion, rechazarCambioFoto } from "./acciones";

export const metadata: Metadata = { title: "Cambios de foto" };

const POR_REVISAR = 30;
const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Hermosillo" });

/* eslint-disable @next/next/no-img-element -- ligas temporales de almacenamiento privado */
function Foto({ src, etiqueta, nueva = false }: { src?: string; etiqueta: string; nueva?: boolean }) {
  return (
    <figure className="min-w-0 flex-1 text-center">
      {src ? (
        <img src={src} alt={etiqueta} width={150} height={200} className={`mx-auto aspect-[3/4] w-full max-w-40 rounded-tarjeta-chica object-cover ${nueva ? "ring-4 ring-resaltador" : ""}`} />
      ) : (
        <div className="mx-auto flex aspect-[3/4] w-full max-w-40 items-center justify-center rounded-tarjeta-chica bg-papel text-xs text-gris">Sin foto</div>
      )}
      <figcaption className="mt-1.5 text-xs font-semibold text-gris">{etiqueta}</figcaption>
    </figure>
  );
}

export default async function CambiosFoto() {
  const { supabase, empresa, administra } = await requerirEmpresa();
  const [{ data: pendientes, count }, { data: resueltas }, { data: ajuste }] = await Promise.all([
    supabase
      .from("solicitudes_foto")
      .select("id, empleado_id, foto_path, con_impreso, creado_en, empleados(nombre, foto_path)", { count: "exact" })
      .eq("empresa_id", empresa.id)
      .eq("estado", "pendiente")
      .order("creado_en")
      .limit(POR_REVISAR),
    supabase
      .from("solicitudes_foto")
      .select("id, empleado_id, estado, motivo, foto_anterior_path, reposicion_apartada, resuelto_en, empleados(nombre, foto_path)")
      .eq("empresa_id", empresa.id)
      .in("estado", ["aprobada", "rechazada"])
      .order("resuelto_en", { ascending: false })
      .limit(10),
    supabase.from("empresas").select("reposicion").eq("id", empresa.id).maybeSingle(),
  ]);
  type Persona = { nombre: string; foto_path: string | null } | null;
  const personaDe = (fila: { empleados: unknown }) => fila.empleados as Persona;

  // Quién tiene hoy un gafete impreso vigente, para ofrecer su reposición.
  const ids = (pendientes ?? []).map((p) => p.empleado_id);
  const { data: impresos } = ids.length
    ? await supabase.from("gafetes").select("empleado_id").in("empleado_id", ids).eq("tipo", "impreso").in("estado", IMPRESO_VIGENTE)
    : { data: [] };
  const conImpreso = new Set((impresos ?? []).map((g) => g.empleado_id));
  const fotos = await ligasDeFotos(supabase, [
    ...(pendientes ?? []).flatMap((p) => [p.foto_path, personaDe(p)?.foto_path ?? null]),
    ...(resueltas ?? []).flatMap((r) => [r.foto_anterior_path, r.estado === "aprobada" ? (personaDe(r)?.foto_path ?? null) : null]),
  ]);
  const reposicion = reposicionDe(ajuste?.reposicion);
  const total = count ?? pendientes?.length ?? 0;

  return (
    <div className="space-y-5">
      <p className="text-sm"><Link href="/cuenta/equipo" className="underline">Equipo</Link> / Cambios de foto</p>
      <div>
        <h1 className="text-3xl font-extrabold">Cambios de foto</h1>
        <p className="mt-2 max-w-3xl text-gris">
          Quien tiene gafete digital puede pedir cambiar su foto desde su celular, como una foto de perfil. Nada cambia
          hasta que tú lo apruebas. Quien solo tiene gafete impreso no ve esta opción: lo arregla directamente contigo.
        </p>
        <p className="mt-2 text-sm">
          <Link href={RUTA_AVISOS} className="font-semibold underline underline-offset-4">Elige cómo te avisamos por correo</Link>
          <span className="text-gris"> · al momento, en un resumen semanal o nunca.</span>
        </p>
      </div>

      <Bloque titulo={`Por revisar${total ? ` (${total.toLocaleString("es-MX")})` : ""}`}>
        {pendientes?.length ? (
          <ul className="grid gap-4 lg:grid-cols-2">
            {pendientes.map((p) => {
              const persona = personaDe(p);
              const impreso = conImpreso.has(p.empleado_id);
              return (
                <li key={p.id} className="rounded-tarjeta-chica border border-linea p-4">
                  <p className="font-semibold">
                    <Link href={`/cuenta/equipo/${p.empleado_id}`} className="hover:underline">{persona?.nombre ?? "Persona"}</Link>
                  </p>
                  <p className="text-xs text-gris">Lo pidió el {fechaHora(p.creado_en)}</p>
                  <div className="mt-3 flex items-start gap-3">
                    <Foto src={persona?.foto_path ? fotos.get(persona.foto_path) : undefined} etiqueta="Anterior" />
                    <span aria-hidden className="mt-16 text-2xl text-gris">→</span>
                    <Foto src={p.foto_path ? fotos.get(p.foto_path) : undefined} etiqueta="Nueva" nueva />
                  </div>
                  <Formulario accion={aprobarCambioFoto} boton="Aprobar foto" className="mt-4">
                    <input type="hidden" name="id" value={p.id} />
                    {impreso ? (
                      <div className="rounded-tarjeta-chica bg-resaltador/20 p-3">
                        <p className="mb-2 text-sm">
                          <strong>También tiene gafete impreso.</strong> Con la foto nueva, su impreso ya no coincide.
                          {p.con_impreso ? " Ya aceptó que necesita uno nuevo." : ""}
                        </p>
                        <Chips
                          etiqueta="¿Su gafete impreso?"
                          name="reponer"
                          inicial="si"
                          opciones={[
                            { valor: "si", texto: "Sumar reposición al pedido abierto" },
                            { valor: "no", texto: "Sin reimprimir por ahora" },
                          ]}
                        />
                      </div>
                    ) : null}
                  </Formulario>
                  <details className="mt-3 text-sm">
                    <summary className="cursor-pointer font-semibold text-rojo-oscuro underline underline-offset-4">Pedirle otra foto</summary>
                    <Formulario accion={rechazarCambioFoto} boton="No aprobar" className="mt-2 rounded-tarjeta-chica bg-papel p-3">
                      <input type="hidden" name="id" value={p.id} />
                      <Entrada etiqueta="¿Por qué?" name="motivo" required maxLength={300} placeholder="Por ejemplo: la foto está oscura o trae lentes oscuros." ayuda="Lo verá en su gafete digital, junto con un botón para mandar otra." />
                    </Formulario>
                  </details>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-gris">No hay cambios de foto por revisar.</p>
        )}
      </Bloque>

      {resueltas?.length ? (
        <Bloque titulo="Resueltos hace poco">
          <ul className="divide-y divide-linea">
            {resueltas.map((r) => {
              const persona = personaDe(r);
              const antes = r.foto_anterior_path ? fotos.get(r.foto_anterior_path) : undefined;
              const despues = r.estado === "aprobada" && persona?.foto_path ? fotos.get(persona.foto_path) : undefined;
              return (
                <li key={r.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  {r.estado === "aprobada" ? (
                    <div className="flex shrink-0 items-center gap-1">
                      {antes ? <img src={antes} alt="Antes" width={36} height={48} className="aspect-[3/4] w-9 rounded object-cover opacity-60" /> : null}
                      {despues ? <img src={despues} alt="Ahora" width={36} height={48} className="aspect-[3/4] w-9 rounded object-cover" /> : null}
                    </div>
                  ) : null}
                  <div className="min-w-0 text-sm">
                    <p className="font-semibold">
                      <Link href={`/cuenta/equipo/${r.empleado_id}`} className="hover:underline">{persona?.nombre ?? "Persona"}</Link>
                      <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${r.estado === "aprobada" ? "bg-[#dff3ea] text-[#0a5c3b]" : "bg-rojo/10 text-rojo-oscuro"}`}>
                        {r.estado === "aprobada" ? "Aprobada" : "No aprobada"}
                      </span>
                    </p>
                    <p className="text-gris">
                      {r.resuelto_en ? fechaHora(r.resuelto_en) : ""}
                      {r.estado === "aprobada" && r.reposicion_apartada ? " · reposición en el pedido abierto" : ""}
                      {r.estado === "rechazada" && r.motivo ? ` · ${r.motivo}` : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Bloque>
      ) : null}

      <Bloque titulo="Reposición del gafete impreso">
        <p className="max-w-3xl text-sm text-gris">
          Esto ve quien tiene gafete digital e impreso antes de pedir el cambio: que necesitará un impreso nuevo, cuánto le
          cuesta y qué te tiene que entregar. El cobro es entre tú y tu persona (en efectivo, por nómina, como
          acostumbres): {site.nombre} no lo cobra ni lo recibe. A ti la reposición te cuesta como cualquier gafete de tu
          pedido.
        </p>
        {administra ? (
          <Formulario accion={guardarReposicion} boton="Guardar" className="mt-4">
            <div className="space-y-4">
              <label className="block max-w-48">
                <span className="text-sm font-semibold">Costo para la persona</span>
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3.5 mt-0.75 -translate-y-1/2 text-gris">$</span>
                  <input name="costo" inputMode="numeric" defaultValue={reposicion.costo || ""} placeholder="0" className={`${claseEntrada} pl-7`} />
                </div>
                <span className="mt-1 block text-xs text-gris">En pesos. Vacío o 0: sin costo.</span>
              </label>
              <fieldset>
                <legend className="text-sm font-semibold">Qué le pides</legend>
                <div className="mt-2 space-y-2">
                  {Object.entries(REQUISITOS).map(([clave, texto]) => (
                    <label key={clave} className="flex items-start gap-3 text-sm">
                      <input type="checkbox" name="requisitos" value={clave} defaultChecked={reposicion.requisitos.includes(clave as keyof typeof REQUISITOS)} className="mt-0.5 size-4 shrink-0 accent-rojo" />
                      <span>{texto}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <Entrada etiqueta="Algo más que deba saber (opcional)" name="nota" maxLength={300} defaultValue={reposicion.nota} placeholder="Por ejemplo: entrégalo en Recursos Humanos, de 9 a 2." />
            </div>
          </Formulario>
        ) : (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            <li>{reposicion.costo ? `Costo para la persona: ${pesos(reposicion.costo)}` : "Sin costo para la persona"}</li>
            {reposicion.requisitos.map((r) => <li key={r}>{REQUISITOS[r]}</li>)}
            {reposicion.nota ? <li>{reposicion.nota}</li> : null}
          </ul>
        )}
      </Bloque>
    </div>
  );
}
