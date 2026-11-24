"use server";

import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  abrirCandado,
  candadoAbierto,
  cerrarCandado,
  dispositivoDe,
  guardarReto,
  llavesDe,
  MAX_LLAVES,
  rutaDeLiga,
  sitioWebAuthn,
  tomarReto,
} from "@/lib/cuenta/candado";
import { gafeteDigitalDe } from "@/lib/cuenta/gafete-digital";
import { personaDeLiga } from "@/lib/cuenta/liga-publica";
import { dentroDelLimite, ipActual, MENSAJE_LIMITE } from "@/lib/seguridad/limites";

/**
 * Lo que hace el navegador de la persona con su candado: activarlo en este
 * dispositivo, abrir la liga con la huella o la cara, quitar un dispositivo
 * y volver a cerrar. Cada paso vuelve a buscar a la persona por su liga.
 */

type Opciones<T> = { opciones?: T; error?: string };
type Hecho = { ok?: boolean; error?: string };

const NO_ACTIVA = "Esta liga ya no está activa. Pide una nueva en tu empresa.";
const NO_SALIO = "No pudimos confirmar con tu dispositivo. Intenta de nuevo.";

async function dentro(): Promise<boolean> {
  return dentroDelLimite("LIMITE_ACCESO", `candado:${await ipActual()}`);
}

/** Primer paso para activar el candado en este dispositivo. */
export async function opcionesActivar(liga: string): Promise<Opciones<Awaited<ReturnType<typeof generateRegistrationOptions>>>> {
  if (!(await dentro())) return { error: MENSAJE_LIMITE };
  const encontrada = await personaDeLiga(liga);
  if (!encontrada) return { error: NO_ACTIVA };
  const { servicio, persona, empresa } = encontrada;
  if (!(await gafeteDigitalDe(servicio, persona))) return { error: "El candado es para el gafete digital, y el tuyo no está activo." };
  const llaves = await llavesDe(servicio, persona.id);
  // Con candado puesto, solo quien ya lo abrió puede agregar otro dispositivo.
  if (llaves.length && !(await candadoAbierto(liga, persona.id))) return { error: "Abre primero tu gafete con tu huella o tu cara." };
  if (llaves.length >= MAX_LLAVES) return { error: `Ya tienes ${MAX_LLAVES} dispositivos. Quita uno para agregar otro.` };

  const { rpID, nombre } = sitioWebAuthn();
  const opciones = await generateRegistrationOptions({
    rpName: nombre,
    rpID,
    userID: isoBase64URL.toBuffer(isoBase64URL.fromUTF8String(persona.id)),
    userName: `${persona.nombre} · ${empresa.nombre}`.slice(0, 64),
    userDisplayName: `Gafete de ${persona.nombre}`.slice(0, 64),
    attestationType: "none",
    excludeCredentials: llaves.map((l) => ({ id: l.credencial_id, transports: l.transportes })),
    authenticatorSelection: { residentKey: "preferred", userVerification: "required" },
    preferredAuthenticatorType: "localDevice",
  });
  await guardarReto(liga, "registro", opciones.challenge);
  return { opciones };
}

