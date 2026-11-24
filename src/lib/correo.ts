import { Resend } from "resend";
import { site } from "./site";
import { escapar } from "./solicitudes";

/** ¿Está configurado el envío de correos en este ambiente? */
export function correoActivo(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/** Remitente de todos los correos automáticos (el dominio debe estar verificado en Resend). */
const REMITENTE = `${site.nombre} <${site.correoAutomatico}>`;

/** Nota al pie de los correos automáticos que van a clientes. */
export const NOTA_NO_RESPONDER = `Este correo se envía automáticamente, por favor no lo respondas. Si necesitas algo, escríbenos a ${site.correo}.`;

/**
 * Agrega la nota «no respondas» al correo. Solo va cuando la respuesta llegaría
 * a nuestro buzón: no en los avisos internos (van a nuestro propio correo) ni
 * cuando la respuesta le llega a otra persona (por ejemplo, la liga que manda
 * una empresa a su equipo).
 */
function conNota(correo: { para: string; html: string; texto: string; responderA?: string }) {
  if (correo.para === site.correo || (correo.responderA && correo.responderA !== site.correo)) {
    return { html: correo.html, texto: correo.texto };
  }
  const nota = `<p style="max-width:520px;margin:0 auto;padding:0 24px 24px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#5C6178;text-align:center;">${escapar(
    NOTA_NO_RESPONDER,
  ).replace(escapar(site.correo), `<a href="mailto:${site.correo}" style="color:#5C6178;">${site.correo}</a>`)}</p>`;
  const cierre = correo.html.lastIndexOf("</body>");
  const html = cierre >= 0 ? correo.html.slice(0, cierre) + nota + correo.html.slice(cierre) : correo.html + nota;
  return { html, texto: `${correo.texto}\n\n—\n${NOTA_NO_RESPONDER}` };
}

/**
 * Envía un correo transaccional con Resend. Solo en el servidor.
 * Sale de no-reply@ y la respuesta llega a hola@, salvo que se diga otra cosa.
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
  const { html, texto } = conNota(opts);
  return resend.emails.send({
    from: REMITENTE,
    to: opts.para,
    bcc: opts.copiaOculta,
    replyTo: opts.responderA ?? site.correo,
    subject: opts.asunto,
    html,
    text: texto,
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
  let enviados = 0;
  for (let i = 0; i < correos.length; i += 100) {
    if (i) await pausa(600);
    const lote = correos.slice(i, i + 100);
    const { error } = await resend.batch
      .send(
        lote.map((c) => {
          const { html, texto } = conNota(c);
          return { from: REMITENTE, to: c.para, replyTo: c.responderA ?? site.correo, subject: c.asunto, html, text: texto };
        }),
      )
      .catch((falla: unknown) => ({ error: { message: falla instanceof Error ? falla.message : "sin respuesta" } }));
    if (error) return { enviados, error: error.message };
    enviados += lote.length;
  }
  return { enviados };
}
