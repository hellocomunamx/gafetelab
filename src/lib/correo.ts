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
  /** Archivos adjuntos, con su contenido en base64. */
  adjuntos?: { nombre: string; contenido: string }[];
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
    attachments: opts.adjuntos?.map((a) => ({ filename: a.nombre, content: a.contenido })),
  });
}

export type Correo = { para: string; asunto: string; html: string; texto: string; responderA?: string };

const pausa = (ms: number) => new Promise((listo) => setTimeout(listo, ms));

/**
 * Envía muchos correos distintos de una vez, en lotes de 100 (lo que admite
 * Resend por solicitud). Si un lote falla se detiene: `enviados` dice cuántos
 * sí salieron, en el mismo orden en que venían.
 */
export async function enviarCorreos(correos: Correo[]): Promise<{ enviados: number; error?: string }> {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const de = process.env.RESEND_FROM ?? `${site.nombre} <${site.correo}>`;
  let enviados = 0;
  for (let i = 0; i < correos.length; i += 100) {
    if (i) await pausa(600);
    const lote = correos.slice(i, i + 100);
    const { error } = await resend.batch
      .send(lote.map((c) => ({ from: de, to: c.para, replyTo: c.responderA ?? site.correo, subject: c.asunto, html: c.html, text: c.texto })))
      .catch((falla: unknown) => ({ error: { message: falla instanceof Error ? falla.message : "sin respuesta" } }));
    if (error) return { enviados, error: error.message };
    enviados += lote.length;
  }
  return { enviados };
}
