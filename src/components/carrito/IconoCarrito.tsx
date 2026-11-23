"use client";

import Link from "next/link";
import { useCarrito } from "@/lib/carrito-navegador";

/** Carrito del encabezado, con cuántos artículos lleva. */
export function IconoCarrito() {
  const n = useCarrito().length;
  return (
    <Link
      href="/carrito"
      aria-label={n ? `Carrito, ${n} ${n === 1 ? "artículo" : "artículos"}` : "Carrito"}
      className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-papel"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6" />
        <circle cx="10" cy="20.5" r="1.3" />
        <circle cx="17" cy="20.5" r="1.3" />
      </svg>
      {n ? (
        <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rojo px-1 text-xs font-bold text-white">
          {n}
        </span>
      ) : null}
    </Link>
  );
}