/** Segundo paso: guarda la llave pública de este dispositivo. */
export async function guardarActivacion(liga: string, respuesta: RegistrationResponseJSON): Promise<Hecho> {
  if (!(await dentro())) return { error: MENSAJE_LIMITE };
  const encontrada = await personaDeLiga(liga);
  if (!encontrada) return { error: NO_ACTIVA };
  const { servicio, persona } = encontrada;
  const reto = await tomarReto(liga, "registro");
  if (!reto) return { error: "Se acabó el tiempo. Intenta de nuevo." };
  const llaves = await llavesDe(servicio, persona.id);
  if (llaves.length && !(await candadoAbierto(liga, persona.id))) return { error: "Abre primero tu gafete con tu huella o tu cara." };
  if (llaves.length >= MAX_LLAVES) return { error: `Ya tienes ${MAX_LLAVES} dispositivos. Quita uno para agregar otro.` };

  const { rpID, origen } = sitioWebAuthn();
  let verificada;
  try {
    verificada = await verifyRegistrationResponse({
      response: respuesta,
      expectedChallenge: reto,
      expectedOrigin: origen,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
  } catch {
    return { error: NO_SALIO };
  }
  if (!verificada.verified) return { error: NO_SALIO };
  const { credential } = verificada.registrationInfo;
  const { error } = await servicio.from("llaves_gafete").insert({
    empleado_id: persona.id,
    empresa_id: persona.empresa_id,
    credencial_id: credential.id,
    llave_publica: isoBase64URL.fromBuffer(credential.publicKey),
    contador: credential.counter,
    transportes: credential.transports ?? [],
    dispositivo: dispositivoDe((await headers()).get("user-agent")),
  });
  if (error) return { error: error.code === "23505" ? "Este dispositivo ya tiene el candado." : NO_SALIO };
  await abrirCandado(liga, persona.id);
  revalidatePath(rutaDeLiga(liga));
  return { ok: true };
}

/** Primer paso para abrir la liga con la huella, la cara o el PIN. */
export async function opcionesAbrir(liga: string): Promise<Opciones<Awaited<ReturnType<typeof generateAuthenticationOptions>>>> {
  if (!(await dentro())) return { error: MENSAJE_LIMITE };
  const encontrada = await personaDeLiga(liga);
  if (!encontrada) return { error: NO_ACTIVA };
  const llaves = await llavesDe(encontrada.servicio, encontrada.persona.id);
  if (!llaves.length) return { error: "Tu gafete ya no tiene candado. Recarga la página." };
  const opciones = await generateAuthenticationOptions({
    rpID: sitioWebAuthn().rpID,
    allowCredentials: llaves.map((l) => ({ id: l.credencial_id, transports: l.transportes })),
    userVerification: "required",
  });
  await guardarReto(liga, "entrada", opciones.challenge);
  return { opciones };
}

/** Segundo paso: comprueba la firma del dispositivo y abre la liga unos minutos. */
export async function abrirConDispositivo(liga: string, respuesta: AuthenticationResponseJSON): Promise<Hecho> {
  if (!(await dentro())) return { error: MENSAJE_LIMITE };
  const encontrada = await personaDeLiga(liga);
  if (!encontrada) return { error: NO_ACTIVA };
  const { servicio, persona } = encontrada;
  const reto = await tomarReto(liga, "entrada");
  if (!reto) return { error: "Se acabó el tiempo. Intenta de nuevo." };
  const llave = (await llavesDe(servicio, persona.id)).find((l) => l.credencial_id === respuesta.id);
  if (!llave) return { error: "Este dispositivo no tiene el candado de este gafete. Pide a tu empresa que lo quite si cambiaste de celular." };

  const { rpID, origen } = sitioWebAuthn();
  let verificada;
  try {
    verificada = await verifyAuthenticationResponse({
      response: respuesta,
      expectedChallenge: reto,
      expectedOrigin: origen,
      expectedRPID: rpID,
      credential: {
        id: llave.credencial_id,
        publicKey: isoBase64URL.toBuffer(llave.llave_publica),
        counter: Number(llave.contador),
        transports: llave.transportes as never,
      },
      requireUserVerification: true,
    });
  } catch {
    return { error: NO_SALIO };
  }
  if (!verificada.verified) return { error: NO_SALIO };
  await servicio
    .from("llaves_gafete")
    .update({ contador: verificada.authenticationInfo.newCounter, usada_en: new Date().toISOString() })
    .eq("id", llave.id);
  await abrirCandado(liga, persona.id);
  revalidatePath(rutaDeLiga(liga));
  return { ok: true };
}

/** Quita un dispositivo. Si era el último, la liga vuelve a abrir sin candado. */
export async function quitarDispositivo(liga: string, id: string): Promise<Hecho> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: NO_SALIO };
  const encontrada = await personaDeLiga(liga);
  if (!encontrada) return { error: NO_ACTIVA };
  const { servicio, persona } = encontrada;
  if (!(await candadoAbierto(liga, persona.id))) return { error: "Abre primero tu gafete con tu huella o tu cara." };
  await servicio.from("llaves_gafete").delete().eq("id", id).eq("empleado_id", persona.id);
  revalidatePath(rutaDeLiga(liga));
  return { ok: true };
}

/** «Cerrar ahora»: la próxima vez pide la huella aunque no hayan pasado los minutos. */
export async function cerrarAhora(liga: string): Promise<Hecho> {
  await cerrarCandado(liga);
  revalidatePath(rutaDeLiga(liga));
  return { ok: true };
}
