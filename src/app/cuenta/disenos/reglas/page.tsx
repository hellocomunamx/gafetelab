import type { Metadata } from "next";
import Link from "next/link";
import { borrarRegla, moverRegla } from "@/app/cuenta/disenos/reglas/acciones";
import { Bloque } from "@/components/cuenta/Entrada";
import { NuevaRegla } from "@/components/cuenta/NuevaRegla";
import { camposDe } from "@/lib/cuenta/consultas";
import { requerirEmpresa } from "@/lib/cuenta/sesion";
import { datosDePersona } from "@/lib/diseno/datos";
import { camposParaReglas, disenoPorReglas, type ReglaDiseno } from "@/lib/diseno/reglas";
import { pedidoMaximoPiezas } from "@/lib/pedidos/reglas";

export const metadata: Metadata = { title: "Diseños por reglas" };

const liga = "font-semibold text-rojo underline underline-offset-4";

export default async function Reglas() {
  const { supabase, empresa } = await requerirEmpresa();
  const [campos, { data: disenos }, { data: reglas }, { data: equipo }] = await Promise.all([
    camposDe(supabase, empresa.id),
    supabase.from("disenos").select("id, nombre").eq("empresa_id", empresa.id).order("predeterminado", { ascending: false }).order("creado_en"),
    supabase.from("reglas_diseno").select("id, campo, valor, diseno_id, orden").eq("empresa_id", empresa.id).order("orden").order("creado_en"),
    supabase
      .from("empleados")
      .select("nombre, numero_empleado, puesto, departamento, tipo_contrato, datos")
      .eq("empresa_id", empresa.id)
      .eq("estatus", "activo")
      .limit(pedidoMaximoPiezas),
  ]);
  const disponibles = camposParaReglas(campos);
  const etiquetaDe = new Map(disponibles.map((c) => [c.clave, c.etiqueta]));
  const nombreDe = new Map((disenos ?? []).map((d) => [d.id, d.nombre]));
  const predeterminado = disenos?.[0];

  // Valores que ya usa el equipo, para sugerirlos, y cuántas personas llevan cada diseño.
  const valores: Record<string, Set<string>> = {};
  const cuantos = new Map<string, number>();
  for (const p of equipo ?? []) {
    const v = datosDePersona(p, campos);
    for (const c of disponibles) {
      if (v[c.clave]) (valores[c.clave] ??= new Set()).add(v[c.clave]);
    }
    const d = disenoPorReglas(v, (reglas ?? []) as ReglaDiseno[], predeterminado?.id ?? null);
    if (d) cuantos.set(d, (cuantos.get(d) ?? 0) + 1);
  }
  const sugerencias = Object.fromEntries(
    Object.entries(valores).map(([k, s]) => [k, [...s].sort((a, b) => a.localeCompare(b, "es")).slice(0, 50)]),
  );

  return (
    <div className="space-y-5">
      <p className="text-sm">
        <Link href="/cuenta/disenos" className="underline">Diseños</Link> / Diseños por reglas
      </p>
      <h1 className="text-3xl font-extrabold">Diseños por reglas</h1>
      <p className="max-w-2xl text-gris">
        Usa un diseño distinto según el puesto, el departamento, el tipo de contrato o cualquier campo tuyo, como la
        sucursal. Al pedir, cada persona recibe el que le toca; quien no coincide con ninguna regla lleva tu diseño
        predeterminado{predeterminado ? ` (${predeterminado.nombre})` : ""}.
      </p>

      {(disenos?.length ?? 0) < 2 ? (
        <Bloque>
          <p className="font-semibold">Necesitas al menos dos diseños para usar reglas.</p>
          <p className="mt-1 text-gris">
            Por ejemplo, uno para planta y otro para visitantes.{" "}
            <Link href="/cuenta/disenos/nuevo" className={liga}>Crear otro diseño</Link>
          </p>
        </Bloque>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-start">
          <Bloque titulo="Tus reglas">
            {reglas?.length ? (
              <ol className="divide-y divide-linea">
                {reglas.map((r, i) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                    <span>
                      <span className="mr-2 text-gris">{i + 1}.</span>
                      Si su <strong>{(etiquetaDe.get(r.campo) ?? r.campo).toLowerCase()}</strong> es <strong>{r.valor}</strong>, lleva{" "}
                      <strong>{nombreDe.get(r.diseno_id) ?? "un diseño que ya no existe"}</strong>
                    </span>
                    <span className="flex items-center gap-3">
                      {i > 0 ? (
                        <form action={moverRegla}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="hacia" value="arriba" />
                          <button type="submit" aria-label="Subir esta regla" className="underline underline-offset-4">Subir</button>
                        </form>
                      ) : null}
                      <form action={borrarRegla}>
                        <input type="hidden" name="id" value={r.id} />
                        <button type="submit" className="font-semibold text-rojo-oscuro underline underline-offset-4">Quitar</button>
                      </form>
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-gris">Todavía no tienes reglas: todo tu equipo lleva tu diseño predeterminado.</p>
            )}
            {(reglas?.length ?? 0) > 1 ? (
              <p className="mt-3 text-xs text-gris">Si una persona coincide con dos reglas, gana la de más arriba.</p>
            ) : null}

            <h3 className="mt-6 border-t border-linea pt-5 font-titulos text-lg font-bold">Agregar una regla</h3>
            <div className="mt-3">
              <NuevaRegla campos={disponibles} valores={sugerencias} disenos={(disenos ?? []).map(({ id, nombre }) => ({ id, nombre }))} />
            </div>
          </Bloque>

          <Bloque titulo="Así queda tu equipo">
            <ul className="space-y-2 text-sm">
              {(disenos ?? []).map((d) => (
                <li key={d.id} className="flex justify-between gap-3">
                  <Link href={`/cuenta/disenos/${d.id}`} className="underline-offset-4 hover:underline">
                    {d.nombre}
                    {d.id === predeterminado?.id ? <span className="ml-1 text-gris">(predeterminado)</span> : null}
                  </Link>
                  <span className="font-semibold">
                    {(cuantos.get(d.id) ?? 0).toLocaleString("es-MX")} {cuantos.get(d.id) === 1 ? "persona" : "personas"}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-gris">
              Al hacer tu pedido elige «Cada quien con su diseño» y verás la muestra de cada uno.{" "}
              <Link href="/cuenta/pedidos/ajustes" className={liga}>Dejarlo como predeterminado</Link>
            </p>
          </Bloque>
        </div>
      )}
    </div>
  );
}
