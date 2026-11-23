import type { Metadata } from "next";
import Link from "next/link";
import { guardarPredeterminados } from "@/app/cuenta/pedidos/abierto/acciones";
import { Bloque, Chips } from "@/components/cuenta/Entrada";
import { Formulario } from "@/components/cuenta/Formulario";
import { requerirEmpresa } from "@/lib/cuenta/sesion";
import { materiales } from "@/lib/materiales";
import { leerPredeterminados } from "@/lib/pedidos/predeterminados";
import { FUENTE_LISTOS, FUENTE_REGLAS } from "@/lib/pedidos/preparar";
import { pesos } from "@/lib/precios";

export const metadata: Metadata = { title: "Predeterminados de tu negocio" };

const liga = "font-semibold text-rojo underline underline-offset-4";

export default async function Ajustes() {
  const { supabase, empresa, administra } = await requerirEmpresa();
  const [{ data: ajustes }, { data: disenos }, { count: listos }, { count: reglas }, { data: direcciones }, { data: fiscales }] =
    await Promise.all([
      supabase.from("empresas").select("predeterminados").eq("id", empresa.id).maybeSingle(),
      supabase.from("disenos").select("id, nombre, predeterminado").eq("empresa_id", empresa.id).order("predeterminado", { ascending: false }).order("creado_en"),
      supabase.from("gafetes_listos").select("empleado_id", { count: "exact", head: true }).eq("empresa_id", empresa.id),
      supabase.from("reglas_diseno").select("id", { count: "exact", head: true }).eq("empresa_id", empresa.id),
      supabase.from("direcciones").select("id, alias, destinatario, ciudad, predeterminada").eq("empresa_id", empresa.id).order("predeterminada", { ascending: false }).order("creado_en"),
      supabase.from("datos_fiscales").select("id, rfc, razon_social, predeterminado").eq("empresa_id", empresa.id).order("predeterminado", { ascending: false }).order("creado_en"),
    ]);
  const p = leerPredeterminados(ajustes?.predeterminados);

  const fuentes = [
    ...(reglas ? [{ valor: FUENTE_REGLAS, texto: "Cada quien con su diseño", detalle: "(por reglas)" }] : []),
    ...(disenos ?? []).map((d) => ({ valor: d.id, texto: d.nombre })),
    ...(listos ? [{ valor: FUENTE_LISTOS, texto: "Mis gafetes listos" }] : []),
  ];
  const fuenteInicial = fuentes.find((f) => f.valor === p.fuente)?.valor ?? (reglas ? FUENTE_REGLAS : disenos?.[0]?.id);
  const disponibles = materiales.filter((m) => m.disponible);

  return (
    <div className="space-y-5">
      <p className="text-sm">
        <Link href="/cuenta/pedidos" className="underline">Pedidos</Link> / Predeterminados
      </p>
      <h1 className="text-3xl font-extrabold">Predeterminados de tu negocio</h1>
      <p className="max-w-2xl text-gris">
        Elige una vez con qué arranca cada pedido: tu material, tu diseño, a dónde lo enviamos y a nombre de quién
        facturamos. Al pedir ya viene todo elegido, y si un día necesitas otra cosa, la cambias en ese pedido.
      </p>

      {administra ? (
        <Bloque>
          <Formulario accion={guardarPredeterminados} boton="Guardar mis predeterminados">
            <div className="space-y-6">
              <Chips
                etiqueta="Material"
                name="material"
                inicial={p.material ?? disponibles[0].id}
                opciones={disponibles.map((m) => ({ valor: m.id, texto: m.nombre, detalle: m.extra ? `(+${pesos(m.extra)})` : undefined }))}
              />
              {fuentes.length ? (
                <Chips etiqueta="Diseño" name="fuente" inicial={fuenteInicial} opciones={fuentes} />
              ) : (
                <p className="text-sm">
                  <span className="font-semibold">Diseño.</span> Todavía no tienes uno.{" "}
                  <Link href="/cuenta/disenos/nuevo" className={liga}>Crea tu diseño</Link>
                </p>
              )}
              {direcciones?.length ? (
                <Chips
                  etiqueta="Dirección de envío"
                  name="direccion"
                  inicial={direcciones[0].id}
                  opciones={direcciones.map((d) => ({ valor: d.id, texto: d.alias || d.destinatario, detalle: `(${d.ciudad})` }))}
                />
              ) : (
                <p className="text-sm">
                  <span className="font-semibold">Dirección de envío.</span> Todavía no guardas una.{" "}
                  <Link href="/cuenta/datos#direccion" className={liga}>Agregar mi dirección</Link>
                </p>
              )}
              <Chips
                etiqueta="Factura"
                name="facturacion"
                inicial={p.sin_factura || !fiscales?.length ? "ninguna" : fiscales[0].id}
                opciones={[
                  ...(fiscales ?? []).map((f) => ({ valor: f.id, texto: f.rfc, detalle: f.razon_social })),
                  { valor: "ninguna", texto: "No necesito factura" },
                ]}
              />
            </div>
          </Formulario>
        </Bloque>
      ) : (
        <p className="rounded-tarjeta-chica bg-resaltador/30 p-4 text-sm">
          Solo quien es dueño o administrador de la empresa puede cambiar los predeterminados.
        </p>
      )}

      <p className="text-sm text-gris">
        ¿Quieres un diseño distinto según el puesto, el departamento o la sucursal?{" "}
        <Link href="/cuenta/disenos/reglas" className={liga}>Arma tus reglas de diseño</Link>
      </p>
    </div>
  );
}
