import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Bloque } from "@/components/cuenta/Entrada";
import { cuentas } from "@/lib/admin/clientes";
import { RUTA_ADMIN } from "@/lib/admin/ruta";
import { requerirAdmin } from "@/lib/admin/sesion";
import { columnas, leerResumen, periodoVisitas, periodosVisitas, rangoVisitas } from "@/lib/admin/visitas";
import { RUTA_QR, type Dispositivo, nombreOrigen, nombresDispositivo } from "@/lib/visitas";

export const metadata: Metadata = { title: "Visitas" };

const chip = (activo: boolean) =>
  `rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
    activo ? "border-tinta bg-tinta text-white" : "border-linea bg-white hover:border-tinta"
  }`;
const numero = (n: number) => n.toLocaleString("es-MX");
const paises = new Intl.DisplayNames(["es"], { type: "region" });
const nombrePais = (codigo: string) => {
  try {
    return (codigo && paises.of(codigo)) || "Sin dato";
  } catch {
    return codigo || "Sin dato";
  }
};

function Cifra({ nombre, valor, nota, grande = false }: { nombre: string; valor: string; nota?: ReactNode; grande?: boolean }) {
  return (
    <div className="rounded-tarjeta border border-linea bg-white p-4 sm:p-5">
      <p className="text-sm text-gris">{nombre}</p>
      <p className={`mt-1 font-semibold ${grande ? "text-4xl sm:text-5xl" : "text-2xl"}`}>{valor}</p>
      {nota ? <p className="mt-1 text-sm text-gris">{nota}</p> : null}
    </div>
  );
}

function Barra({ parte }: { parte: number }) {
  const ancho = Math.max(0, Math.min(1, parte)) * 100;
  return (
    <span aria-hidden="true" className="mt-1.5 block h-2 w-full">
      {ancho > 0 ? <span className="block h-2 min-w-1 rounded-r-full bg-tinta" style={{ width: `${ancho}%` }} /> : null}
    </span>
  );
}

