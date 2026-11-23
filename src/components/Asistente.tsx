"use client";

import { usePathname } from "next/navigation";
import { type FormEvent, type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { asistente, saludoAsistente, sugerenciasAsistente } from "@/lib/asistente-publico";

type Mensaje = { role: "user" | "assistant"; content: string };

const CLAVE = "lagafeteria-asistente";
/** Dentro de la plataforma no se muestra: ahí la persona está trabajando. */
const OCULTO_EN = ["/cuenta", "/entrar", "/salir", "/auth"];

/** Negritas y enlaces del texto del asistente, sin HTML crudo. */
function enLinea(texto: string, clave: string): ReactNode[] {
  const partes: ReactNode[] = [];
  const patron = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)|(https?:\/\/[^\s)]+[^\s).,;:!?])/g;
  let ultimo = 0;
  let i = 0;
  for (const m of texto.matchAll(patron)) {
    if (m.index > ultimo) partes.push(texto.slice(ultimo, m.index));
    const k = `${clave}-${i++}`;
    if (m[1]) {
      partes.push(<strong key={k}>{m[1]}</strong>);
    } else {
      const url = m[3] ?? m[4];
      const etiqueta = m[2] ?? m[4];
      if (/^(https?:\/\/|\/|mailto:)/.test(url)) {
        const externo = /^https?:\/\//.test(url) && !url.includes("lagafeteria.com");
        partes.push(
          <a
            key={k}
            href={url}
            className="font-semibold text-rojo underline underline-offset-2"
            {...(externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {etiqueta}
          </a>,
        );
      } else {
        partes.push(etiqueta);
      }
    }
    ultimo = m.index + m[0].length;
  }
  if (ultimo < texto.length) partes.push(texto.slice(ultimo));
  return partes;
}

/** Párrafos y listas cortas, que es todo el formato que usa el asistente. */
function Texto({ texto }: { texto: string }) {
  const bloques = texto.split(/\n{2,}/);
  return (
    <>
      {bloques.map((bloque, b) => {
        const lineas = bloque.split("\n");
        const esLista = lineas.every((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l));
        if (esLista) {
          return (
            <ul key={b} className="my-1 list-disc space-y-1 pl-5">
              {lineas.map((l, n) => (
                <li key={n}>{enLinea(l.replace(/^\s*([-*•]|\d+[.)])\s+/, ""), `${b}-${n}`)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={b} className="my-1 first:mt-0 last:mb-0">
            {lineas.map((l, n) => (
              <span key={n}>
                {n > 0 && <br />}
                {enLinea(l, `${b}-${n}`)}
              </span>
            ))}
          </p>
        );
      })}
    </>
  );
}

function Escribiendo() {
  return (
    <span className="inline-flex gap-1 py-1" aria-label={`${asistente.nombre} está escribiendo`}>
      {[0, 1, 2].map((n) => (
        <span
          key={n}
          className="size-2 animate-bounce rounded-full bg-gris/60 motion-reduce:animate-none"
          style={{ animationDelay: `${n * 150}ms` }}
        />
      ))}
    </span>
  );
}

/**
 * Asistente de IA del sitio: un botón flotante que abre un chat. Platica y
 * resuelve dudas; no tiene acceso a ninguna cuenta. La conversación vive solo
 * en esta pestaña del navegador.
 */
export function Asistente({ correoSitio }: { correoSitio: string }) {
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);
  // La conversación se recupera al cargar: el chat empieza cerrado, así que el
  // HTML del servidor y el del navegador coinciden.
  const [mensajes, setMensajes] = useState<Mensaje[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const guardado = JSON.parse(sessionStorage.getItem(CLAVE) ?? "[]");
      return Array.isArray(guardado) ? guardado : [];
    } catch {
      return [];
    }
  });
  const [texto, setTexto] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const lista = useRef<HTMLDivElement>(null);
  const entrada = useRef<HTMLTextAreaElement>(null);
  const boton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(CLAVE, JSON.stringify(mensajes));
    } catch {
      // Sin almacenamiento: no pasa nada.
    }
    lista.current?.scrollTo({ top: lista.current.scrollHeight });
  }, [mensajes, abierto]);

  useEffect(() => {
    if (abierto) entrada.current?.focus();
  }, [abierto]);

  if (OCULTO_EN.some((p) => ruta === p || ruta.startsWith(`${p}/`))) return null;

  function cerrar() {
    setAbierto(false);
    boton.current?.focus();
  }

  async function preguntar(pregunta: string) {
    const limpia = pregunta.trim().slice(0, asistente.maxCaracteres);
    if (!limpia || ocupado) return;
    const conversacion: Mensaje[] = [...mensajes, { role: "user", content: limpia }];
    setMensajes([...conversacion, { role: "assistant", content: "" }]);
    setTexto("");
    setOcupado(true);

    const escribir = (contenido: string) =>
      setMensajes([...conversacion, { role: "assistant", content: contenido }]);

    try {
      const respuesta = await fetch("/api/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensajes: conversacion }),
      });
      if (!respuesta.body) throw new Error("Sin respuesta");
      const tipo = respuesta.headers.get("content-type") ?? "";
      if (tipo.includes("application/json")) {
        const datos = await respuesta.json().catch(() => ({}));
        escribir(datos.mensaje ?? `No pude responder. Escríbenos a ${correoSitio}.`);
        return;
      }
      const lector = respuesta.body.getReader();
      const decodificador = new TextDecoder();
      let acumulado = "";
      for (;;) {
        const { done, value } = await lector.read();
        if (done) break;
        acumulado += decodificador.decode(value, { stream: true });
        escribir(acumulado);
      }
      if (!acumulado.trim()) escribir(`No pude responder. Escríbenos a ${correoSitio}.`);
    } catch {
      escribir(
        `No pude conectarme. Revisa tu conexión e intenta de nuevo, o escríbenos a ${correoSitio}.`,
      );
    } finally {
      setOcupado(false);
      entrada.current?.focus();
    }
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    preguntar(texto);
  }

  function teclas(evento: KeyboardEvent<HTMLTextAreaElement>) {
    if (evento.key === "Enter" && !evento.shiftKey && !evento.nativeEvent.isComposing) {
      evento.preventDefault();
      preguntar(texto);
    }
  }

  function reiniciar() {
    setMensajes([]);
    entrada.current?.focus();
  }

  return (
    <>
      {!abierto && (
        <button
          ref={boton}
          type="button"
          onClick={() => setAbierto(true)}
          className="fixed right-4 bottom-4 z-40 flex items-center gap-2 rounded-full bg-rojo py-3 pr-5 pl-4 font-semibold text-white shadow-lg shadow-tinta/20 transition hover:bg-rojo-oscuro sm:right-6 sm:bottom-6"
          aria-haspopup="dialog"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" strokeLinejoin="round" />
            <path d="M8.5 12h.01M12 12h.01M15.5 12h.01" strokeLinecap="round" strokeWidth={2.6} />
          </svg>
          <span>
            <span className="sm:hidden">¿Dudas?</span>
            <span className="hidden sm:inline">¿Dudas? Pregúntale a {asistente.nombre}</span>
          </span>
        </button>
      )}

      {abierto && (
        <div
          role="dialog"
          aria-modal="false"
          aria-label={`Chat con ${asistente.nombre}, el asistente de LaGafetería`}
          onKeyDown={(e) => e.key === "Escape" && cerrar()}
          className="fixed inset-x-0 bottom-0 z-40 flex h-[min(640px,88dvh)] flex-col overflow-hidden rounded-t-tarjeta border border-linea bg-white shadow-2xl shadow-tinta/25 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[400px] sm:rounded-tarjeta"
        >
          <header className="flex items-center gap-3 bg-tinta px-4 py-3 text-white">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-rojo font-titulos text-lg font-extrabold">
              {asistente.nombre.charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-titulos text-lg leading-tight font-extrabold">{asistente.nombre}</p>
              <p className="text-xs text-white/75">Asistente con IA · responde al momento</p>
            </div>
            {mensajes.length > 0 && (
              <button
                type="button"
                onClick={reiniciar}
                disabled={ocupado}
                className="rounded-full px-2 py-1 text-xs text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-50"
              >
                Nueva plática
              </button>
            )}
            <button
              type="button"
              onClick={cerrar}
              className="grid size-9 place-items-center rounded-full hover:bg-white/10"
              aria-label="Cerrar el chat"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
              </svg>
            </button>
          </header>

          <div ref={lista} className="flex-1 space-y-3 overflow-y-auto bg-papel px-4 py-4" aria-live="polite">
            <div className="max-w-[85%] rounded-tarjeta rounded-tl-sm bg-white px-4 py-2.5 text-[15px] leading-relaxed shadow-sm">
              {saludoAsistente}
            </div>
            {mensajes.length === 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {sugerenciasAsistente.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => preguntar(s)}
                    className="rounded-full border border-linea bg-white px-3 py-1.5 text-sm text-tinta transition hover:border-rojo hover:text-rojo"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {mensajes.map((m, i) =>
              m.role === "user" ? (
                <div
                  key={i}
                  className="ml-auto max-w-[85%] rounded-tarjeta rounded-tr-sm bg-rojo px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap text-white"
                >
                  {m.content}
                </div>
              ) : (
                <div
                  key={i}
                  className="max-w-[85%] rounded-tarjeta rounded-tl-sm bg-white px-4 py-2.5 text-[15px] leading-relaxed shadow-sm"
                >
                  {m.content ? <Texto texto={m.content} /> : <Escribiendo />}
                </div>
              ),
            )}
          </div>

          <form onSubmit={enviar} className="border-t border-linea bg-white px-3 pt-3 pb-2">
            <div className="flex items-end gap-2">
              <label htmlFor="asistente-pregunta" className="sr-only">
                Escribe tu pregunta
              </label>
              <textarea
                id="asistente-pregunta"
                ref={entrada}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={teclas}
                rows={1}
                maxLength={asistente.maxCaracteres}
                placeholder="Escribe tu pregunta…"
                className="max-h-32 min-h-11 flex-1 resize-none rounded-tarjeta-chica border border-linea bg-white px-3 py-2.5 text-base [field-sizing:content]"
              />
              <button
                type="submit"
                disabled={ocupado || !texto.trim()}
                className="grid size-11 shrink-0 place-items-center rounded-full bg-rojo text-white transition hover:bg-rojo-oscuro disabled:opacity-40"
                aria-label="Enviar"
              >
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
                  <path d="M5 12h13M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] leading-snug text-gris">
              Soy una IA y puedo equivocarme. No compartas datos personales.{" "}
              <a href="/contacto" className="underline">
                ¿Prefieres a una persona?
              </a>
            </p>
          </form>
        </div>
      )}
    </>
  );
}
