"use server";

import { revalidatePath } from "next/cache";
import { regimenesFiscales } from "@/lib/cuenta/catalogos";
import { RFC_VALIDO } from "@/lib/cuenta/constancia-datos";
import { requerirEmpresa } from "@/lib/cuenta/sesion";
import type { Resultado } from "@/lib/cuenta/tipos";

/**
 * Guarda como datos de facturación lo que la persona confirmó al subir su
 * constancia. Si la empresa ya tiene ese RFC registrado, no hace nada.
 */
export async function guardarFiscalesDeConstancia(entrada: {
  rfc: string;
  razonSocial: string;
  regimen: string;
  cp: string;
}): Promise<Resultado> {
  const { supabase, empresa, usuario, administra } = await requerirEmpresa();
  if (!administra) return { error: "Solo quien administra la empresa puede guardar los datos de facturación." };
  const rfc = String(entrada?.rfc ?? "").toUpperCase().replace(/[\s-]/g, "");
  const razonSocial = String(entrada?.razonSocial ?? "").trim().slice(0, 200);
  const regimen = String(entrada?.regimen ?? "");
  const cp = String(entrada?.cp ?? "").trim();
  if (!RFC_VALIDO.test(rfc)) return { error: "Revisa el RFC: lleva 12 caracteres (empresa) o 13 (persona)." };
  if (!razonSocial) return { error: "Escribe el nombre o razón social como aparece en tu constancia." };
  if (!regimenesFiscales.some((r) => r.clave === regimen)) return { error: "Elige el régimen fiscal." };
  if (!/^[0-9]{5}$/.test(cp)) return { error: "El código postal fiscal lleva 5 dígitos." };
  if (!usuario.email) return { error: "No pudimos guardar tus datos de facturación. Captúralos en Envío y facturación." };

  const { data: actuales } = await supabase.from("datos_fiscales").select("rfc").eq("empresa_id", empresa.id);
  if (actuales?.some((d) => d.rfc === rfc)) return { ok: "Ya tenías estos datos de facturación." };
  const { error } = await supabase.from("datos_fiscales").insert({
    empresa_id: empresa.id,
    rfc,
    razon_social: razonSocial,
    regimen_fiscal: regimen,
    cp_fiscal: cp,
    // Lo más común; se cambia en Envío y facturación.
    uso_cfdi: "G03",
    correo: usuario.email.toLowerCase(),
    predeterminado: !actuales?.length,
  });
  if (error) return { error: "No pudimos guardar tus datos de facturación. Captúralos en Envío y facturación." };
  revalidatePath("/cuenta", "layout");
  return { ok: "Datos de facturación guardados." };
}
