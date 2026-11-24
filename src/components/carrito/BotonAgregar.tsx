"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ArticuloCarrito } from "@/lib/carrito";
import { carritoMaximoArticulos } from "@/lib/carrito";
import { agregarAlCarrito } from "@/lib/carrito-navegador";

type SinId<T> = T extends unknown ? Omit<T, "id"> : never;

const estilos = {
  primario: "bg-rojo text-white hover:bg-rojo-oscuro",
  secundario: "border border-tinta text-tinta hover:bg-papel",
};

/**
 * Agrega algo al carrito. Con `irAlCarrito` lleva directo al carrito ("Lo
 * quiero"); si no, se queda en la página y ofrece ir a pagar.
 */
export function BotonAgregar({
  articulo,
  texto = "Agregar al carrito",
  irAlCarrito = false,
  variante = "primario",
  className = "",
  deshabilitado = false,
}: {
  articulo: SinId<ArticuloCarrito>;
  texto?: string;
  irAlCarrito?: boolean;
  variante?: keyof typeof estilos;
  className?: string;
  deshabilitado?: boolean;
}) {
  const router = useRouter();
  // El aviso es de lo que se agregó: si la persona cambia su elección, desaparece
  // y el botón vuelve a ofrecer agregar lo nuevo.
  const clave = JSON.stringify(articulo);
  const [aviso, setAviso] = useState<{ tipo: "agregado" | "lleno"; clave: string } | null>(null);
  const estado = aviso && aviso.clave === clave ? aviso.tipo : "inactivo";

  function agregar() {
    if (!agregarAlCarrito(articulo)) return setAviso({ tipo: "lleno", clave });
    if (irAlCarrito) router.push("/carrito");
    else setAviso({ tipo: "agregado", clave });
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={agregar}
        disabled={deshabilitado}
        className={`inline-flex w-full items-center justify-center rounded-full px-5 py-2.5 font-semibold transition-colors disabled:opacity-50 ${estilos[variante]}`}
      >
        {texto}
      </button>
      {estado === "inactivo" ? null : (
      <p role="status" className="mt-2 text-center text-sm">
        {estado === "agregado" ? (
          <>
            <span aria-hidden>✓ </span>Listo, está en tu carrito.{" "}
            <Link href="/carrito" className="font-semibold text-rojo underline underline-offset-4">
              Ver carrito y pagar
            </Link>
            <span className="mt-1 block text-gris">O sigue eligiendo: por pieza o en paquete, todo va al mismo carrito.</span>
          </>
        ) : estado === "lleno" ? (
          <span className="text-rojo-oscuro">
            Tu carrito ya tiene {carritoMaximoArticulos} artículos.{" "}
            <Link href="/carrito" className="font-semibold underline underline-offset-4">
              Ver carrito
            </Link>
          </span>
        ) : null}
      </p>
      )}
    </div>
  );
}
