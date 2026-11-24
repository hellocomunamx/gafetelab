import { site } from "@/lib/site";
import { escapar } from "@/lib/solicitudes";

/**
 * Correos a las personas del equipo (portal «Mi gafete»). Salen de no-reply@
 * con respuesta a hola@, como todos los automáticos.
 */

function marco(opts: { empresa: string; titulo: string; cuerpoHtml: string; boton?: { texto: string; url: string } }) {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#EEF0F5;font-family:Arial,Helvetica,sans-serif;color:#1B1F3B;">
<div style="max-width:520px;margin:0 auto;padding:24px;">
<div style="background:#fff;border-radius:14px;overflow:hidden;">
<div style="background:#E63B2E;color:#fff;padding:20px 24px;">
<p style="margin:0;font-size:13px;opacity:.9;">${escapar(opts.empresa)}</p>
<p style="margin:2px 0 0;font-size:20px;font-weight:bold;">Mi gafete</p>
</div>
<div style="padding:24px;">
<p style="margin:0 0 12px;font-size:18px;font-weight:bold;">${escapar(opts.titulo)}</p>
${opts.cuerpoHtml}
${
  opts.boton
    ? `<p style="margin:20px 0 0;"><a href="${escapar(opts.boton.url)}" style="display:inline-block;background:#E63B2E;color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px;font-size:15px;">${escapar(opts.boton.texto)}</a></p>`
    : ""
}
</div></div>
<p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#5C6178;text-align:center;">Te llega porque ${escapar(opts.empresa)} te dio acceso a Mi gafete en ${escapar(site.nombre)}.</p>
</div></body></html>`;
}

const parrafo = (t: string) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.55;">${escapar(t)}</p>`;
const saludo = (nombre: string) => {
  const primero = nombre.trim().split(/\s+/)[0];
  return primero ? `Hola, ${primero}.` : "¡Hola!";
};

/** Código de 6 dígitos y liga de un solo uso para entrar al portal. */
export function correoCodigoPortal(opts: { empresa: string; nombre: string; codigo: string; url: string; minutos: number }) {
  const titulo = `Tu código para entrar: ${opts.codigo}`;
  const codigoHtml = `<p style="margin:8px 0 16px;font-size:34px;font-weight:bold;letter-spacing:8px;font-family:'Courier New',monospace;">${escapar(opts.codigo)}</p>`;
  const lineas = [
    `${saludo(opts.nombre)} Escribe este código en Mi gafete de ${opts.empresa}, o toca el botón para entrar directo.`,
  ];
  const aviso = `Vence en ${opts.minutos} minutos y sirve una sola vez. Si no lo pediste tú, ignora este correo: nadie puede entrar sin el código.`;
  return {
    asunto: `${opts.codigo} es tu código de Mi gafete · ${opts.empresa}`,
    html: marco({
      empresa: opts.empresa,
      titulo: "Tu código para entrar",
      cuerpoHtml: lineas.map(parrafo).join("") + codigoHtml + parrafo(aviso),
      boton: { texto: "Entrar a Mi gafete", url: opts.url },
    }),
    texto: [titulo, "", ...lineas, "", `Entrar: ${opts.url}`, "", aviso].join("\n"),
  };
}

/** Cambió el estado de una solicitud. */
export function correoEstadoSolicitud(opts: {
  empresa: string;
  nombre: string;
  /** «Corrección de datos», «Reposición de gafete», «Cambio de foto». */
  solicitud: string;
  titulo: string;
  detalle: string;
  motivo?: string | null;
  url: string;
}) {
  const lineas = [saludo(opts.nombre), `${opts.solicitud}: ${opts.detalle}`];
  if (opts.motivo) lineas.push(`Motivo: ${opts.motivo}`);
  return {
    asunto: `${opts.titulo} · ${opts.empresa}`,
    html: marco({
      empresa: opts.empresa,
      titulo: opts.titulo,
      cuerpoHtml: lineas.map(parrafo).join(""),
      boton: { texto: "Ver mis solicitudes", url: opts.url },
    }),
    texto: [opts.titulo, "", ...lineas, "", `Ver mis solicitudes: ${opts.url}`].join("\n"),
  };
}
