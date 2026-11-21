import Link from "next/link";
import { Bloque } from "@/components/cuenta/Entrada";
import { requerirEmpresa } from "@/lib/cuenta/sesion";

export default async function Resumen() {
  const { supabase, empresa } = await requerirEmpresa();
  const contar = (filtro: (q: ReturnType<typeof base>) => ReturnType<typeof base>) =>
    filtro(base()).then((r) => r.count ?? 0);
  const base = () =>
    supabase.from("empleados").select("id", { count: "exact", head: true }).eq("empresa_id", empresa.id);

  const [activos, bajas, sinFoto, gafetes, direcciones, fiscales] = await Promise.all([
    contar((q) => q.eq("estatus", "activo")),
    contar((q) => q.eq("estatus", "baja")),
    contar((q) => q.neq("estatus", "baja").is("foto_path", null)),
    supabase.from("gafetes").select("id", { count: "exact", head: true }).eq("empresa_id", empresa.id).then((r) => r.count ?? 0),
    supabase.from("direcciones").select("id", { count: "exact", head: true }).eq("empresa_id", empresa.id).then((r) => r.count ?? 0),
    supabase.from("datos_fiscales").select("id", { count: "exact", head: true }).eq("empresa_id", empresa.id).then((r) => r.count ?? 0),
  ]);

  const pasos = [
    { hecho: activos + bajas > 0, texto: "Sube a tu equipo", href: "/cuenta/equipo/importar", accion: "Importar con Excel" },
    { hecho: activos > 0 && sinFoto === 0, texto: "Sube las fotos", href: "/cuenta/equipo/fotos", accion: "Subir fotos" },
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
