"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

// La sesión de Supabase vive en la cookie sb-<proyecto>-auth-token (a veces en partes .0, .1).
const SESION = /(?:^|;\s*)sb-[^=]+-auth-token(?:\.0)?=/;
const conSesion = () => SESION.test(document.cookie);
const sinCambios = () => () => {};

/**
 * "Entrar" para quien no ha iniciado sesión y "Mi cuenta" para quien sí.
 * Se decide en el navegador para que las páginas públicas sigan siendo estáticas.
 */
export function EnlaceCuenta({ className }: { className?: string }) {
  const dentro = useSyncExternalStore(sinCambios, conSesion, () => false);
  return (
    <Link href={dentro ? "/cuenta" : "/entrar"} className={className}>
      {/* Silueta de persona: separa la cuenta de las páginas del menú. */}
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden className="shrink-0 text-rojo">
        <circle cx="8" cy="5" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M2.5 14.5a5.5 5.5 0 0 1 11 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      {dentro ? "Mi cuenta" : "Entrar"}
    </Link>
  );
}
