import Link from "next/link";
import { BotonPlantilla } from "@/components/cuenta/BotonPlantilla";
import { Bloque } from "@/components/cuenta/Entrada";
import { camposDe } from "@/lib/cuenta/consultas";
import { requerirEmpresa } from "@/lib/cuenta/sesion";
import { claveDe } from "@/lib/cuenta/texto";

export default async function Resumen() {
  const { supabase, empresa } = await requerirEmpresa();
  const contar = (filtro: (q: ReturnType<typeof base>) => ReturnType<typeof base>) =>
    filtro(base()).then((r) => r.count ?? 0);
  const base = () =>
    supabase.from("empleados").select("id", { count: "exact", head: true }).eq("empresa_id", empresa.id);

  const [campos, activos, bajas, sinFoto, gafetes, direcciones, fiscales, disenos] = await Promise.all([
    camposDe(supabase, empresa.id),
    contar((q) => q.eq("estatus", "activo")),
    contar((q) => q.eq("estatus", "baja")),
    contar((q) => q.neq("estatus", "baja").is("foto_path", null)),
    supabase.from("gafetes").select("id", { count: "exact", head: true }).eq("empresa_id", empresa.id).then((r) => r.count ?? 0),
    supabase.from("direcciones").select("id", { count: "exact", head: true }).eq("empresa_id", empresa.id).then((r) => r.count ?? 0),
    supabase.from("datos_fiscales").select("id", { count: "exact", head: true }).eq("empresa_id", empresa.id).then((r) => r.count ?? 0),
    supabase.from("disenos").select("id", { count: "exact", head: true }).eq("empresa_id", empresa.id).then((r) => r.count ?? 0),
  ]);

  const pasos = [
    { hecho: activos + bajas > 0, texto: "Sube a tu equipo", href: "/cuenta/equipo/importar", accion: "Importar con Excel" },
    { hecho: activos > 0 && sinFoto === 0, texto: "Sube las fotos", href: "/cuenta/equipo/fotos", accion: "Subir fotos" },
    { hecho: disenos > 0, texto: "Crea el diseño de tu gafete", href: "/cuenta/disenos/nuevo", accion: "Crear diseño" },
    { hecho: direcciones > 0, texto: "Guarda tu dirección de envío", href: "/cuenta/datos", accion: "Agregar dirección" },
    { hecho: fiscales > 0, texto: "Guarda tus datos de facturación", href: "/cuenta/datos#facturacion", accion: "Agregar datos" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">Hola, {empresa.nombre}</h1>
      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { dato: activos, detalle: "personas activas", href: "/cuenta/equipo?estatus=activo" },
          { dato: bajas, detalle: "bajas", href: "/cuenta/equipo?estatus=baja" },
          { dato: sinFoto, detalle: "sin fotografía", href: "/cuenta/equipo?foto=sin" },
          { dato: gafetes, detalle: "gafetes emitidos", href: "/cuenta/equipo" },
        ].map((d) => (
          <Link key={d.detalle} href={d.href} className="rounded-tarjeta border border-linea bg-white p-5 hover:border-tinta">
            <dt className="font-titulos text-3xl font-extrabold">{d.dato.toLocaleString("es-MX")}</dt>
            <dd className="mt-1 text-sm text-gris">{d.detalle}</dd>
          </Link>
        ))}
      </dl>

      <section className="grid gap-5 rounded-tarjeta bg-tinta p-5 text-white sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <h2 className="text-xl font-extrabold">Sube a tu equipo con tu plantilla de Excel</h2>
          <p className="mt-1 max-w-xl text-sm text-white/75">
            Personaliza los campos de tu gafete y descarga una plantilla hecha a tu medida. La llenas,
            la subes y cada renglón se convierte en una persona de tu equipo.
          </p>
        </div>
        <ol className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          <li>
            <Link href="/cuenta/campos" className="inline-flex rounded-full border border-white/40 px-4 py-2 hover:bg-white/10">
              1. Personalizar campos
            </Link>
          </li>
          <li>
            <BotonPlantilla
              campos={campos.map(({ clave, etiqueta, tipo }) => ({ clave, etiqueta, tipo }))}
              empresa={claveDe(empresa.nombre).replace(/_/g, "-")}
              className="inline-flex rounded-full bg-rojo px-4 py-2 text-white hover:bg-rojo-oscuro"
            >
              2. Descargar plantilla
            </BotonPlantilla>
          </li>
          <li>
            <Link href="/cuenta/equipo/importar" className="inline-flex rounded-full border border-white/40 px-4 py-2 hover:bg-white/10">
              3. Subirla llena
            </Link>
          </li>
        </ol>
      </section>

      <Bloque titulo="Deja lista tu plataforma">
        <ul className="divide-y divide-linea">
          {pasos.map((p) => (
            <li key={p.texto} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span className={p.hecho ? "text-gris line-through" : "font-medium"}>
                <span aria-hidden className="mr-2">{p.hecho ? "✓" : "○"}</span>
                {p.texto}
                {p.hecho ? <span className="sr-only"> (listo)</span> : null}
              </span>
              {p.hecho ? null : (
                <Link href={p.href} className="font-semibold text-rojo underline underline-offset-4">
                  {p.accion}
                </Link>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-gris">
          Los pedidos desde tu plataforma se activan pronto. Mientras, puedes{" "}
          <Link href="/cotizar" className="underline">cotizar aquí</Link>.
        </p>
      </Bloque>
    </div>
  );
}
