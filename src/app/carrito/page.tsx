import type { Metadata } from "next";
import { Contenedor } from "@/components/ui";
import { requerirEmpresa } from "@/lib/cuenta/sesion";
import { stripeActivo } from "@/lib/stripe";
import { clienteServicio } from "@/lib/supabase/publico";
import { crearClienteServidor } from "@/lib/supabase/server";
import { Carrito, type EstadoCompra } from "./Carrito";

export const metadata: Metadata = {
  title: "Tu carrito",
  robots: { index: false, follow: false },
};

/** Qué le falta a la persona para pagar: entrar, aceptar los términos, crear su empresa o nada. */
async function estadoDeCompra(): Promise<EstadoCompra> {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { paso: "entrar" };
  const { data: aceptaciones, error } = await supabase.from("aceptaciones").select("terminos_version").limit(1);
  if (!error && !aceptaciones?.length) return { paso: "aceptar" };
  const { data: empresas } = await supabase.from("empresas").select("id").limit(1);
  if (!empresas?.length) return { paso: "empresa" };

  const { empresa, administra } = await requerirEmpresa();
  if (!administra) return { paso: "sin_permiso", empresa: empresa.nombre };
  if (!stripeActivo() || !clienteServicio()) return { paso: "sin_pago", empresa: empresa.nombre };
  const { data: fiscales } = await supabase
    .from("datos_fiscales")
    .select("id, rfc, razon_social")
    .eq("empresa_id", empresa.id)
    .order("predeterminado", { ascending: false })
    .order("creado_en");
  return {
    paso: "listo",
    empresa: empresa.nombre,
    correo: data.user.email ?? "",
    fiscales: (fiscales ?? []).map((f) => ({ id: f.id, titulo: f.rfc, texto: f.razon_social })),
  };
}

export default async function PaginaCarrito() {
  return (
    <Contenedor className="py-10 sm:py-14">
      <h1 className="text-4xl font-extrabold">Tu carrito</h1>
      <Carrito estado={await estadoDeCompra()} />
    </Contenedor>
  );
}
