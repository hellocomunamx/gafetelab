import type { Metadata } from "next";
import { Bloque, Entrada } from "@/components/cuenta/Entrada";
import { Formulario } from "@/components/cuenta/Formulario";
import { GiroChips } from "@/components/cuenta/GiroChips";
import { opcionesGiro } from "@/lib/giros";
import { crearEmpresa } from "../../acciones";

export const metadata: Metadata = { title: "Nueva empresa" };

export default function NuevaEmpresa() {
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-3xl font-extrabold">Cuéntanos de tu empresa</h1>
      <p className="mt-2 text-gris">
        Con esto creamos tu plataforma. Después podrás invitar a tu equipo de Recursos Humanos.
      </p>
      <Bloque className="mt-6">
        <Formulario accion={crearEmpresa} boton="Crear mi plataforma" className="space-y-5">
          <Entrada etiqueta="Nombre de tu empresa" name="nombre" required maxLength={120} autoFocus />
          <GiroChips opciones={opcionesGiro} opcional />
        </Formulario>
      </Bloque>
    </div>
  );
}
