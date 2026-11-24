import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { NuevoPedido, type FuenteVista } from "@/components/cuenta/NuevoPedido";
import { GafeteSvg } from "@/components/diseno/GafeteSvg";
import { constanciaDe, puedePedir } from "@/lib/cuenta/constancia";
import { ligasDe } from "@/lib/cuenta/fotos";
import { requerirEmpresa } from "@/lib/cuenta/sesion";
import { rutasDe } from "@/lib/diseno/limpiar";
import { materiales } from "@/lib/materiales";
import { pedidoAbiertoDe } from "@/lib/pedidos/abierto";
import { esRazon, leerPredeterminados, type Razon } from "@/lib/pedidos/predeterminados";
import { type FuenteDePedido, prepararPedido } from "@/lib/pedidos/preparar";
import { saldoDe } from "@/lib/pedidos/servidor";
import { stripeActivo } from "@/lib/stripe";
import { clienteServicio } from "@/lib/supabase/publico";
import { categoriasDe, hoyIso } from "@/lib/eventos";

export const metadata: Metadata = { title: "Hacer un pedido" };

const Aviso = ({ children }: { children: ReactNode }) => (
  <div className="rounded-tarjeta border border-linea bg-white p-6 sm:p-8">{children}</div>
);
const liga = "font-semibold text-rojo underline underline-offset-4";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Nuevo({
  searchParams,
}: {
  searchParams: Promise<{ personas?: string; razon?: string; abierto?: string }>;
}) {
  const { supabase, empresa, administra } = await requerirEmpresa();
  const q = await searchParams;
  const encabezado = (
    <>
      <p className="text-sm">
        <Link href="/cuenta/pedidos" className="underline">Pedidos</Link> / Hacer un pedido
      </p>
      <h1 className="text-3xl font-extrabold">Hacer un pedido</h1>
    </>
  );

  if (!administra) {
    return (
      <div className="space-y-5">
        {encabezado}
        <Aviso>
          <p className="font-semibold">Solo quien es dueño o administrador de la empresa puede hacer pedidos.</p>
          <p className="mt-1 text-gris">
            Tú puedes dejar listo al equipo y los diseños. Para pedir, avísale a alguien con ese rol en{" "}
            <Link href="/cuenta/usuarios" className={liga}>Usuarios</Link>.
          </p>
        </Aviso>
      </div>
    );
  }

  const [constancia, preparado, { data: direcciones }, { data: fiscales }, { data: ajustes }] = await Promise.all([
    constanciaDe(supabase, empresa.id),
    prepararPedido(supabase, empresa),
    supabase.from("direcciones").select("*").eq("empresa_id", empresa.id).order("predeterminada", { ascending: false }).order("creado_en"),
    supabase.from("datos_fiscales").select("*").eq("empresa_id", empresa.id).order("predeterminado", { ascending: false }).order("creado_en"),
    supabase.from("empresas").select("predeterminados").eq("id", empresa.id).maybeSingle(),
  ]);
  const { personas, fuentes, etiquetas } = preparado;
  const predeterminados = leerPredeterminados(ajustes?.predeterminados);

  // ¿Viene a pedir algo en particular? Una reposición desde la ficha de la persona o su pedido abierto.
  let preseleccion: { personas: string[]; razones: Record<string, Razon>; origen: "reposicion" | "abierto" } | null = null;
  if (q.abierto) {
    const renglones = await pedidoAbiertoDe(supabase, empresa.id, predeterminados.aviso);
    preseleccion = {
      personas: renglones.map((r) => r.empleado_id),
      razones: Object.fromEntries(renglones.map((r) => [r.empleado_id, r.razon])),
      origen: "abierto",
    };
  } else if (q.personas) {
    const ids = q.personas.split(",").filter((id) => UUID.test(id)).slice(0, 500);
    const razon = esRazon(q.razon) ? q.razon : null;
    preseleccion = { personas: ids, razones: razon ? Object.fromEntries(ids.map((id) => [id, razon])) : {}, origen: "reposicion" };
  }

  let falta: ReactNode = null;
  if (!stripeActivo() || !clienteServicio()) {
    falta = (
      <>
        <p className="font-semibold">Los pedidos en línea se activan muy pronto.</p>
        <p className="mt-1 text-gris">
          Mientras, deja listo a tu equipo y tu diseño. Si te urge, escríbenos desde{" "}
          <Link href="/contacto" className={liga}>contacto</Link> y lo resolvemos.
        </p>
      </>
    );
  } else if (!puedePedir(constancia)) {
    falta = (
      <>
        <p className="font-semibold">
          {constancia?.estado === "pendiente"
            ? "La verificación de tu empresa está en revisión."
            : constancia?.estado === "retirada"
              ? "Quitamos la verificación de tu empresa. Para pedir, verifícala otra vez."
              : "Antes de tu primer pedido necesitamos verificar tu empresa."}
        </p>
        <p className="mt-1 text-gris">
          {constancia?.estado === "pendiente"
            ? "En cuanto la aprobemos vas a poder pedir. Normalmente tarda menos de un día hábil."
            : "Así comprobamos que los gafetes y credenciales son de tu empresa. Con RFC o sin RFC, y solo una vez."}{" "}
          <Link href="/cuenta/verificacion" className={liga}>
            {constancia?.estado === "pendiente" ? "Ver mi verificación" : "Verificar mi empresa"}
          </Link>
        </p>
      </>
    );
  } else if (!personas.length) {
    falta = (
      <>
        <p className="font-semibold">Todavía no tienes personas activas en tu equipo.</p>
        <p className="mt-1 text-gris">
          Súbelas con tu plantilla de Excel o una por una.{" "}
          <Link href="/cuenta/equipo/importar" className={liga}>Subir a mi equipo</Link>
        </p>
      </>
    );
  } else if (!fuentes.length) {
    falta = (
      <>
        <p className="font-semibold">Falta el diseño de tu gafete.</p>
        <p className="mt-1 text-gris">
          <Link href="/cuenta/disenos/nuevo" className={liga}>Crea tu diseño</Link> o{" "}
          <Link href="/cuenta/disenos/listos" className={liga}>sube tus gafetes ya terminados</Link>.
        </p>
      </>
    );
  }
  if (falta) {
    return (
      <div className="space-y-5">
        {encabezado}
        <Aviso>{falta}</Aviso>
      </div>
    );
  }

  // Una muestra por cada opción: el gafete de la primera persona que lo tiene completo.
  const muestraDe = (f: FuenteDePedido) => [...f.gafetes.entries()].find(([, g]) => !g.faltan.length);
  // Con reglas, una muestra por cada diseño que se usa.
  const reglas = fuentes.find((f) => f.tipo === "reglas");
  const muestrasReglas = reglas
    ? [...(reglas.disenos?.keys() ?? [])].flatMap((id) => {
        const f = fuentes.find((x) => x.id === id);
        const m = [...reglas.gafetes.entries()].find(([, g]) => g.disenoId === id && !g.faltan.length);
        return f && m ? [{ fuente: f, copia: m[1].copia, personas: [...reglas.gafetes.values()].filter((g) => g.disenoId === id).length }] : [];
      })
    : [];
  const [imagenes, fotos, listos] = await Promise.all([
    ligasDe(supabase, "disenos", fuentes.flatMap((f) => (f.diseno ? [...rutasDe(f.diseno.frente), ...rutasDe(f.diseno.vuelta)] : []))),
    ligasDe(supabase, "fotos", [...fuentes.map((f) => muestraDe(f)?.[1].copia.foto), ...muestrasReglas.map((m) => m.copia.foto)]),
    ligasDe(supabase, "gafetes", fuentes.flatMap((f) => {
      const copia = f.tipo === "listos" ? muestraDe(f)?.[1].copia : undefined;
      return [copia?.frente?.ruta, copia?.vuelta?.ruta];
    })),
  ]);
  const ligasImagenes = Object.fromEntries(imagenes);
  const { data: categoriasPersonas } =
    empresa.tipo === "evento"
      ? await supabase.from("empleados").select("id, datos").eq("empresa_id", empresa.id).eq("estatus", "activo").limit(10000)
      : { data: null };
  const evento =
    empresa.tipo === "evento"
      ? {
          categorias: categoriasDe(empresa.categorias),
          categoriaDe: Object.fromEntries(
            (categoriasPersonas ?? []).map((p) => {
              const v = (p.datos as Record<string, unknown> | null)?.categoria;
              return [p.id, typeof v === "string" ? v : ""];
            }),
          ),
          limite: empresa.evento_limite ?? hoyIso(),
          inicio: empresa.evento_inicio ?? hoyIso(),
        }
      : null;
  const [saldos, { data: digitales }] = await Promise.all([
    saldoDe(supabase, empresa.id),
    supabase.from("gafetes").select("empleado_id").eq("empresa_id", empresa.id).eq("tipo", "digital").in("estado", ["en_pedido", "activo"]).limit(20000),
  ]);

  const muestras: Record<string, ReactNode> = {};
  const vistas: FuenteVista[] = fuentes.map((f) => {
    const muestra = f.tipo === "reglas" ? undefined : muestraDe(f);
    if (f.tipo === "reglas") {
      muestras[f.id] = (
        <div className="grid gap-4 sm:grid-cols-3">
          {muestrasReglas.slice(0, 6).map((m) => (
            <figure key={m.fuente.id}>
              <GafeteSvg
                cara={m.fuente.diseno!.frente}
                orientacion={m.fuente.diseno!.orientacion}
                datos={m.copia.valores ?? {}}
                etiquetas={etiquetas}
                foto={(m.copia.foto && fotos.get(m.copia.foto)) || null}
                qr={m.copia.qr}
                imagenes={ligasImagenes}
                titulo={`Gafete de ${m.copia.nombre} con el diseño ${m.fuente.nombre}`}
                className="h-40 w-auto max-w-full drop-shadow"
              />
              <figcaption className="mt-2 text-sm text-gris">
                <strong className="text-tinta">{m.fuente.nombre}</strong> · {m.personas.toLocaleString("es-MX")}{" "}
                {m.personas === 1 ? "persona" : "personas"}
              </figcaption>
            </figure>
          ))}
        </div>
      );
    }
    if (muestra) {
      const copia = muestra[1].copia;
      const caras = f.diseno
        ? [f.diseno.frente, f.diseno.vuelta].flatMap((cara, i) =>
            cara
              ? [
                  <GafeteSvg
                    key={i}
                    cara={cara}
                    orientacion={f.diseno!.orientacion}
                    datos={copia.valores ?? {}}
                    etiquetas={etiquetas}
                    foto={(copia.foto && fotos.get(copia.foto)) || null}
                    qr={copia.qr}
                    imagenes={ligasImagenes}
                    titulo={`Gafete de ${copia.nombre}, ${i === 0 ? "frente" : "vuelta"}`}
                    className="w-full drop-shadow"
                  />,
                ]
              : [],
          )
        : [copia.frente, copia.vuelta].flatMap((cara, i) => {
            const url = cara ? listos.get(cara.ruta) : undefined;
            return url
              ? [
                  // eslint-disable-next-line @next/next/no-img-element -- liga temporal de almacenamiento privado
                  <img key={i} src={url} alt={`Gafete de ${copia.nombre}, ${i === 0 ? "frente" : "vuelta"}`} className="w-full rounded-lg drop-shadow" />,
                ]
              : [];
          });
      muestras[f.id] = (
        <figure>
          <div className={`grid gap-3 ${caras.length > 1 ? "grid-cols-2" : "max-w-[16rem]"}`}>{caras}</div>
          <figcaption className="mt-2 text-sm text-gris">Así se ve el de {copia.nombre}.</figcaption>
        </figure>
      );
    }
    return {
      id: f.id,
      tipo: f.tipo,
      nombre: f.nombre,
      dosCaras: Boolean(f.diseno?.vuelta),
      gafetes: Object.fromEntries(
        [...f.gafetes.entries()].map(([id, g]) => {
          const suyo = g.disenoId ? f.disenos?.get(g.disenoId) : undefined;
          return [id, { faltan: g.faltan, vuelta: suyo ? Boolean(suyo.diseno.vuelta) : Boolean(g.copia.vuelta), diseno: suyo?.fila.nombre }];
        }),
      ),
      vista: f.tipo === "diseno" ? `/cuenta/disenos/${f.id}/vista` : f.tipo === "reglas" ? "/cuenta/disenos/reglas" : "/cuenta/disenos/listos",
    };
  });

  return (
    <div className="space-y-5">
      {encabezado}
      <NuevoPedido
        fuentes={vistas}
        muestras={muestras}
        personas={personas.map(({ id, nombre, numero, puesto }) => ({ id, nombre, numero, puesto }))}
        materiales={materiales.filter((m) => m.disponible).map(({ id, nombre, extra, resumen }) => ({ id, nombre, extra, resumen }))}
        direcciones={(direcciones ?? []).map((d) => ({
          id: d.id,
          titulo: d.alias || d.destinatario,
          texto: `${d.calle}, ${d.colonia}, ${d.ciudad}, ${d.estado}, C.P. ${d.cp}`,
        }))}
        fiscales={(fiscales ?? []).map((f) => ({ id: f.id, titulo: f.rfc, texto: f.razon_social }))}
        saldos={saldos}
        conDigital={[...new Set((digitales ?? []).map((g) => g.empleado_id))]}
        evento={evento}
        inicial={{
          fuente: predeterminados.fuente,
          material: predeterminados.material,
          sinFactura: predeterminados.sin_factura,
          personas: preseleccion?.personas ?? null,
          razones: preseleccion?.razones ?? {},
          origen: preseleccion?.origen ?? null,
        }}
      />
    </div>
  );
}
