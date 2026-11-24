/**
 * Cloudflare Turnstile: la casilla anti-bots (casi siempre invisible) de los
 * formularios públicos. Mientras no estén las llaves, no se pide nada.
 *
 * - NEXT_PUBLIC_TURNSTILE_SITE_KEY: llave pública, va en `.env.production`.
 * - TURNSTILE_SECRET_KEY: llave secreta, va como secreto del Worker.
 *
 * En entrar y crear cuenta no se verifica aquí: el token se le pasa a Supabase
 * (captchaToken) y Supabase lo verifica, porque cada token sirve una sola vez.
 */
export const CAMPO_TURNSTILE = "cf-turnstile-response";

export const turnstileActivo = () => Boolean(process.env.TURNSTILE_SECRET_KEY);

export const MENSAJE_TURNSTILE = "No pudimos confirmar que eres una persona. Recarga la página y vuelve a intentar.";

/** ¿El token es válido? Sin llave secreta configurada, siempre sí. */
export async function verificarTurnstile(token: unknown, ip: string): Promise<boolean> {
  const secreto = process.env.TURNSTILE_SECRET_KEY;
  if (!secreto) return true;
  if (typeof token !== "string" || !token || token.length > 2048) return false;
  try {
    const cuerpo = new FormData();
    cuerpo.set("secret", secreto);
    cuerpo.set("response", token);
    if (ip !== "desconocida") cuerpo.set("remoteip", ip);
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: cuerpo });
    const datos = (await r.json()) as { success?: boolean };
    return datos.success === true;
  } catch (e) {
    // Si Cloudflare no responde, se deja pasar: los límites por IP siguen activos.
    console.error("Turnstile:", e);
    return true;
  }
}

/** Token para Supabase Auth, si el formulario lo trae. */
export function tokenTurnstile(datos: FormData): string | undefined {
  const t = datos.get(CAMPO_TURNSTILE);
  return typeof t === "string" && t ? t : undefined;
}
