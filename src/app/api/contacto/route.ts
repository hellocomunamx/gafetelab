import { limitesContacto, motivosContacto } from "@/lib/contacto";
import { correoActivo, enviarCorreo } from "@/lib/correo";
import { correoAcuse } from "@/lib/correo-acuse";
import { dentroDelLimite, ipDe, MENSAJE_LIMITE } from "@/lib/seguridad/limites";
import { MENSAJE_TURNSTILE, verificarTurnstile } from "@/lib/seguridad/turnstile";
import { site } from "@/lib/site";
import { CORREO_VALIDO, error, esBot, escapar, leerCuerpo, mismoOrigen } from "@/lib/solicitudes";

const recortar = (valor: unknown, maximo: number) => String(valor ?? "").trim().slice(0, maximo);

/**
 * Recibe el formulario de contacto y lo manda al buzón del sitio. La respuesta
 * a ese correo le llega directo a quien escribió (reply-to). Después le manda a
 * quien escribió un acuse de recibo; si el acuse falla, el mensaje ya llegó y
 * no se le muestra error.
 */
export async function POST(solicitud: Request) {
  if (!mismoOrigen(solicitud)) return error("Origen no permitido.", 403);

  const cuerpo = await leerCuerpo(solicitud);
  if (!cuerpo) return error("Solicitud inválida.", 400);
  if (esBot(cuerpo)) return Response.json({ ok: true });

  const nombre = recortar(cuerpo.nombre, limitesContacto.nombre);
  const correo = String(cuerpo.correo ?? "").trim().toLowerCase();
  const empresa = recortar(cuerpo.empresa, limitesContacto.empresa);
  const telefono = recortar(cuerpo.telefono, limitesContacto.telefono);
  const mensaje = recortar(cuerpo.mensaje, limitesContacto.mensaje);
  const motivo = motivosContacto.find((m) => m === cuerpo.motivo) ?? motivosContacto[0];

  if (nombre.length < 2) return error("Escribe tu nombre.", 400);
  if (correo.length > 254 || !CORREO_VALIDO.test(correo)) {
    return error("Escribe un correo válido.", 400);
  }
  if (mensaje.length < 10) return error("Cuéntanos un poco más en tu mensaje.", 400);

  // Contra envíos masivos: por IP y por correo (el acuse le llega a ese correo).
  const ip = ipDe(solicitud.headers);
  if (!(await dentroDelLimite("LIMITE_FORMULARIOS", `contacto:${ip}`)) || !(await dentroDelLimite("LIMITE_ACCESO_CORREO", `contacto:${correo}`))) {
    return error(MENSAJE_LIMITE, 429);
  }
  if (!(await verificarTurnstile(cuerpo.turnstile, ip))) return error(MENSAJE_TURNSTILE, 403);

  if (!correoActivo()) {
    return error(
      `El formulario todavía no está activo. Mientras tanto, escríbenos a ${site.correo}.`,
      503,
    );
  }

  const datos = [
    ["Motivo", motivo],
    ["Nombre", nombre],
    ["Correo", correo],
    ["Empresa", empresa],
    ["Teléfono o WhatsApp", telefono],
  ].filter(([, valor]) => valor);

  const celda = "padding:8px 12px;border-bottom:1px solid #DCDFEA;font-size:14px;vertical-align:top;";
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#EEF0F5;font-family:Arial,Helvetica,sans-serif;color:#1B1F3B;">
<div style="max-width:600px;margin:0 auto;padding:24px;">
<div style="background:#fff;border-radius:14px;overflow:hidden;">
<div style="background:#E63B2E;color:#fff;padding:20px 24px;">
<p style="margin:0;font-size:20px;font-weight:bold;">${escapar(site.nombre)}</p>
<p style="margin:4px 0 0;font-size:14px;">Mensaje desde el formulario de contacto</p>
</div>
<div style="padding:24px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
${datos.map(([etiqueta, valor]) => `<tr><td style="${celda}color:#5C6178;white-space:nowrap;">${escapar(etiqueta)}</td><td style="${celda}">${escapar(valor)}</td></tr>`).join("")}
</table>
<p style="margin:20px 0 0;font-size:15px;line-height:1.55;white-space:pre-wrap;">${escapar(mensaje)}</p>
</div></div>
<p style="font-size:12px;color:#5C6178;text-align:center;margin:16px 0 0;">Responde a este correo para contestarle a ${escapar(nombre)}.</p>
</div></body></html>`;

  const texto = [...datos.map(([etiqueta, valor]) => `${etiqueta}: ${valor}`), "", mensaje].join("\n");

  const resultado = await enviarCorreo({
    para: site.correo,
    responderA: correo,
    asunto: `Contacto: ${motivo} · ${empresa || nombre}`,
    html,
    texto,
  });

  if (resultado.error) {
    console.error("No se pudo enviar el mensaje de contacto:", resultado.error);
    return error(`No pudimos enviar tu mensaje. Intenta de nuevo o escríbenos a ${site.correo}.`, 502);
  }

  const acuse = correoAcuse({ nombre, motivo });
  const envioAcuse = await enviarCorreo({ para: correo, ...acuse }).catch((falla: unknown) => ({ error: falla }));
  if (envioAcuse.error) console.error("No se pudo enviar el acuse de contacto:", envioAcuse.error);

  return Response.json({ ok: true });
}
