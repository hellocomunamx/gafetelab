import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { NavCuenta } from "@/components/cuenta/NavCuenta";
import { SelectorEmpresa } from "@/components/cuenta/SelectorEmpresa";
import { Contenedor } from "@/components/ui";
import { COOKIE_EMPRESA, requerirUsuario } from "@/lib/cuenta/sesion";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: { default: "Mi cuenta", template: "%s | Mi cuenta" },
  robots: { index: false, follow: false },
};

export default async function CuentaLayout({ children }: { children: ReactNode }) {
  const { supabase, usuario } = await requerirUsuario();
  const { data: empresas } = await supabase.from("empresas").select("id, nombre").order("creado_en");
  const elegida = (await cookies()).get(COOKIE_EMPRESA)?.value;
  const actual = empresas?.find((e) => e.id === elegida) ?? empresas?.[0];

  return (
    <div className="min-h-[70vh] bg-papel">
      <div className="border-b border-linea">
        <Contenedor className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {empresas && empresas.length > 1 ? (
              <SelectorEmpresa empresas={empresas} actual={actual?.id} />
            ) : (
              <p className="font-titulos text-lg font-extrabold">{actual?.nombre ?? "Mi cuenta"}</p>
            )}
            {actual ? <NavCuenta /> : null}
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gris">{usuario.email}</span>
            {actual ? (
              <Link href="/cuenta/empresa/nueva" className="underline">Otra empresa</Link>
            ) : null}
            <form action="/salir" method="post">
              <button type="submit" className="font-semibold underline">Salir</button>
            </form>
          </div>
        </Contenedor>
      </div>
      <Contenedor className="py-8 sm:py-10">{children}</Contenedor>
    </div>
  );
}