/** Tabla de dos columnas con una barra bajo cada nombre. */
function Reparto({ titulo, columna, filas, vacio }: { titulo: string; columna: string; filas: { nombre: ReactNode; clave: string; valor: number }[]; vacio: string }) {
  const maximo = Math.max(...filas.map((f) => f.valor), 0);
  return (
    <Bloque titulo={titulo}>
      {filas.length ? (
        <table className="w-full text-left text-sm">
          <thead className="text-gris">
            <tr>
              <th scope="col" className="py-2 pr-4 font-semibold">{columna}</th>
              <th scope="col" className="py-2 text-right font-semibold">Visitas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linea">
            {filas.map((f) => (
              <tr key={f.clave}>
                <th scope="row" className="py-2.5 pr-4 font-normal break-all">
                  {f.nombre}
                  <Barra parte={maximo ? f.valor / maximo : 0} />
                </th>
                <td className="py-2.5 text-right align-top tabular-nums">{numero(f.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-gris">{vacio}</p>
      )}
    </Bloque>
  );
}

export default async function Visitas({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const { servicio } = await requerirAdmin();
  if (!servicio) {
    return (
      <p role="alert" className="rounded-tarjeta border border-rojo/30 bg-white p-4 text-sm">
        Falta configurar <code>SUPABASE_SECRET_KEY</code> en el servidor para ver las visitas.
      </p>
    );
  }
  const periodo = periodoVisitas((await searchParams).periodo);
  const rango = rangoVisitas(periodo.dias);
  const desde = new Date(rango.desde).toISOString();
  const hasta = new Date(rango.hasta).toISOString();
  const [resumen, personas, empresas, pedidos, pagados] = await Promise.all([
    servicio.rpc("resumen_visitas", { p_desde: desde, p_hasta: hasta }),
    cuentas(servicio),
    servicio.from("empresas").select("id", { count: "exact", head: true }).gte("creado_en", desde),
    servicio.from("pedidos").select("id", { count: "exact", head: true }).gte("creado_en", desde),
    servicio.from("pedidos").select("id", { count: "exact", head: true }).gte("pagado_en", desde),
  ]);
  if (resumen.error) {
    return (
      <div className="space-y-5">
        <h1 className="text-3xl font-extrabold">Visitas</h1>
        <p role="alert" className="rounded-tarjeta border border-rojo/30 bg-white p-4 text-sm">
          Todavía no se pueden leer las visitas. Falta aplicar la migración <code>20261123050000_visitas</code> en Supabase.
        </p>
      </div>
    );
  }
  const r = leerResumen(resumen.data);
  const cols = columnas(r.dias, rango);
  const maximo = Math.max(...cols.map((c) => c.visitas), 0);
  const cuentasNuevas = [...personas.values()].filter((p) => new Date(p.creada).getTime() >= rango.desde).length;
  const embudo = [
    { nombre: "Visitas al sitio", valor: r.visitas },
    { nombre: "Cuentas nuevas", valor: cuentasNuevas },
    { nombre: "Empresas registradas", valor: empresas.count ?? 0 },
    { nombre: "Pedidos hechos", valor: pedidos.count ?? 0 },
    { nombre: "Pedidos pagados", valor: pagados.count ?? 0 },
  ];
  const maximoEmbudo = Math.max(...embudo.map((e) => e.valor), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">Visitas</h1>
      <nav aria-label="Periodo" className="flex flex-wrap gap-2">
        {periodosVisitas.map((p) => (
          <Link
            key={p.id}
            href={`${RUTA_ADMIN}/visitas${p.id === "30" ? "" : `?periodo=${p.id}`}`}
            aria-current={p.id === periodo.id ? "page" : undefined}
            className={chip(p.id === periodo.id)}
          >
            {p.nombre}
          </Link>
        ))}
      </nav>

      <section aria-label="Resumen del periodo" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <Cifra grande nombre="Visitas" valor={numero(r.visitas)} nota={`Veces que alguien llegó al sitio ${periodo.frase}`} />
        </div>
        <Cifra
          nombre="Páginas vistas"
          valor={numero(r.vistas)}
          nota={r.visitas ? `${(r.vistas / r.visitas).toLocaleString("es-MX", { maximumFractionDigits: 1 })} por visita` : "Sin visitas todavía"}
        />
        <Cifra nombre="Escaneos de QR" valor={numero(r.escaneos)} nota="Veces que se abrió la verificación de un gafete" />
      </section>

      <Bloque titulo={periodo.dias > 31 ? "Visitas por semana" : "Visitas por día"}>
        {maximo ? (
          <>
            <div className="flex items-end gap-3">
              <p className="w-10 shrink-0 self-start text-right text-xs text-gris tabular-nums">{numero(maximo)}</p>
              <div role="img" aria-label="Visitas en el periodo. La tabla de abajo tiene las mismas cifras." className="flex h-40 flex-1 items-end gap-0.5 border-b border-linea">
                {cols.map((c) => (
                  <div key={c.clave} title={`${c.etiqueta}: ${numero(c.visitas)} ${c.visitas === 1 ? "visita" : "visitas"}`} className="flex h-full flex-1 items-end justify-center">
                    {c.visitas ? (
                      <div className="w-full max-w-6 min-h-0.5 rounded-t bg-tinta" style={{ height: `${(c.visitas / maximo) * 100}%` }} />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-1.5 flex justify-between pl-13 text-xs text-gris">
              <span>{cols[0].etiqueta}</span>
              <span>{cols[cols.length - 1].etiqueta}</span>
            </div>
            <details className="mt-4 text-sm">
              <summary className="cursor-pointer font-semibold underline underline-offset-4">Ver las cifras en tabla</summary>
              <table className="mt-3 w-full max-w-md text-left">
                <thead className="text-gris">
                  <tr>
                    <th scope="col" className="py-1.5 pr-4 font-semibold">{periodo.dias > 31 ? "Semana" : "Día"}</th>
                    <th scope="col" className="py-1.5 pr-4 text-right font-semibold">Visitas</th>
                    <th scope="col" className="py-1.5 text-right font-semibold">Páginas vistas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-linea">
                  {cols.map((c) => (
                    <tr key={c.clave}>
                      <th scope="row" className="py-1.5 pr-4 font-normal">{c.etiqueta}</th>
                      <td className="py-1.5 pr-4 text-right tabular-nums">{numero(c.visitas)}</td>
                      <td className="py-1.5 text-right tabular-nums">{numero(c.vistas)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </>
        ) : (
          <p className="text-gris">Todavía no hay visitas en este periodo. El conteo empieza cuando esta versión del sitio se publica.</p>
        )}
      </Bloque>

      <Bloque titulo="De la visita a la compra">
        <table className="w-full text-left text-sm">
          <thead className="sr-only">
            <tr>
              <th scope="col">Paso</th>
              <th scope="col">Cuántos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linea">
            {embudo.map((e) => (
              <tr key={e.nombre}>
                <th scope="row" className="py-2.5 pr-4 font-normal">
                  {e.nombre}
                  <Barra parte={maximoEmbudo ? e.valor / maximoEmbudo : 0} />
                </th>
                <td className="py-2.5 text-right align-top font-semibold tabular-nums">{numero(e.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-sm text-gris">
          Todo lo que pasó {periodo.frase}. Quien se quedó a medias está en{" "}
          <Link href={`${RUTA_ADMIN}/abandonos`} className="underline">
            Abandonos
          </Link>
          .
        </p>
      </Bloque>

      <div className="grid gap-6 lg:grid-cols-2">
        <Reparto
          titulo="De dónde llegan"
          columna="Origen"
          vacio="Sin visitas en este periodo."
          filas={r.origenes.map((o) => ({ clave: o.origen || "directo", nombre: nombreOrigen(o.origen), valor: o.visitas }))}
        />
        <Bloque titulo="Páginas más vistas">
          {r.paginas.length ? (
            <table className="w-full text-left text-sm">
              <thead className="text-gris">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-semibold">Página</th>
                  <th scope="col" className="py-2 pr-4 text-right font-semibold">Vistas</th>
                  <th scope="col" className="py-2 text-right font-semibold">Llegaron aquí</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-linea">
                {r.paginas.map((p) => (
                  <tr key={p.ruta}>
                    <th scope="row" className="py-2.5 pr-4 font-normal break-all">
                      {p.ruta === RUTA_QR ? (
                        p.ruta
                      ) : (
                        <a href={p.ruta} className="underline underline-offset-4">
                          {p.ruta === "/" ? "/ (inicio)" : p.ruta}
                        </a>
                      )}
                    </th>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{numero(p.vistas)}</td>
                    <td className="py-2.5 text-right tabular-nums">{numero(p.entradas)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gris">Sin visitas en este periodo.</p>
          )}
        </Bloque>
        <Reparto
          titulo="Con qué entran"
          columna="Dispositivo"
          vacio="Sin visitas en este periodo."
          filas={r.dispositivos.map((d) => ({
            clave: d.dispositivo,
            nombre: nombresDispositivo[d.dispositivo as Dispositivo] ?? d.dispositivo,
            valor: d.visitas,
          }))}
        />
        <Reparto
          titulo="Desde dónde"
          columna="Lugar"
          vacio="Sin visitas en este periodo."
          filas={r.lugares.map((l) => ({
            clave: `${l.pais}-${l.region}`,
            nombre: l.region ? `${l.region}, ${nombrePais(l.pais)}` : nombrePais(l.pais),
            valor: l.visitas,
          }))}
        />
      </div>

      <p className="text-sm text-gris">
        El conteo es propio y anónimo: no usa cookies ni guarda la dirección IP de nadie. No cuenta a los rastreadores, ni lo
        que pasa dentro de la plataforma o de este panel, ni a quien pide a su navegador no ser rastreado.
      </p>
    </div>
  );
}
