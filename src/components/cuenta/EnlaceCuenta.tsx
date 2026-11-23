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
      {dentro ? "Mi cuenta" : "Entrar"}
    </Link>
  );
}
