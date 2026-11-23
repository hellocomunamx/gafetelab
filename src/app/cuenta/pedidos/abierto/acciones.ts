"use server";

import { revalidatePath } from "next/cache";
import { requerirEmpresa } from "@/lib/cuenta/sesion";
import type { Resultado } from "@/lib/cuenta/tipos";
import { materiales } from "@/lib/materiales";
import { revisarAviso } from "@/lib/pedidos/abierto";
import { avisoMaximo, esRazon } from "@/lib/pedidos/predeterminados";
import { FUENTE_LISTOS, FUENTE_REGLAS } from "@/lib/pedidos/preparar";
import type { Json } from "@/lib/supabase/tipos";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SOLO_ADMIN = "Solo quien administra la empresa puede cambiar estos ajustes.";
const refrescar = () => revalidatePath("/cuenta", "layout");

/** Aparta a una persona en el pedido abierto, con el motivo de su gafete. */
export async function apartarEnAbierto(d: FormData) {
  const { supabase, usuario, empresa } = await requerirEmpresa();
  const id = String(d.get("id") ?? "");
  const razon = String(d.get("razon") ?? "");
  if (!UUID.test(id) || !esRazon(razon)) return;
  await supabase
    .from("pedido_abierto")
    .upsert({ empresa_id: empresa.id, empleado_id: id, razon, agregado_por: usuario.id }, { onConflict: "empresa_id,empleado_id" });
  await revisarAviso(empresa.id);
  refrescar();
}

/** Quita a una persona del pedido abierto. Si era un alta que se suma sola, deja de sumarse hasta que se pida su gafete. */
export async function quitarDeAbierto(d: FormData) {
  const { supabase, empresa } = await requerirEmpresa();
  const id = String(d.get("id") ?? "");
  if (!UUID.test(id)) return;
  await supabase.from("pedido_abierto").delete().eq("empresa_id", empresa.id).eq("empleado_id", id);
  await revisarAviso(empresa.id);
  refrescar();
}

/** Guarda una parte de `empresas.predeterminados` sin tocar lo demás. */
async function guardarParte(cambio: (actual: Record<string, Json>) => Record<string, Json>): Promise<Resultado> {
  const { supabase, empresa, administra } = await requerirEmpresa();
  if (!administra) return { error: SOLO_ADMIN };
  const { data } = await supabase.from("empresas").select("predeterminados").eq("id", empresa.id).maybeSingle();
  const actual = (data?.predeterminados && typeof data.predeterminados === "object" && !Array.isArray(data.predeterminados)
    ? data.predeterminados
    : {}) as Record<string, Json>;
  const { error } = await supabase.from("empresas").update({ predeterminados: cambio(actual) }).eq("id", empresa.id);
  if (error) return { error: "No pudimos guardar. Intenta de nuevo." };
  return { ok: "Listo, quedó guardado." };
}

/** Cantidad para el aviso del pedido abierto y si las altas se suman solas. */
export async function guardarAviso(_: Resultado, d: FormData): Promise<Resultado> {
  const crudo = String(d.get("cantidad") ?? "").trim();
  const cantidad = crudo ? Number(crudo) : 0;
  if (!Number.isInteger(cantidad) || cantidad < 0 || cantidad > avisoMaximo) {
    return { error: `Escribe una cantidad entre 1 y ${avisoMaximo.toLocaleString("es-MX")}, o déjala vacía para no recibir aviso.` };
  }
  const r = await guardarParte((actual) => ({
    ...actual,
    // Al cambiar la cantidad se vuelve a revisar desde cero.
    aviso: { cantidad, altas: d.get("altas") === "on", avisado_en: null },
  }));
  if (r.ok) {
    const { empresa } = await requerirEmpresa();
    await revisarAviso(empresa.id);
    refrescar();
  }
  return r;
}

/** Material, diseño, dirección y facturación con los que arranca cada pedido nuevo. */
export async function guardarPredeterminados(_: Resultado, d: FormData): Promise<Resultado> {
  const { supabase, empresa, administra } = await requerirEmpresa();
  if (!administra) return { error: SOLO_ADMIN };
  const material = String(d.get("material") ?? "");
  const fuente = String(d.get("fuente") ?? "");
  const direccion = String(d.get("direccion") ?? "");
  const facturacion = String(d.get("facturacion") ?? "");
  if (!materiales.some((m) => m.id === material && m.disponible)) return { error: "Elige un material." };
  if (fuente && !UUID.test(fuente) && fuente !== FUENTE_LISTOS && fuente !== FUENTE_REGLAS) return { error: "Elige un diseño." };

  // El diseño, la dirección y los datos fiscales de siempre usan sus propias banderas.
  if (UUID.test(fuente)) {
    const { data: existe } = await supabase.from("disenos").select("id").eq("id", fuente).eq("empresa_id", empresa.id).maybeSingle();
    if (!existe) return { error: "Ese diseño ya no existe. Vuelve a cargar la página." };
    await supabase.from("disenos").update({ predeterminado: false }).eq("empresa_id", empresa.id).neq("id", fuente);
    await supabase.from("disenos").update({ predeterminado: true }).eq("id", fuente);
  }
  if (UUID.test(direccion)) {
    await supabase.from("direcciones").update({ predeterminada: false }).eq("empresa_id", empresa.id).neq("id", direccion);
    await supabase.from("direcciones").update({ predeterminada: true }).eq("id", direccion).eq("empresa_id", empresa.id);
  }
  if (UUID.test(facturacion)) {
    await supabase.from("datos_fiscales").update({ predeterminado: false }).eq("empresa_id", empresa.id).neq("id", facturacion);
    await supabase.from("datos_fiscales").update({ predeterminado: true }).eq("id", facturacion).eq("empresa_id", empresa.id);
  }
  const r = await guardarParte((actual) => ({
    ...actual,
    material,
    fuente: fuente || null,
    sin_factura: facturacion === "ninguna",
  }));
  if (r.ok) refrescar();
  return r;
}
