/**
 * Llave con la que el cron de Cloudflare llama al resumen semanal. Se deriva
 * de SUPABASE_SECRET_KEY (que ya está en el Worker), así que no hace falta
 * configurar otro secreto. La misma cuenta se hace en `worker.ts`.
 */
export async function llaveCron(secreto: string): Promise<string> {
  const datos = new TextEncoder().encode(`lagafeteria:avisos-semanal:${secreto}`);
  const huella = await crypto.subtle.digest("SHA-256", datos);
  return [...new Uint8Array(huella)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
