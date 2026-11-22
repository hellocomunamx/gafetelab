import { Resend } from "resend";
import { site } from "./site";

/** ¿Está configurado el envío de correos en este ambiente? */
export function correoActivo(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * Envía un correo transaccional con Resend. Solo en el servidor.
 * El remitente sale de RESEND_FROM o, si no existe, del correo del sitio
 * (el dominio debe estar verificado en Resend).
 */
export async function enviarCorreo(opts: {
  para: string;
  asunto: string;
  html: string;
  texto: string;
  /** Copia oculta, por ejemplo al buzón de ventas. */
  copiaOculta?: string;
  /** A quién llega la respuesta. Por omisión, al correo del sitio. */
  responderA?: string;
}) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  return resend.emails.send({
    from: process.env.RESEND_FROM ?? `${site.nombre} <${site.correo}>`,
    to: opts.para,
    bcc: opts.copiaOculta,
    replyTo: opts.responderA ?? site.correo,
    subject: opts.asunto,
    html: opts.html,
    text: opts.texto,
  });
}
