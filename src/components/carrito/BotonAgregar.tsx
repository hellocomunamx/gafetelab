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
  const [estado, setEstado] = useState<"inactivo" | "agregado" | "lleno">("inactivo");

  function agregar() {
    if (!agregarAlCarrito(articulo)) return setEstado("lleno");
    if (irAlCarrito) router.push("/carrito");
    else setEstado("agregado");
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={agregar}
        disabled={deshabilitado}
        className={`inline-flex w-full items-center justify-center rounded-full px-5 py-2.5 font-semibold transition-colors disabled:opacity-50 ${estilos[variante]}`}
      >
        {estado === "agregado" ? "Agregar otro igual" : texto}
      </button>
      {estado === "inactivo" ? null : (
      <p role="status" className="mt-2 text-center text-sm">
        {estado === "agregado" ? (
          <>
            <span aria-hidden>✓ </span>Listo, está en tu carrito.{" "}
            <Link href="/carrito" className="font-semibold text-rojo underline underline-offset-4">
              Ver carrito y pagar
            </Link>
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
