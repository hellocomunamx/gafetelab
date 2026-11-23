"use client";

import { useState, useTransition } from "react";
import { enviarLigaPorCorreo, marcarLigaEnviada } from "@/app/cuenta/equipo/ligas/acciones";
import type { Resultado } from "@/lib/cuenta/tipos";
import { claseBoton, claseBotonSecundario } from "./Formulario";

const claseChico = "inline-flex items-center rounded-full border border-tinta px-3 py-1 text-sm font-semibold hover:bg-papel disabled:opacity-60";

/** Las tres formas de hacerle llegar su liga a una persona: copiarla, WhatsApp o correo. */
export function AccionesLiga({
  id,
  url,
  mensaje,
  correo,
  yaEnviada = false,
}: {
  id: string;
  /** La liga completa de la persona. */
  url: string;
  /** Mensaje ya escrito, con la liga, para WhatsApp. */
  mensaje: string;
  correo: string | null;
  yaEnviada?: boolean;
}) {
  const [aviso, setAviso] = useState<Resultado>({});
  const [enviando, iniciar] = useTransition();

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setAviso({ ok: "Liga copiada." });
      void marcarLigaEnviada(id);
    } catch {
      setAviso({ error: "No se pudo copiar. Selecciónala y cópiala a mano." });
    }
  }

  const porCorreo = () =>
    iniciar(async () => {
      setAviso({});
      setAviso(await enviarLigaPorCorreo(id).catch(() => ({ error: "No pudimos mandar el correo. Intenta de nuevo." })));
    });

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={copiar} className={claseChico}>Copiar liga</button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(mensaje)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => void marcarLigaEnviada(id)}
          className={claseChico}
        >
          WhatsApp
        </a>
        {correo ? (
          <button type="button" onClick={porCorreo} disabled={enviando} className={claseChico}>
            {enviando ? "Enviando…" : yaEnviada ? "Reenviar correo" : "Enviar correo"}
          </button>
        ) : null}
      </div>
      {aviso.error ? (
        <p role="alert" className="mt-1.5 text-xs font-medium text-rojo-oscuro">{aviso.error}</p>
      ) : aviso.ok ? (
        <p role="status" className="mt-1.5 text-xs font-medium text-[#0a7d4f]">{aviso.ok}</p>
      ) : null}
    </div>
  );
}

/** Botón que primero pide confirmar y luego llama a una acción del servidor y muestra su resultado. */
export function BotonConfirmado({
  accion,
  texto,
  pregunta,
  confirmar,
  ocupado = "Enviando…",
  secundario = false,
}: {
  accion: () => Promise<Resultado>;
  texto: string;
  /** Lo que se le explica antes de confirmar. */
  pregunta: string;
  confirmar: string;
  ocupado?: string;
  secundario?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [aviso, setAviso] = useState<Resultado>({});
  const [enviando, iniciar] = useTransition();

  const correr = () =>
    iniciar(async () => {
      setAviso({});
      setAviso(await accion().catch(() => ({ error: "Algo falló. Intenta de nuevo." })));
      setAbierto(false);
    });

  return (
    <div>
      {abierto ? (
        <div className="rounded-tarjeta-chica bg-papel p-4">
          <p className="text-sm">{pregunta}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={correr} disabled={enviando} className={claseBoton}>
              {enviando ? ocupado : confirmar}
            </button>
            <button type="button" onClick={() => setAbierto(false)} disabled={enviando} className={claseBotonSecundario}>
              Mejor no
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAbierto(true)} className={secundario ? claseBotonSecundario : claseBoton}>
          {texto}
        </button>
      )}
      {aviso.error ? (
        <p role="alert" className="mt-2 text-sm font-medium text-rojo-oscuro">{aviso.error}</p>
      ) : aviso.ok ? (
        <p role="status" className="mt-2 text-sm font-medium text-[#0a7d4f]">{aviso.ok}</p>
      ) : null}
    </div>
  );
}
