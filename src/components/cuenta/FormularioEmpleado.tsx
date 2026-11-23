import { guardarEmpleado } from "@/app/cuenta/acciones";
import { estatusEmpleado } from "@/lib/cuenta/catalogos";
import type { Campo, Empleado } from "@/lib/cuenta/tipos";
import { Entrada, Seleccion } from "./Entrada";
import { Formulario } from "./Formulario";

/** Alta o edición de una persona, con los campos propios de la empresa. */
export function FormularioEmpleado({
  empleado,
  campos,
  departamentos,
  contratos,
}: {
  empleado?: Empleado;
  campos: Campo[];
  departamentos: string[];
  contratos: string[];
}) {
  const etiqueta = (clave: string, respaldo: string) =>
    campos.find((c) => c.clave === clave)?.etiqueta ?? respaldo;
  const propios = campos.filter((c) => !c.de_sistema);
  const datos = (empleado?.datos ?? {}) as Record<string, string>;

  return (
    <Formulario accion={guardarEmpleado} boton={empleado ? "Guardar cambios" : "Agregar persona"}>
      {empleado ? <input type="hidden" name="id" value={empleado.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Entrada etiqueta={etiqueta("nombre", "Nombre")} name="nombre" required maxLength={160} defaultValue={empleado?.nombre} className="sm:col-span-2" />
        <Entrada etiqueta={etiqueta("numero_empleado", "Número de empleado")} name="numero_empleado" maxLength={40} defaultValue={empleado?.numero_empleado ?? ""} />
        <Entrada etiqueta={etiqueta("puesto", "Puesto")} name="puesto" maxLength={120} defaultValue={empleado?.puesto ?? ""} />
        <Entrada etiqueta={etiqueta("departamento", "Departamento")} name="departamento" maxLength={120} list="departamentos" defaultValue={empleado?.departamento ?? ""} />
        <Entrada etiqueta={etiqueta("tipo_contrato", "Tipo de contrato")} name="tipo_contrato" maxLength={60} list="contratos" defaultValue={empleado?.tipo_contrato ?? ""} ayuda="Por ejemplo: Planta, Temporal o Visitante." />
        <Entrada etiqueta="Correo" name="correo" type="email" maxLength={200} defaultValue={empleado?.correo ?? ""} ayuda="Para mandarle su liga. No se imprime en el gafete." />
        {propios.map((c) => (
          <Entrada
            key={c.id}
            etiqueta={c.etiqueta}
            name={`dato_${c.clave}`}
            type={c.tipo === "fecha" ? "date" : "text"}
            maxLength={200}
            defaultValue={datos[c.clave] ?? ""}
          />
        ))}
        {empleado ? null : (
          <Seleccion etiqueta="Estatus" name="estatus" defaultValue="activo">
            {estatusEmpleado.map((e) => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </Seleccion>
        )}
      </div>
      <datalist id="departamentos">
        {departamentos.map((d) => (
          <option key={d} value={d} />
        ))}
      </datalist>
      <datalist id="contratos">
        {[...new Set([...contratos, "Planta", "Temporal", "Visitante"])].map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </Formulario>
  );
}
