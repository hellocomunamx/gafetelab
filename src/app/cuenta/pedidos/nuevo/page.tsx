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
import { type FuenteDePedido, prepararPedido } from "@/lib/pedidos/preparar";
import { stripeActivo } from "@/lib/stripe";
import { clienteServicio } from "@/lib/supabase/publico";

export const metadata: Metadata = { title: "Hacer un pedido" };

const Aviso = ({ children }: { children: ReactNode }) => (
  <div className="rounded-tarjeta border border-linea bg-white p-6 sm:p-8">{children}</div>
);
const liga = "font-semibold text-rojo underline underline-offset-4";

export default async function Nuevo() {
  const { supabase, empresa, administra } = await requerirEmpresa();
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

  const [constancia, preparado, { data: direcciones }, { data: fiscales }] = await Promise.all([
    constanciaDe(supabase, empresa.id),
    prepararPedido(supabase, empresa),
    supabase.from("direcciones").select("*").eq("empresa_id", empresa.id).order("predeterminada", { ascending: false }).order("creado_en"),
    supabase.from("datos_fiscales").select("*").eq("empresa_id", empresa.id).order("predeterminado", { ascending: false }).order("creado_en"),
  ]);
  const { personas, fuentes, etiquetas } = preparado;

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
            ? "Tu Constancia de Situación Fiscal está en revisión."
            : "Antes de tu primer pedido necesitamos la Constancia de Situación Fiscal de tu empresa."}
        </p>
        <p className="mt-1 text-gris">
          {constancia?.estado === "pendiente"
            ? "En cuanto la aprobemos vas a poder pedir. Normalmente tarda menos de un día hábil."
            : "Así comprobamos que los gafetes y credenciales son de tu empresa. Solo se pide una vez."}{" "}
          <Link href="/cuenta/constancia" className={liga}>
            {constancia?.estado === "pendiente" ? "Ver mi constancia" : "Subir mi constancia"}
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
  const [imagenes, fotos, listos] = await Promise.all([
    ligasDe(supabase, "disenos", fuentes.flatMap((f) => (f.diseno ? [...rutasDe(f.diseno.frente), ...rutasDe(f.diseno.vuelta)] : []))),
    ligasDe(supabase, "fotos", fuentes.map((f) => muestraDe(f)?.[1].copia.foto)),
    ligasDe(supabase, "gafetes", fuentes.flatMap((f) => {
      const copia = f.tipo === "listos" ? muestraDe(f)?.[1].copia : undefined;
      return [copia?.frente?.ruta, copia?.vuelta?.ruta];
    })),
  ]);
  const ligasImagenes = Object.fromEntries(imagenes);

  const muestras: Record<string, ReactNode> = {};
  const vistas: FuenteVista[] = fuentes.map((f) => {
    const muestra = muestraDe(f);
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
          <figcaption className="mt-2 text-sm text-gris">Así se imprime el de {copia.nombre}.</figcaption>
        </figure>
      );
    }
    return {
      id: f.id,
      tipo: f.tipo,
      nombre: f.nombre,
      dosCaras: Boolean(f.diseno?.vuelta),
      gafetes: Object.fromEntries([...f.gafetes.entries()].map(([id, g]) => [id, { faltan: g.faltan, vuelta: Boolean(g.copia.vuelta) }])),
      vista: f.tipo === "diseno" ? `/cuenta/disenos/${f.id}/vista` : "/cuenta/disenos/listos",
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
      />
    </div>
  );
}
