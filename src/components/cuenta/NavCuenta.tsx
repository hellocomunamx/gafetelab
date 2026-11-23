"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ENLACES = [
  { href: "/cuenta", texto: "Resumen" },
  { href: "/cuenta/equipo", texto: "Equipo" },
  { href: "/cuenta/campos", texto: "Campos" },
  { href: "/cuenta/disenos", texto: "Diseños" },
  { href: "/cuenta/pedidos", texto: "Pedidos" },
  { href: "/cuenta/datos", texto: "Envío y facturación" },
  { href: "/cuenta/usuarios", texto: "Usuarios" },
];

export function NavCuenta() {
  const ruta = usePathname();
  return (
    <nav aria-label="Mi cuenta" className="-mx-1 flex gap-1 overflow-x-auto">
      {ENLACES.map((e) => {
        const activo = e.href === "/cuenta" ? ruta === e.href : ruta.startsWith(e.href);
        return (
          <Link
            key={e.href}
            href={e.href}
            aria-current={activo ? "page" : undefined}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
              activo ? "bg-tinta text-white" : "hover:bg-white"
            }`}
          >
            {e.texto}
          </Link>
        );
      })}
    </nav>
  );
}
