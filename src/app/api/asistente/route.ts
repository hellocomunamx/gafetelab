import Anthropic from "@anthropic-ai/sdk";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { asistente, instruccionesAsistente } from "@/lib/asistente";
import { legal, site, urlAbsoluta } from "@/lib/site";
import { error, esBot, leerCuerpo, mismoOrigen } from "@/lib/solicitudes";

type Mensaje = { role: "user" | "assistant"; content: string };

/** Binding de Rate Limiting de Cloudflare (ver `ratelimits` en wrangler.jsonc). */
type Limitador = { limit: (opciones: { key: string }) => Promise<{ success: boolean }> };

const contacto = `Si prefieres, una persona del equipo te ayuda en [el formulario de contacto](${urlAbsoluta("/contacto")}) o en ${site.correo}, ${legal.horario}.`;

/** Las instrucciones son fijas: se arman una vez por instancia del Worker. */
let instrucciones: string | null = null;

/**
 * Respaldo en memoria para `next dev` o si el binding no existe: cuenta por
 * instancia, así que solo frena ráfagas. En producción manda el binding.
 */
const ventanas = new Map<string, { inicio: number; cuenta: number }>();
function dentroDelLimiteLocal(clave: string, limite: number): boolean {
  const ahora = Date.now();
  const v = ventanas.get(clave);
  if (!v || ahora - v.inicio > 60_000) {
    if (ventanas.size > 5_000) ventanas.clear();
    ventanas.set(clave, { inicio: ahora, cuenta: 1 });
    return true;
  }
  v.cuenta += 1;
  return v.cuenta <= limite;
}

async function dentroDelLimite(ip: string): Promise<boolean> {
  let env: Record<string, unknown> = {};
  try {
    env = getCloudflareContext().env as unknown as Record<string, unknown>;
  } catch {
    // Fuera de Cloudflare (por ejemplo, `next start`): se usa el respaldo.
  }
  const porPersona = env.LIMITE_ASISTENTE as Limitador | undefined;
  const global = env.LIMITE_ASISTENTE_GLOBAL as Limitador | undefined;

  const personaOk = porPersona
    ? (await porPersona.limit({ key: ip })).success
    : dentroDelLimiteLocal(ip, asistente.porMinutoPorPersona);
  if (!personaOk) return false;
  return global
    ? (await global.limit({ key: "global" })).success
    : dentroDelLimiteLocal("global", asistente.porMinutoGlobal);
}

/** Valida la conversación que manda el navegador y se queda con lo más reciente. */
function limpiarMensajes(valor: unknown): Mensaje[] | null {
  if (!Array.isArray(valor) || valor.length === 0 || valor.length > 200) return null;
  const mensajes: Mensaje[] = [];
  for (const m of valor) {
    if (!m || typeof m !== "object") return null;
    const { role, content } = m as Record<string, unknown>;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null;
    const texto = content.trim().slice(0, role === "user" ? asistente.maxCaracteres : 4_000);
    if (!texto) return null;
    mensajes.push({ role, content: texto });
  }
  // Debe alternar y terminar con la persona.
  if (mensajes.at(-1)?.role !== "user") return null;
  for (let i = 1; i < mensajes.length; i++) {
    if (mensajes[i].role === mensajes[i - 1].role) return null;
  }
  let recientes = mensajes.slice(-asistente.maxHistorial);
  if (recientes[0].role === "assistant") recientes = recientes.slice(1);
  return recientes;
}

/** Respuesta fija, en el mismo formato que el chat (texto en streaming). */
function textoFijo(texto: string, estado = 200) {
  return new Response(texto, {
    status: estado,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/**
 * Asistente de IA del sitio. Recibe la conversación y responde en streaming,
 * en texto simple. Solo platica: no lee ni toca cuentas, pedidos ni datos.
 */
export async function POST(solicitud: Request) {
  if (!mismoOrigen(solicitud)) return error("Origen no permitido.", 403);

  const cuerpo = await leerCuerpo(solicitud);
  if (!cuerpo) return error("Solicitud inválida.", 400);
  if (esBot(cuerpo)) return textoFijo("¡Gracias!");

  const mensajes = limpiarMensajes(cuerpo.mensajes);
  if (!mensajes) return error("Solicitud inválida.", 400);

  const turnos = Array.isArray(cuerpo.mensajes)
    ? cuerpo.mensajes.filter((m) => (m as Mensaje)?.role === "user").length
    : 0;
  if (turnos > asistente.maxTurnos) {
    return textoFijo(
      `¡Qué buena plática! Ya llegamos al límite de esta conversación. Para seguir, puedes empezar una nueva o escribirle al equipo. ${contacto}`,
    );
  }

  const ip =
    solicitud.headers.get("cf-connecting-ip") ??
    solicitud.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "desconocida";
  if (!(await dentroDelLimite(ip))) {
    return textoFijo(
      "Estoy atendiendo muchas preguntas en este momento. Dame un minuto y vuelve a escribirme, por favor.",
      429,
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return textoFijo(`El asistente todavía no está activo. ${contacto}`, 503);
  }

  instrucciones ??= instruccionesAsistente();
  const cliente = new Anthropic({ maxRetries: 1, timeout: 60_000 });

  const flujo = cliente.beta.messages.stream({
    model: asistente.modelo,
    max_tokens: asistente.maxTokens,
    output_config: { effort: asistente.esfuerzo },
    // Si el modelo declina una respuesta, la API la reintenta con otro modelo.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [{ type: "text", text: instrucciones, cache_control: { type: "ephemeral" } }],
    messages: mensajes,
  });

  const codificador = new TextEncoder();
  const cuerpoRespuesta = new ReadableStream<Uint8Array>({
    async start(control) {
      let escribio = false;
      try {
        for await (const evento of flujo) {
          if (evento.type === "content_block_delta" && evento.delta.type === "text_delta") {
            escribio = true;
            control.enqueue(codificador.encode(evento.delta.text));
          }
        }
        const final = await flujo.finalMessage();
        if (final.stop_reason === "refusal" || !escribio) {
          control.enqueue(
            codificador.encode(
              `${escribio ? "\n\n" : ""}Mejor te paso con el equipo para esto. ${contacto}`,
            ),
          );
        } else if (final.stop_reason === "max_tokens") {
          control.enqueue(codificador.encode("…"));
        }
      } catch (e) {
        console.error("Asistente:", e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : e);
        control.enqueue(
          codificador.encode(
            `${escribio ? "\n\n" : ""}Uy, se me cruzaron los cables y no pude terminar de responder. Intenta de nuevo en un momento. ${contacto}`,
          ),
        );
      } finally {
        control.close();
      }
    },
    cancel() {
      flujo.abort();
    },
  });

  return new Response(cuerpoRespuesta, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
