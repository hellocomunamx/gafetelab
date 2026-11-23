"use server";

import { revalidatePath } from "next/cache";
import { camposDe } from "@/lib/cuenta/consultas";
import { requerirEmpresa } from "@/lib/cuenta/sesion";
import type { Resultado } from "@/lib/cuenta/tipos";
import { camposParaReglas, normalizar } from "@/lib/diseno/reglas";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAXIMO = 100;
const refrescar = () => revalidatePath("/cuenta", "layout");

export async function agregarRegla(_: Resultado, d: FormData): Promise<Resultado> {
  const { supabase, empresa } = await requerirEmpresa();
  const campo = String(d.get("campo") ?? "");
  const valor = String(d.get("valor") ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  const diseno = String(d.get("diseno") ?? "");
  const campos = camposParaReglas(await camposDe(supabase, empresa.id));
  if (!campos.some((c) => c.clave === campo)) return { error: "Elige el dato que decide el diseño." };
  if (!valor) return { error: "Escribe el valor, por ejemplo «Seguridad» o «Sucursal Centro»." };
  if (!UUID.test(diseno)) return { error: "Elige el diseño que le toca." };

  const [{ data: existe }, { data: reglas }] = await Promise.all([
    supabase.from("disenos").select("id").eq("id", diseno).eq("empresa_id", empresa.id).maybeSingle(),
    supabase.from("reglas_diseno").select("id, campo, valor, orden").eq("empresa_id", empresa.id),
  ]);
  if (!existe) return { error: "Ese diseño ya no existe. Vuelve a cargar la página." };
  if ((reglas?.length ?? 0) >= MAXIMO) return { error: `Puedes tener hasta ${MAXIMO} reglas.` };
  const repetida = reglas?.find((r) => r.campo === campo && normalizar(r.valor) === normalizar(valor));
  if (repetida) {
    // Ya había una regla para ese valor: solo se cambia su diseño.
    const { error } = await supabase.from("reglas_diseno").update({ diseno_id: diseno }).eq("id", repetida.id);
    if (error) return { error: "No pudimos guardar. Intenta de nuevo." };
    refrescar();
    return { ok: "Esa regla ya existía: le cambiamos el diseño." };
  }
  const orden = Math.max(0, ...(reglas ?? []).map((r) => r.orden)) + 1;
  const { error } = await supabase.from("reglas_diseno").insert({ empresa_id: empresa.id, campo, valor, diseno_id: diseno, orden });
  if (error) return { error: "No pudimos guardar. Intenta de nuevo." };
  refrescar();
  return { ok: "Regla guardada." };
}

export async function borrarRegla(d: FormData) {
  const { supabase, empresa } = await requerirEmpresa();
  const id = String(d.get("id") ?? "");
  if (!UUID.test(id)) return;
  await supabase.from("reglas_diseno").delete().eq("id", id).eq("empresa_id", empresa.id);
  refrescar();
}

/** Sube o baja una regla: cuando una persona coincide con dos, gana la de más arriba. */
export async function moverRegla(d: FormData) {
  const { supabase, empresa } = await requerirEmpresa();
  const id = String(d.get("id") ?? "");
  const hacia = d.get("hacia") === "arriba" ? -1 : 1;
  if (!UUID.test(id)) return;
  const { data: reglas } = await supabase.from("reglas_diseno").select("id, orden").eq("empresa_id", empresa.id).order("orden").order("creado_en");
  const lista = reglas ?? [];
  const i = lista.findIndex((r) => r.id === id);
  const j = i + hacia;
  if (i < 0 || j < 0 || j >= lista.length) return;
  [lista[i], lista[j]] = [lista[j], lista[i]];
  await Promise.all(lista.map((r, k) => supabase.from("reglas_diseno").update({ orden: k + 1 }).eq("id", r.id)));
  refrescar();
}
