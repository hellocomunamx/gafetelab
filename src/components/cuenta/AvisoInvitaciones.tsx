"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Franja que avisa de invitaciones por aceptar. Se oculta en la página donde se aceptan. */
export function AvisoInvitaciones({ empresas }: { empresas: string[] }) {
  const ruta = usePathname();
  if (!empresas.length || ruta.startsWith("/cuenta/invitaciones")) return null;
  return (
    <p className="bg-resaltador px-4 py-2 text-center text-sm font-medium">
      {empresas.length === 1
        ? `Te invitaron a la plataforma de ${empresas[0]}.`
        : `Tienes ${empresas.length} invitaciones por aceptar.`}{" "}
      <Link href="/cuenta/invitaciones" className="font-semibold underline underline-offset-4">
        {empresas.length === 1 ? "Ver invitación" : "Ver invitaciones"}
      </Link>
    </p>
  );
}
