import { site } from "@/lib/site";
import { escapar } from "@/lib/solicitudes";

/** Correo que le avisa a una persona que su gafete digital ya está activo, con su liga personal. */
export function correoGafeteDigital(opts: { nombre: string; empresa: string; liga: string }) {
  const primerNombre = opts.nombre.trim().split(/\s+/)[0] ?? "";
  const saludo = primerNombre ? `Hola, ${primerNombre}` : "Hola";
  const titulo = "Tu gafete digital ya está listo";
  const cuerpo = `${opts.empresa} activó tu gafete digital. Ábrelo desde tu celular con el botón y guárdalo en tu pantalla de inicio para tenerlo siempre a la mano. No necesitas crear cuenta.`;
  const nota = `Esta liga es personal: no la compartas. Si no trabajas en ${opts.empresa}, ignora este mensaje.`;

  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#EEF0F5;font-family:Arial,Helvetica,sans-serif;color:#1B1F3B;">
<div style="max-width:520px;margin:0 auto;padding:24px;">
<div style="background:#fff;border-radius:14px;overflow:hidden;">
<div style="background:#E63B2E;color:#fff;padding:20px 24px;">
<p style="margin:0;font-size:20px;font-weight:bold;">${escapar(site.nombre)}</p>
</div>
<div style="padding:24px;">
<p style="margin:0 0 12px;font-size:18px;font-weight:bold;">${escapar(titulo)}</p>
<p style="margin:0 0 20px;font-size:15px;line-height:1.55;">${escapar(saludo)}. ${escapar(cuerpo)}</p>
<p style="margin:0 0 20px;"><a href="${escapar(opts.liga)}" style="display:inline-block;background:#E63B2E;color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px;font-size:15px;">Abrir mi gafete digital</a></p>
<p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:#5C6178;">Si el botón no abre, copia esta liga en tu navegador:<br><span style="word-break:break-all;">${escapar(opts.liga)}</span></p>
<p style="margin:0;font-size:13px;line-height:1.5;color:#5C6178;">${escapar(nota)}</p>
</div></div>
</div></body></html>`;
  const texto = [titulo, "", `${saludo}. ${cuerpo}`, "", `Tu gafete digital: ${opts.liga}`, "", nota].join("\n");
  return {
    asunto: `Tu gafete digital de ${opts.empresa} ya está listo`,
    html,
    texto,
  };
}
