import type { MotivoContacto } from "@/lib/contacto";
import { afiliados, site } from "@/lib/site";
import { escapar } from "@/lib/solicitudes";

/** Una línea extra según el motivo, para que el acuse no suene a robot. */
const extraPorMotivo: Partial<Record<MotivoContacto, string>> = {
  "Tengo una idea": "Nos encanta que nos propongan cosas: leemos cada idea con calma.",
  "Pedido especial": `Si tienes un diseño, una lista o una foto de referencia, mándala a ${site.correo}.`,
  "Paquete prepagado": "Te mandamos la propuesta del paquete en cuanto la revisemos.",
  "Ya hice un pedido": `Si no lo pusiste en tu mensaje, escríbenos a ${site.correo} con el número de tu pedido para encontrarlo más rápido.`,
  Factura: `Si no lo pusiste en tu mensaje, escríbenos a ${site.correo} con el número de tu pedido y tu RFC.`,
};

/**
 * Nombre para el saludo: solo la primera palabra y sin nada que parezca liga,
 * para que nadie use el formulario para mandarle texto propio a otra persona.
 */
function primerNombre(nombre: string) {
  const palabra = nombre.trim().split(/\s+/)[0] ?? "";
  return /^[\p{L}'-]{2,24}$/u.test(palabra) ? palabra : "";
}

/** Marca en la liga del afiliado que la visita vino de este correo. */
function conCampana(url: string) {
  const liga = new URL(url);
  liga.searchParams.set("utm_medium", "correo");
  liga.searchParams.set("utm_campaign", "acuse-contacto");
  return liga.toString();
}

/**
 * Acuse que recibe quien escribe en el formulario de contacto. No repite el
 * mensaje: así el formulario no sirve para mandar texto ajeno a cualquier correo.
 */
export function correoAcuse(opts: { nombre: string; motivo: MotivoContacto }) {
  const nombre = primerNombre(opts.nombre);
  const saludo = nombre ? `¡Hola, ${nombre}!` : "¡Hola!";
  const cuerpo = `Gracias por escribirnos. Ya tenemos tu mensaje («${opts.motivo}») y te responderemos lo antes posible al correo que nos dejaste.`;
  const extra = extraPorMotivo[opts.motivo];
  const mientras = "Mientras tanto, si quieres saber cuánto cuestan tus gafetes y credenciales, el cotizador en línea te da el precio al momento.";
  const cotizar = `${site.url}/cotizar`;
  const aviso = `Recibiste este correo porque alguien escribió con esta dirección en ${site.dominio}. Si no fuiste tú, ignóralo.`;
  const afiliado = afiliados.find((a) => a.url && a.texto);
  const ligaAfiliado = afiliado ? conCampana(afiliado.url!) : "";

  const pie = afiliado
    ? `<div style="max-width:520px;margin:16px auto 0;padding:14px 18px;border:1px solid #DCDFEA;border-radius:12px;background:#F7F8FB;">
<p style="margin:0 0 4px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#5C6178;">También te puede servir</p>
<p style="margin:0;font-size:13px;line-height:1.5;color:#1B1F3B;"><a href="${escapar(ligaAfiliado)}" style="color:#1B1F3B;font-weight:bold;text-decoration:none;">${escapar(afiliado.nombre)}</a> · ${escapar(afiliado.texto!)} <a href="${escapar(ligaAfiliado)}" style="color:#E63B2E;text-decoration:none;font-weight:bold;white-space:nowrap;">Conócelo&nbsp;→</a></p>
</div>`
    : "";

  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#EEF0F5;font-family:Arial,Helvetica,sans-serif;color:#1B1F3B;">
<div style="max-width:520px;margin:0 auto;padding:24px;">
<div style="background:#fff;border-radius:14px;overflow:hidden;">
<div style="background:#E63B2E;color:#fff;padding:20px 24px;">
<p style="margin:0;font-size:20px;font-weight:bold;">${escapar(site.nombre)}</p>
<p style="margin:4px 0 0;font-size:14px;">Hola, soy tu acuse de recibo.</p>
</div>
<div style="padding:24px;">
<p style="margin:0 0 12px;font-size:18px;font-weight:bold;">${escapar(saludo)}</p>
<p style="margin:0 0 12px;font-size:15px;line-height:1.55;">${escapar(cuerpo)}</p>
${extra ? `<p style="margin:0 0 12px;font-size:15px;line-height:1.55;">${escapar(extra)}</p>` : ""}
<p style="margin:0 0 20px;font-size:15px;line-height:1.55;">${escapar(mientras)}</p>
<p style="margin:0 0 24px;"><a href="${escapar(cotizar)}" style="display:inline-block;background:#E63B2E;color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px;font-size:15px;">Cotizar en línea</a></p>
<p style="margin:0;font-size:15px;line-height:1.55;">Un abrazo,<br><strong>El equipo de ${escapar(site.nombre)}</strong></p>
</div></div>
${pie}
<p style="max-width:520px;margin:16px auto 0;font-size:12px;line-height:1.5;color:#5C6178;text-align:center;">${escapar(aviso)}</p>
</div></body></html>`;

  const texto = [
    saludo,
    "",
    cuerpo,
    ...(extra ? ["", extra] : []),
    "",
    `${mientras} ${cotizar}`,
    "",
    "Un abrazo,",
    `El equipo de ${site.nombre}`,
    ...(afiliado ? ["", "—", `También te puede servir: ${afiliado.nombre}. ${afiliado.texto} ${ligaAfiliado}`] : []),
    "",
    aviso,
  ].join("\n");

  return { asunto: nombre ? `¡Recibimos tu mensaje, ${nombre}!` : "¡Recibimos tu mensaje!", html, texto };
}
