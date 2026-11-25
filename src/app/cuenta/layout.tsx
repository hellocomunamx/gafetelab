import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MenuPerfil } from "@/components/cuenta/MenuPerfil";
import { NavCuenta } from "@/components/cuenta/NavCuenta";
import { SelectorEmpresa } from "@/components/cuenta/SelectorEmpresa";
import { Contenedor } from "@/components/ui";
import { AvisoInvitaciones } from "@/components/cuenta/AvisoInvitaciones";
import { RUTA_ADMIN } from "@/lib/admin/ruta";
import { esAdminPlataforma } from "@/lib/admin/sesion";
import { COOKIE_EMPRESA, misInvitaciones, requerirUsuario } from "@/lib/cuenta/sesion";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: { default: "Mi cuenta", template: "%s | Mi cuenta" },
  robots: { index: false, follow: false },
};

export default async function CuentaLayout({ children }: { children: ReactNode }) {
  const { supabase, usuario } = await requerirUsuario();
  const [{ data: empresas }, { data: perfil }, invitaciones, esAdmin] = await Promise.all([
    supabase.from("empresas").select("id, nombre, tipo, padre_id, datos_borrados_en").order("creado_en"),
    supabase.from("perfiles").select("nombre").eq("id", usuario.id).maybeSingle(),
    misInvitaciones(),
    esAdminPlataforma(),
  ]);
  const elegida = (await cookies()).get(COOKIE_EMPRESA)?.value;
  const actual = empresas?.find((e) => e.id === elegida) ?? empresas?.[0];

  return (
    <div className="min-h-[70vh] bg-papel">
      <AvisoInvitaciones empresas={invitaciones.map((i) => i.empresa)} />
      <div className="border-b border-linea">
        <Contenedor className="flex flex-col gap-3 py-4">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            {empresas && empresas.length > 1 ? (
              <SelectorEmpresa empresas={empresas} actual={actual?.id} />
            ) : (
              <p className="font-titulos text-lg font-extrabold">{actual?.nombre ?? "Mi cuenta"}</p>
            )}
            <MenuPerfil
              correo={usuario.email ?? ""}
              nombre={perfil?.nombre}
              otraEmpresa={Boolean(actual)}
              rutaAdmin={esAdmin ? RUTA_ADMIN : null}
            />
          </div>
          {actual ? <NavCuenta evento={actual.tipo === "evento"} /> : null}
        </Contenedor>
      </div>
      <Contenedor className="py-8 sm:py-10">{children}</Contenedor>
    </div>
  );
}
