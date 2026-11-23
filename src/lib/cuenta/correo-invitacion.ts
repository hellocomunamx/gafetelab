import { roles } from "@/lib/cuenta/roles";
import { site } from "@/lib/site";
import { escapar } from "@/lib/solicitudes";

/** Correo que avisa a alguien que lo invitaron a la plataforma de una empresa. */
export function correoInvitacion(opts: {
  empresa: string;
  rol: "administrador" | "editor";
  invita: string;
  liga: string;
}) {
  const rol = roles[opts.rol].nombre.toLowerCase();
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#EEF0F5;font-family:Arial,Helvetica,sans-serif;color:#1B1F3B;">
<div style="max-width:520px;margin:0 auto;padding:24px;">
<div style="background:#fff;border-radius:14px;overflow:hidden;">
<div style="background:#E63B2E;color:#fff;padding:20px 24px;">
<p style="margin:0;font-size:20px;font-weight:bold;">${escapar(site.nombre)}</p>
</div>
<div style="padding:24px;">
<p style="margin:0 0 12px;font-size:18px;font-weight:bold;">Te invitaron a ${escapar(opts.empresa)}</p>
<p style="margin:0 0 20px;font-size:15px;line-height:1.55;">${escapar(opts.invita)} te dio acceso como ${rol} a la plataforma de ${escapar(opts.empresa)} en ${escapar(site.nombre)}, donde se administran los gafetes y credenciales del equipo.</p>
<p style="margin:0 0 20px;"><a href="${escapar(opts.liga)}" style="display:inline-block;background:#E63B2E;color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px;font-size:15px;">Entrar y aceptar la invitación</a></p>
<p style="margin:0;font-size:13px;line-height:1.5;color:#5C6178;">Entra con este mismo correo. Si es tu primera vez, tu cuenta se crea sola. Si no esperabas esta invitación, ignora este mensaje.</p>
</div></div>
</div></body></html>`;
  const texto = [
    `Te invitaron a ${opts.empresa}`,
    "",
    `${opts.invita} te dio acceso como ${rol} a la plataforma de ${opts.empresa} en ${site.nombre}.`,
    "",
    `Entra con este mismo correo y acepta la invitación: ${opts.liga}`,
  ].join("\n");
  return { asunto: `Te invitaron a ${opts.empresa} en ${site.nombre}`, html, texto };
}
