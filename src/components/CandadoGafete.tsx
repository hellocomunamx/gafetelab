"use client";

import { browserSupportsWebAuthn, platformAuthenticatorIsAvailable, startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  abrirConDispositivo,
  cerrarAhora,
  guardarActivacion,
  opcionesAbrir,
  opcionesActivar,
  quitarDispositivo,
} from "@/app/mi-gafete/candado";

const CANCELADO = "Cancelaste la confirmación. Cuando quieras, vuelve a intentarlo.";

/** Si el navegador dice que la persona canceló, no es un error de verdad. */
function mensajeDe(e: unknown): string {
  if (e instanceof Error && (e.name === "NotAllowedError" || e.name === "AbortError")) return CANCELADO;
  if (e instanceof Error && e.name === "InvalidStateError") return "Este dispositivo ya tiene el candado.";
  return "Tu dispositivo no pudo confirmar. Intenta de nuevo.";
}

function IconoCandado({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="10" width="16" height="11" rx="2.5" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

/**
 * Pantalla de la liga cerrada con candado: un botón que pide la huella, la
 * cara o el PIN del celular. El navegador pide un toque antes de preguntar
 * por la huella, así que no se lanza sola al abrir.
 */
export function PantallaCandado({ liga, empresa }: { liga: string; empresa: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [trabajando, iniciar] = useTransition();
  function abrir() {
    setError("");
    if (!browserSupportsWebAuthn()) {
      return setError("Este navegador no puede usar huella ni cara. Abre tu liga en el celular donde activaste el candado.");
    }
    iniciar(async () => {
      const { opciones, error: fallo } = await opcionesAbrir(liga);
      if (!opciones) return setError(fallo ?? CANCELADO);
      try {
        const respuesta = await startAuthentication({ optionsJSON: opciones });
        const hecho = await abrirConDispositivo(liga, respuesta);
        if (hecho.error) return setError(hecho.error);
        router.refresh();
      } catch (e) {
        setError(mensajeDe(e));
      }
    });
  }

  return (
    <div className="rounded-tarjeta border border-linea bg-white p-6 text-center shadow-lg">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rojo text-white">
        <IconoCandado className="h-7 w-7" />
      </span>
      <h1 className="mt-4 font-titulos text-2xl font-extrabold">Tu gafete tiene candado</h1>
      <p className="mt-2 text-gris">
        Ábrelo con la huella, la cara o el PIN de tu celular. Así nadie más puede ver tu gafete de {empresa}, aunque tenga tu liga.
      </p>
      <button
        type="button"
        onClick={abrir}
        disabled={trabajando}
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-tinta px-6 py-3 font-semibold text-white disabled:opacity-60"
      >
        <IconoCandado className="h-4 w-4" />
        {trabajando ? "Esperando a tu dispositivo…" : "Abrir mi gafete"}
      </button>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-rojo-oscuro">
          {error}
        </p>
      ) : null}
      <p className="mt-6 text-xs text-gris">
        ¿Cambiaste de celular y ya no se abre? Pide a {empresa} que quite el candado de tu gafete; tu liga sigue siendo la misma.
      </p>
    </div>
  );
}

export type DispositivoCandado = { id: string; dispositivo: string | null; creada: string; usada: string | null };

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Hermosillo" });

/**
 * Tarjeta para activar el candado o ver en qué dispositivos está. Solo se
 * muestra si el navegador sabe usar la huella, la cara o el PIN del equipo.
 */
export function AjustesCandado({ liga, dispositivos }: { liga: string; dispositivos: DispositivoCandado[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [trabajando, iniciar] = useTransition();
  const [disponible, setDisponible] = useState<boolean | null>(null);

  useEffect(() => {
    void platformAuthenticatorIsAvailable()
      .then(setDisponible)
      .catch(() => setDisponible(false));
  }, []);

  function activar() {
    setError("");
    iniciar(async () => {
      const { opciones, error: fallo } = await opcionesActivar(liga);
      if (!opciones) return setError(fallo ?? CANCELADO);
      try {
        const respuesta = await startRegistration({ optionsJSON: opciones });
        const hecho = await guardarActivacion(liga, respuesta);
        if (hecho.error) return setError(hecho.error);
        router.refresh();
      } catch (e) {
        setError(mensajeDe(e));
      }
    });
  }

  function quitar(id: string) {
    setError("");
    iniciar(async () => {
      const hecho = await quitarDispositivo(liga, id);
      if (hecho.error) return setError(hecho.error);
      router.refresh();
    });
  }

  function cerrar() {
    iniciar(async () => {
      await cerrarAhora(liga);
      router.refresh();
    });
  }

  const conCandado = dispositivos.length > 0;
  // Sin candado y sin huella en este equipo, no hay nada que ofrecer.
  if (!conCandado && disponible !== true) return null;

  return (
    <div className="rounded-tarjeta border border-linea bg-white p-5 text-sm">
      <div className="flex items-start gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${conCandado ? "bg-[#0a7d4f] text-white" : "bg-papel text-tinta"}`}>
          <IconoCandado className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold">{conCandado ? "Candado activado" : "Protege tu gafete con tu huella o tu cara"}</p>
          <p className="mt-1 text-gris">
            {conCandado
              ? "Tu liga solo se abre después de confirmar con la huella, la cara o el PIN de tu dispositivo."
              : "Tu liga es fija y siempre es la misma. Con el candado, solo se abre después de confirmar con la huella, la cara o el PIN de este celular, aunque alguien más tenga la liga."}
          </p>
        </div>
      </div>

      {conCandado ? (
        <ul className="mt-4 divide-y divide-linea rounded-tarjeta-chica border border-linea">
          {dispositivos.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <span className="min-w-0">
                <span className="font-semibold">{d.dispositivo ?? "Dispositivo"}</span>
                <span className="block text-xs text-gris">
                  Desde el {fecha(d.creada)}
                  {d.usada ? ` · último uso el ${fecha(d.usada)}` : ""}
                </span>
              </span>
              <button
                type="button"
                onClick={() => quitar(d.id)}
                disabled={trabajando}
                className="shrink-0 font-semibold text-rojo-oscuro underline underline-offset-4 disabled:opacity-60"
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {disponible ? (
          <button
            type="button"
            onClick={activar}
            disabled={trabajando}
            className="rounded-full bg-tinta px-4 py-2 font-semibold text-white disabled:opacity-60"
          >
            {trabajando ? "Esperando a tu dispositivo…" : conCandado ? "Agregar este dispositivo" : "Activar candado"}
          </button>
        ) : null}
        {conCandado ? (
          <button type="button" onClick={cerrar} disabled={trabajando} className="font-semibold underline underline-offset-4 disabled:opacity-60">
            Cerrar ahora
          </button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-rojo-oscuro">
          {error}
        </p>
      ) : null}
    </div>
  );
}
