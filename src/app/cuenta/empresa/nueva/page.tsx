import type { Metadata } from "next";
import { Bloque, Entrada } from "@/components/cuenta/Entrada";
import { Formulario } from "@/components/cuenta/Formulario";
import { giros } from "@/lib/giros";
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
        <Formulario accion={crearEmpresa} boton="Crear mi plataforma" className="space-y-4">
          <Entrada etiqueta="Nombre de tu empresa" name="nombre" required maxLength={120} autoFocus />
          <label className="block">
            <span className="text-sm font-semibold">Giro (opcional)</span>
            <input
              name="giro"
              list="giros"
              maxLength={80}
              className="mt-1.5 w-full rounded-tarjeta-chica border border-linea bg-white px-3.5 py-2.5"
            />
            <datalist id="giros">
              {giros.map((g) => (
                <option key={g.slug} value={g.nombre.charAt(0).toUpperCase() + g.nombre.slice(1)} />
              ))}
            </datalist>
          </label>
        </Formulario>
      </Bloque>
    </div>
  );
}
