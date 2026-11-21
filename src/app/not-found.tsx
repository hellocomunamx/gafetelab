import type { Metadata } from "next";
import { Etiqueta } from "@/components/Etiqueta";
import { Boton, Contenedor } from "@/components/ui";

export const metadata: Metadata = {
  title: "Página no encontrada",
  robots: { index: false, follow: true },
};

export default function NoEncontrada() {
  return (
    <Contenedor className="flex flex-col items-center gap-8 py-20 text-center">
      <Etiqueta nombre="el 404" giro={-3} />
      <h1 className="text-4xl font-extrabold">Esta página no trae gafete</h1>
      <p className="max-w-md text-gris">
        No encontramos lo que buscabas. Puede que el enlace esté mal escrito o que la página ya no
        exista.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Boton href="/">Ir al inicio</Boton>
        <Boton href="/precios" variante="secundario">
          Ver precios
        </Boton>
      </div>
    </Contenedor>
  );
}
