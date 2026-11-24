import { NextResponse } from "next/server";
import { enviarResumenSemanal } from "@/lib/avisos/enviar";
import { llaveCron } from "@/lib/avisos/llave-cron";
import { clienteServicio } from "@/lib/supabase/publico";

/**
 * Manda el resumen semanal a los administradores. Lo llama el cron de
 * Cloudflare (ver `worker.ts` y `triggers` en wrangler.jsonc) los lunes en la
 * mañana. Sin la llave correcta responde 404, como si no existiera.
 */
export async function POST(solicitud: Request) {
  const secreto = process.env.SUPABASE_SECRET_KEY;
  const servicio = clienteServicio();
  if (!secreto || !servicio) return new NextResponse(null, { status: 404 });
  if (solicitud.headers.get("x-llave-cron") !== (await llaveCron(secreto))) return new NextResponse(null, { status: 404 });
  const resultado = await enviarResumenSemanal(servicio);
  if (resultado.error) console.error("Resumen semanal:", resultado.error);
  return NextResponse.json(resultado, { status: resultado.error ? 500 : 200 });
}
