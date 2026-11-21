import { Resend } from "resend";
import { site } from "./site";

/** Envía un correo transaccional con Resend. Solo en el servidor. */
export async function enviarCorreo(opts: { para: string; asunto: string; html: string }) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  return resend.emails.send({
    from: `${site.nombre} <${site.correo}>`,
    to: opts.para,
    subject: opts.asunto,
    html: opts.html,
  });
}
