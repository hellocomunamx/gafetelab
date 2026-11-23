import { roles } from "@/lib/cuenta/roles";
import { site } from "@/lib/site";
import { escapar } from "@/lib/solicitudes";

type Invitada = { nombre: string; rol: "administrador" | "editor" };

/** Une nombres en español: "A", "A y B", "A, B y C". */
const unir = (v: string[]) => (v.length < 2 ? (v[0] ?? "") : `${v.slice(0, -1).join(", ")} y ${v.at(-1)}`);

/** Correo que avisa a alguien que lo invitaron a la plataforma de una o varias empresas. */
export function correoInvitacion(opts: { empresas: Invitada[]; invita: string; liga: string }) {
  const empresas = unir(opts.empresas.map((e) => e.nombre));
  const rol = (e: Invitada) => roles[e.rol].nombre.toLowerCase();
  const una = opts.empresas.length === 1;
  const detalle = una
    ? `te dio acceso como ${rol(opts.empresas[0])} a la plataforma de ${opts.empresas[0].nombre}`
    : `te dio acceso a la plataforma de ${opts.empresas.length} empresas`;
  const lista = una
    ? ""
    : `<ul style="margin:0 0 20px;padding:0;list-style:none;">${opts.empresas
        .map(
          (e) =>
            `<li style="margin:0 0 6px;padding:10px 14px;background:#F6F4EF;border-radius:10px;font-size:15px;"><strong>${escapar(e.nombre)}</strong> · ${escapar(rol(e))}</li>`,
        )
        .join("")}</ul>`;
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#EEF0F5;font-family:Arial,Helvetica,sans-serif;color:#1B1F3B;">
<div style="max-width:520px;margin:0 auto;padding:24px;">
<div style="background:#fff;border-radius:14px;overflow:hidden;">
<div style="background:#E63B2E;color:#fff;padding:20px 24px;">
<p style="margin:0;font-size:20px;font-weight:bold;">${escapar(site.nombre)}</p>
</div>
<div style="padding:24px;">
<p style="margin:0 0 12px;font-size:18px;font-weight:bold;">Te invitaron a ${escapar(empresas)}</p>
<p style="margin:0 0 20px;font-size:15px;line-height:1.55;">${escapar(opts.invita)} ${escapar(detalle)} en ${escapar(site.nombre)}, donde se administran los gafetes y credenciales del equipo.</p>
${lista}<p style="margin:0 0 20px;"><a href="${escapar(opts.liga)}" style="display:inline-block;background:#E63B2E;color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px;font-size:15px;">Activar mi cuenta</a></p>
<p style="margin:0;font-size:13px;line-height:1.5;color:#5C6178;">Crea tu cuenta con este mismo correo o, si ya tienes una, entra con ella. Al terminar quedas en el equipo. Si no esperabas esta invitación, ignora este mensaje.</p>
</div></div>
</div></body></html>`;
  const texto = [
    `Te invitaron a ${empresas}`,
    "",
    `${opts.invita} ${detalle} en ${site.nombre}.`,
    ...(una ? [] : ["", ...opts.empresas.map((e) => `- ${e.nombre}: ${rol(e)}`)]),
    "",
    `Crea tu cuenta o entra con este mismo correo: ${opts.liga}`,
  ].join("\n");
  return { asunto: `Te invitaron a ${empresas} en ${site.nombre}`, html, texto };
}

/** Correo que avisa a alguien que le quitaron el acceso a la plataforma de una empresa. */
export function correoAccesoRetirado(opts: { empresa: string; quien: string; contacto: string | null; liga: string }) {
  const contacto = opts.contacto ? `${opts.quien} (${opts.contacto})` : opts.quien;
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#EEF0F5;font-family:Arial,Helvetica,sans-serif;color:#1B1F3B;">
<div style="max-width:520px;margin:0 auto;padding:24px;">
<div style="background:#fff;border-radius:14px;overflow:hidden;">
<div style="background:#1B1F3B;color:#fff;padding:20px 24px;">
<p style="margin:0;font-size:20px;font-weight:bold;">${escapar(site.nombre)}</p>
</div>
<div style="padding:24px;">
<p style="margin:0 0 12px;font-size:18px;font-weight:bold;">Ya no tienes acceso a ${escapar(opts.empresa)}</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.55;">${escapar(opts.quien)} quitó tu acceso a la plataforma de ${escapar(opts.empresa)} en ${escapar(site.nombre)}. Tu cuenta sigue activa y, si estás en otras empresas, sigues entrando a ellas.</p>
<p style="margin:0 0 20px;font-size:15px;line-height:1.55;">Si crees que es un error, escríbele a ${escapar(contacto)}.</p>
<p style="margin:0 0 20px;"><a href="${escapar(opts.liga)}" style="display:inline-block;background:#E63B2E;color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px;font-size:15px;">Entrar a mi cuenta</a></p>
<p style="margin:0;font-size:13px;line-height:1.5;color:#5C6178;">Este es un aviso automático; no hace falta responderlo.</p>
</div></div>
</div></body></html>`;
  const texto = [
    `Ya no tienes acceso a ${opts.empresa}`,
    "",
    `${opts.quien} quitó tu acceso a la plataforma de ${opts.empresa} en ${site.nombre}. Tu cuenta sigue activa y, si estás en otras empresas, sigues entrando a ellas.`,
    "",
    `Si crees que es un error, escríbele a ${contacto}.`,
    "",
    `Entrar a mi cuenta: ${opts.liga}`,
  ].join("\n");
  return { asunto: `Ya no tienes acceso a ${opts.empresa} en ${site.nombre}`, html, texto };
}
