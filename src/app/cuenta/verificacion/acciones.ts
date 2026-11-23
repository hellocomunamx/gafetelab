"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { regimenesFiscales } from "@/lib/cuenta/catalogos";
import { COOKIE_CODIGO, MINUTOS_CODIGO, nuevoCodigo, revisarCodigo } from "@/lib/cuenta/codigo-correo";
import { constanciaDe, esCorreoGratuito, ligaValida } from "@/lib/cuenta/constancia";
import { RFC_VALIDO } from "@/lib/cuenta/constancia-datos";
import { requerirEmpresa } from "@/lib/cuenta/sesion";
import type { Resultado } from "@/lib/cuenta/tipos";
import { correoActivo, enviarCorreo } from "@/lib/correo";
import { carta, site } from "@/lib/site";
import { clienteServicio } from "@/lib/supabase/publico";

const ERROR_GENERAL = "No pudimos guardar. Intenta de nuevo.";
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const rutaDe = (empresaId: string) => new RegExp(`^${empresaId}/[0-9a-f-]{36}\\.(pdf|jpg|png)$`);
const escapar = (t: string) => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** ¿La empresa puede mandar una verificación nueva? Null si sí; si no, el error. */
async function revisarQuePuede() {
  const sesion = await requerirEmpresa();
  if (!sesion.administra) return { sesion, error: "Solo quien administra la empresa puede verificarla." };
  const actual = await constanciaDe(sesion.supabase, sesion.empresa.id);
  if (actual?.estado === "aprobada") return { sesion, error: "Tu empresa ya está verificada." };
  if (actual?.estado === "pendiente") return { sesion, error: "Ya tienes una verificación en revisión." };
  return { sesion, error: null };
}

/** INE de quien responde por el negocio y una prueba del negocio (liga o foto). Queda en revisión. */
export async function guardarIne(entrada: {
  ruta: string;
  reverso: string | null;
  prueba: string | null;
  liga: string;
  negocio: string;
  carta: boolean;
}): Promise<Resultado> {
  const { sesion, error: noPuede } = await revisarQuePuede();
  if (noPuede) return { error: noPuede };
  const { supabase, empresa } = sesion;
  if (entrada?.carta !== true) return { error: "Para continuar, debes aceptar la carta de responsabilidad: léela y marca la casilla «Acepto la carta de responsabilidad»." };
  const patron = rutaDe(empresa.id);
  const ruta = String(entrada?.ruta ?? "");
  const reverso = entrada?.reverso ? String(entrada.reverso) : null;
  const prueba = entrada?.prueba ? String(entrada.prueba) : null;
  if (!patron.test(ruta) || (reverso && !patron.test(reverso)) || (prueba && !patron.test(prueba))) return { error: ERROR_GENERAL };
  const negocio = String(entrada?.negocio ?? "").trim().slice(0, 120);
  if (!negocio) return { error: "Escribe el nombre de tu negocio como aparece en los gafetes." };
  const liga = entrada?.liga ? ligaValida(String(entrada.liga)) : null;
  if (entrada?.liga && !liga) return { error: "Revisa la liga: cópiala completa desde tu navegador." };
  if (!liga && !prueba) return { error: "Agrega la liga a tus redes o a Google Maps, o una foto de tu negocio." };
  const { error } = await supabase.from("constancias").insert({
    empresa_id: empresa.id,
    metodo: "ine",
    ruta,
    ruta_reverso: reverso,
    prueba_ruta: prueba,
    prueba_liga: liga,
    negocio,
    carta_version: carta.version,
  });
  if (error) return { error: error.code === "P0001" ? error.message : ERROR_GENERAL };
  revalidatePath("/cuenta", "layout");
  return { ok: "Recibimos tu verificación." };
}

/** Manda un código de 6 dígitos al correo de la empresa. */
export async function enviarCodigoCorreo(entrada: { correo: string; negocio: string }): Promise<Resultado> {
  const { sesion, error: noPuede } = await revisarQuePuede();
  if (noPuede) return { error: noPuede };
  const correo = String(entrada?.correo ?? "").trim().toLowerCase().slice(0, 200);
  const negocio = String(entrada?.negocio ?? "").trim().slice(0, 120);
  if (!negocio) return { error: "Escribe el nombre de tu negocio como aparece en los gafetes." };
  if (!CORREO.test(correo)) return { error: "Revisa el correo." };
  if (esCorreoGratuito(correo)) {
    return { error: "Ese es un correo gratuito. Usa uno con el dominio de tu negocio, o elige otra forma de verificar." };
  }
  if (!correoActivo()) return { error: "Esta opción no está disponible por ahora. Elige otra forma de verificar." };
  const nuevo = await nuevoCodigo({ empresa: sesion.empresa.id, correo, negocio });
  if (!nuevo) return { error: "Esta opción no está disponible por ahora. Elige otra forma de verificar." };
  const texto = `Tu código para verificar ${negocio} en ${site.nombre} es ${nuevo.codigo}. Vence en ${MINUTOS_CODIGO} minutos. Si no lo pediste, ignora este correo.`;
  const { error } = await enviarCorreo({
    para: correo,
    asunto: `Tu código de ${site.nombre}: ${nuevo.codigo}`,
    texto,
    html: `<p>Tu código para verificar <strong>${escapar(negocio)}</strong> en ${site.nombre} es:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px">${nuevo.codigo}</p><p>Vence en ${MINUTOS_CODIGO} minutos. Si no lo pediste, ignora este correo.</p>`,
  }).catch(() => ({ error: true }));
  if (error) return { error: "No pudimos mandar el correo. Revisa que esté bien escrito e intenta de nuevo." };
  (await cookies()).set(COOKIE_CODIGO, nuevo.cookie, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/cuenta",
    maxAge: MINUTOS_CODIGO * 60,
  });
  return { ok: `Te mandamos un código a ${correo}.` };
}

/** Confirma el código del correo y deja la verificación en revisión. */
export async function confirmarCodigoCorreo(entrada: { codigo: string; carta: boolean }): Promise<Resultado> {
  const { sesion, error: noPuede } = await revisarQuePuede();
  if (noPuede) return { error: noPuede };
  if (entrada?.carta !== true) return { error: "Para continuar, debes aceptar la carta de responsabilidad: léela y marca la casilla «Acepto la carta de responsabilidad»." };
  const almacen = await cookies();
  const datos = await revisarCodigo(almacen.get(COOKIE_CODIGO)?.value, String(entrada?.codigo ?? "").replace(/\D/g, ""));
  if (!datos || datos.empresa !== sesion.empresa.id) return { error: "El código no coincide o ya venció. Pide uno nuevo." };
  const servicio = clienteServicio();
  if (!servicio) return { error: ERROR_GENERAL };
  // Con la llave secreta: solo así queda marcado el correo como confirmado.
  const { error } = await servicio.from("constancias").insert({
    empresa_id: sesion.empresa.id,
    metodo: "correo",
    correo: datos.correo,
    negocio: datos.negocio,
    correo_confirmado_en: new Date().toISOString(),
    subida_por: sesion.usuario.id,
    carta_version: carta.version,
  });
  if (error) return { error: error.code === "P0001" ? error.message : ERROR_GENERAL };
  almacen.delete({ name: COOKIE_CODIGO, path: "/cuenta" });
  revalidatePath("/cuenta", "layout");
  return { ok: "Correo confirmado. Tu verificación quedó en revisión." };
}

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
