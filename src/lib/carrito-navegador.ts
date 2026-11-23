"use client";

import { useSyncExternalStore } from "react";
import { type ArticuloCarrito, carritoMaximoArticulos, idArticulo, limpiarArticulo } from "./carrito";

/**
 * El carrito vive en el navegador (localStorage), así se puede llenar sin
 * cuenta. Se pide entrar o crear la cuenta hasta el momento de pagar.
 */

const LLAVE = "lg_carrito";
const EVENTO = "lg-carrito";
const VACIO: ArticuloCarrito[] = [];

let cache: { texto: string | null; articulos: ArticuloCarrito[] } = { texto: null, articulos: VACIO };

function leer(): ArticuloCarrito[] {
  let texto: string | null = null;
  try {
    texto = window.localStorage.getItem(LLAVE);
  } catch {
    return cache.articulos;
  }
  if (texto === cache.texto) return cache.articulos;
  let articulos: ArticuloCarrito[] = VACIO;
  try {
    const datos = JSON.parse(texto ?? "[]");
    if (Array.isArray(datos)) articulos = datos.map(limpiarArticulo).filter((a): a is ArticuloCarrito => Boolean(a));
  } catch {
    articulos = VACIO;
  }
  cache = { texto, articulos };
  return articulos;
}

function guardar(articulos: ArticuloCarrito[]) {
  const texto = JSON.stringify(articulos);
  try {
    window.localStorage.setItem(LLAVE, texto);
  } catch {
    // Sin almacenamiento (modo privado estricto): el carrito dura lo que dure la página.
  }
  cache = { texto, articulos };
  window.dispatchEvent(new Event(EVENTO));
}

function suscribir(aviso: () => void) {
  const alCambiar = (e: Event) => {
    if (e.type === EVENTO || (e as StorageEvent).key === LLAVE) aviso();
  };
  window.addEventListener(EVENTO, alCambiar);
  window.addEventListener("storage", alCambiar);
  return () => {
    window.removeEventListener(EVENTO, alCambiar);
    window.removeEventListener("storage", alCambiar);
  };
}

export const useCarrito = () => useSyncExternalStore(suscribir, leer, () => VACIO);

type SinId<T> = T extends unknown ? Omit<T, "id"> : never;

/** Agrega un artículo. Devuelve false si el carrito ya está lleno. */
export function agregarAlCarrito(articulo: SinId<ArticuloCarrito>): boolean {
  const actuales = leer();
  if (actuales.length >= carritoMaximoArticulos) return false;
  const nuevo = limpiarArticulo({ ...articulo, id: idArticulo() });
  if (!nuevo) return false;
  guardar([...actuales, nuevo]);
  return true;
}

export function quitarDelCarrito(id: string) {
  guardar(leer().filter((a) => a.id !== id));
}

export function cambiarPiezas(id: string, piezas: number) {
  guardar(
    leer().map((a) => {
      if (a.id !== id || a.tipo !== "gafetes") return a;
      return limpiarArticulo({ ...a, piezas }) ?? a;
    }),
  );
}

export function vaciarCarrito() {
  guardar(VACIO);
}
