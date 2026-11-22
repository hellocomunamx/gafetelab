import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Contenedor } from "@/components/ui";
import { requerirAdmin } from "@/lib/admin/sesion";

export const metadata: Metadata = {
  title: { default: "Administración", template: "%s | Administración" },
  robots: { index: false, follow: false },
};

/** Panel de quien opera LaGafetería. A cualquier otra persona le responde "no existe". */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requerirAdmin();
  return (
    <div className="min-h-[70vh] bg-papel">
      <div className="border-b border-linea">
        <Contenedor className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="font-titulos text-lg font-extrabold">Administración</p>
            <nav aria-label="Administración" className="flex gap-1">
              <Link href="/admin" className="rounded-full px-4 py-2 text-sm font-semibold hover:bg-white">
                Empresas
              </Link>
            </nav>
          </div>
          <Link href="/cuenta" className="text-sm underline">
            Volver a mi cuenta
          </Link>
        </Contenedor>
      </div>
      <Contenedor className="py-8 sm:py-10">{children}</Contenedor>
    </div>
  );
}
