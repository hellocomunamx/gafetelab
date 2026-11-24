import { Entrada } from "@/components/cuenta/Entrada";
import { Formulario } from "@/components/cuenta/Formulario";
import { irAEmpresa } from "./acciones";

/** Entrada general del portal: para quien no tiene a la mano la liga de su empresa. */
export default function PortalGeneral() {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-3xl font-extrabold">Mi gafete</h1>
      <p className="mt-2 text-gris">
        Escribe el ID de tu empresa. Te lo da Recursos Humanos, o viene en la liga que te compartieron
        (lagafeteria.com/e/<strong className="text-tinta">id</strong>).
      </p>
      <div className="mt-6 rounded-tarjeta border border-linea bg-white p-5 sm:p-6">
        <Formulario accion={irAEmpresa} boton="Continuar">
          <Entrada etiqueta="ID de la empresa" name="empresa" required autoCapitalize="none" spellCheck={false} maxLength={30} placeholder="por ejemplo: sekiur" />
        </Formulario>
      </div>
    </div>
  );
}
