"use client";

import { useEffect, useRef, useState } from "react";
import { CAMPO_TURNSTILE } from "@/lib/seguridad/turnstile";

type Api = {
  render: (lugar: HTMLElement, opciones: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Api;
  }
}

const LLAVE = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let cargando: Promise<Api | undefined> | null = null;
function cargar(): Promise<Api | undefined> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  cargando ??= new Promise((listo) => {
    const s = document.createElement("script");
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => listo(window.turnstile);
    s.onerror = () => {
      cargando = null;
      listo(undefined);
    };
    document.head.appendChild(s);
  });
  return cargando;
}

/**
 * Casilla anti-bots de Cloudflare. Casi siempre es invisible: solo aparece si
 * Cloudflare duda. Dentro de un <form> deja el token en un campo oculto; para
 * formularios que mandan JSON, usa `alToken`. Cada token sirve una vez: cambia
 * `reinicio` (por ejemplo, el resultado del envío) para pedir otro.
 * Sin NEXT_PUBLIC_TURNSTILE_SITE_KEY no muestra nada.
 */
export function Turnstile({ alToken, reinicio }: { alToken?: (token: string) => void; reinicio?: unknown }) {
  const lugar = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const avisar = useRef(alToken);
  const [token, setToken] = useState("");

  useEffect(() => {
    avisar.current = alToken;
  }, [alToken]);

  useEffect(() => {
    if (!LLAVE) return;
    let vivo = true;
    void cargar().then((api) => {
      if (!vivo || !api || !lugar.current) return;
      const poner = (t: string) => {
        setToken(t);
        avisar.current?.(t);
      };
      widget.current = api.render(lugar.current, {
        sitekey: LLAVE,
        appearance: "interaction-only",
        language: "es",
        callback: poner,
        "expired-callback": () => poner(""),
        "error-callback": () => poner(""),
      });
    });
    return () => {
      vivo = false;
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, []);

  // Después de cada envío se pide un token nuevo.
  const primera = useRef(true);
  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    if (widget.current && window.turnstile) {
      setToken("");
      avisar.current?.("");
      window.turnstile.reset(widget.current);
    }
  }, [reinicio]);

  if (!LLAVE) return null;
  return (
    <>
      <div ref={lugar} className="mt-3 empty:mt-0" />
      <input type="hidden" name={CAMPO_TURNSTILE} value={token} />
    </>
  );
}
