import type { Metadata } from "next";
import Link from "next/link";
import { guardarAviso, quitarDeAbierto } from "@/app/cuenta/pedidos/abierto/acciones";
import { Bloque, Entrada } from "@/components/cuenta/Entrada";
import { Formulario } from "@/components/cuenta/Formulario";
import { claseBoton } from "@/components/cuenta/clases";
import { requerirEmpresa } from "@/lib/cuenta/sesion";
import { pedidoAbiertoDe } from "@/lib/pedidos/abierto";
import { avisoMaximo, leerPredeterminados, razones } from "@/lib/pedidos/predeterminados";
import { pedidoMaximoPiezas } from "@/lib/pedidos/reglas";

export const metadata: Metadata = { title: "Pedido abierto" };

const liga = "font-semibold text-rojo underline underline-offset-4";
const VISIBLES = 300;

export default async function Abierto() {
  const { supabase, empresa, administra } = await requerirEmpresa();
  const { data: ajustes } = await supabase.from("empresas").select("predeterminados").eq("id", empresa.id).maybeSingle();
  const { aviso } = leerPredeterminados(ajustes?.predeterminados);
  const renglones = await pedidoAbiertoDe(supabase, empresa.id, aviso);
  const ids = renglones.slice(0, VISIBLES).map((r) => r.empleado_id);
  const { data: personas } = ids.length
    ? await supabase.from("empleados").select("id, nombre, numero_empleado, puesto").in("id", ids)
    : { data: [] };
  const porId = new Map((personas ?? []).map((p) => [p.id, p]));
  const total = renglones.length;
  const reposiciones = renglones.filter((r) => r.razon !== "alta").length;
  const avance = aviso.cantidad ? Math.min(100, Math.round((total / aviso.cantidad) * 100)) : 0;

  return (
    <div className="space-y-5">
      <p className="text-sm">
        <Link href="/cuenta/pedidos" className="underline">Pedidos</Link> / Pedido abierto
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold">Pedido abierto</h1>
        {administra && total ? (
          <Link href="/cuenta/pedidos/nuevo?abierto=1" className={claseBoton}>
            Pedir {total === 1 ? "este gafete" : `estos ${Math.min(total, pedidoMaximoPiezas).toLocaleString("es-MX")} gafetes`}
          </Link>
        ) : null}
      </div>
      <p className="max-w-2xl text-gris">
        Ve juntando altas y reposiciones conforme ocurren y pídelas todas en un solo envío. Cuando llegues a la cantidad
        que elijas, te avisamos por correo con la liga para ver tu total y confirmarlo.
      </p>

      <section className="rounded-tarjeta border border-linea bg-white p-5 sm:p-6">
        <p className="font-titulos text-3xl font-extrabold">
          {total.toLocaleString("es-MX")} {total === 1 ? "gafete" : "gafetes"}
          {aviso.cantidad ? (
            <span className="ml-2 text-lg font-semibold text-gris">de {aviso.cantidad.toLocaleString("es-MX")}</span>
          ) : null}
        </p>
        <p className="mt-1 text-sm text-gris">
          {total - reposiciones} {total - reposiciones === 1 ? "alta" : "altas"} y {reposiciones}{" "}
          {reposiciones === 1 ? "reposición" : "reposiciones"}.
          {aviso.cantidad
            ? total >= aviso.cantidad
              ? " Ya llegaste a tu cantidad: es buen momento para pedir."
              : ` Te avisamos al llegar a ${aviso.cantidad.toLocaleString("es-MX")}.`
            : " Todavía no eliges a cuántos avisarte."}
        </p>
        {aviso.cantidad ? (
          <div
            className="mt-3 h-2.5 overflow-hidden rounded-full bg-papel"
            role="progressbar"
            aria-valuenow={total}
            aria-valuemin={0}
            aria-valuemax={aviso.cantidad}
            aria-label="Avance del pedido abierto"
          >
            <div className="h-full rounded-full bg-rojo" style={{ width: `${avance}%` }} />
          </div>
        ) : null}
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <Bloque titulo="Quiénes van">
          {total ? (
            <>
              <ul className="divide-y divide-linea">
                {renglones.slice(0, VISIBLES).map((r) => {
                  const p = porId.get(r.empleado_id);
                  if (!p) return null;
                  return (
                    <li key={r.empleado_id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
                      <span className="min-w-0">
                        <Link href={`/cuenta/equipo/${p.id}`} className="font-semibold underline-offset-4 hover:underline">
                          {p.nombre || "Sin nombre"}
                        </Link>
                        <span className="block text-gris">
                          {[p.numero_empleado, p.puesto, razones[r.razon].frase].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      {r.apartado ? (
                        <form action={quitarDeAbierto}>
                          <input type="hidden" name="id" value={r.empleado_id} />
                          <button type="submit" className="text-sm underline underline-offset-4">Quitar</button>
                        </form>
                      ) : (
                        <span className="text-xs text-gris">Se sumó sola</span>
                      )}
                    </li>
                  );
                })}
              </ul>
              {total > VISIBLES ? (
                <p className="mt-2 text-sm text-gris">Se muestran {VISIBLES} de {total.toLocaleString("es-MX")}.</p>
              ) : null}
            </>
          ) : (
            <p className="text-gris">Tu pedido abierto está vacío.</p>
          )}
          <p className="mt-4 text-sm text-gris">
            Para sumar una reposición, abre a la persona en{" "}
            <Link href="/cuenta/equipo" className={liga}>Equipo</Link> y elige «Sumarlo al pedido abierto».
            {aviso.altas ? " Las altas nuevas se suman solas hasta que se pida su gafete." : ""}
          </p>
        </Bloque>

        <Bloque titulo="Aviso">
          {administra ? (
            <Formulario accion={guardarAviso} boton="Guardar aviso">
              <div className="space-y-4">
                <Entrada
                  etiqueta="Avísame cuando junte"
                  name="cantidad"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={avisoMaximo}
                  defaultValue={aviso.cantidad || ""}
                  placeholder="Por ejemplo, 10"
                  ayuda="Gafetes y credenciales. Déjalo vacío si no quieres aviso."
                />
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" name="altas" defaultChecked={aviso.altas} className="mt-0.5 size-4 accent-tinta" />
                  <span>Sumar solas a las personas nuevas que todavía no tienen gafete impreso.</span>
                </label>
              </div>
            </Formulario>
          ) : (
            <p className="text-sm text-gris">
              {aviso.cantidad
                ? `Avisamos a quien administra la empresa al juntar ${aviso.cantidad.toLocaleString("es-MX")}.`
                : "Quien administra la empresa puede elegir a cuántos avisar."}
            </p>
          )}
          <p className="mt-4 text-xs text-gris">El correo llega a quienes son dueños o administradores de la empresa.</p>
        </Bloque>
      </div>
    </div>
  );
}
