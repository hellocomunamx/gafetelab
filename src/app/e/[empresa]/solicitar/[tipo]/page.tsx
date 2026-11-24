import Link from "next/link";
import { notFound } from "next/navigation";
import { CambiarFotoDigital } from "@/components/CambiarFotoDigital";
import { Entrada } from "@/components/cuenta/Entrada";
import { Formulario } from "@/components/cuenta/Formulario";
import { claseEntrada } from "@/components/cuenta/clases";
import { BarraPortal } from "@/components/portal/InicioPortal";
import { FormularioReposicion } from "@/components/portal/FormularioReposicion";
import { cambioFotoDe } from "@/lib/cuenta/cambio-foto";
import { gafeteDigitalDe } from "@/lib/cuenta/gafete-digital";
import { camposPedibles, valorDe } from "@/lib/cuenta/ligas";
import { reposicionDe } from "@/lib/cuenta/reposicion";
import { FORMATO_HANDLE, rutaPortal } from "@/lib/portal/reglas";
import { requerirPortal } from "@/lib/portal/sesion";
import { cancelarFotoPortal, corregirDatos, solicitarFotoPortal } from "../../../acciones";

export const dynamic = "force-dynamic";

const TITULOS = { foto: "Cambiar mi foto", datos: "Corregir mis datos", reposicion: "Reponer mi gafete" } as const;

export default async function NuevaSolicitud({ params }: { params: Promise<{ empresa: string; tipo: string }> }) {
  const { empresa: handle, tipo } = await params;
  if (!FORMATO_HANDLE.test(handle) || !(tipo in TITULOS)) notFound();
  const { servicio, persona, empresa } = await requerirPortal(handle);
  const titulo = TITULOS[tipo as keyof typeof TITULOS];

  let contenido: React.ReactNode;
  if (tipo === "foto") {
    const [cambio, digital] = await Promise.all([cambioFotoDe(servicio, persona.id, empresa.id), gafeteDigitalDe(servicio, persona)]);
    const fotoActual =
      digital?.tipo === "diseno" && digital.foto
        ? digital.foto
        : persona.foto_path
          ? ((await servicio.storage.from("fotos").createSignedUrl(persona.foto_path, 3600)).data?.signedUrl ?? null)
          : null;
    contenido = (
      <CambiarFotoDigital
        liga=""
        empresa={empresa.nombre}
        fotoActual={fotoActual}
        cambio={cambio}
        acciones={{ solicitar: solicitarFotoPortal, cancelar: cancelarFotoPortal }}
      />
    );
  } else if (tipo === "datos") {
    const { data: campos } = await servicio.from("campos").select("clave, etiqueta, tipo, obligatorio").eq("empresa_id", empresa.id).order("orden").order("creado_en");
    const propios = camposPedibles(campos ?? []).filter((c) => !["nombre", "puesto", "departamento", "numero_empleado", "tipo_contrato"].includes(c.clave));
    const lista = [
      { clave: "nombre", etiqueta: "Nombre completo", tipo: "texto" },
      { clave: "puesto", etiqueta: "Puesto", tipo: "texto" },
      { clave: "departamento", etiqueta: "Área o departamento", tipo: "texto" },
      ...propios,
    ];
    contenido = (
      <div className="rounded-tarjeta border border-linea bg-white p-5 sm:p-6">
        <p className="text-sm text-gris">Corrige solo lo que está mal. {empresa.nombre} revisa el cambio antes de que aparezca en tu gafete.</p>
        <Formulario accion={corregirDatos} boton={`Enviar a ${empresa.nombre}`} className="mt-4">
          <input type="hidden" name="empresa" value={handle} />
          <div className="space-y-4">
            {lista.map((c) => (
              <Entrada
                key={c.clave}
                etiqueta={c.etiqueta}
                name={`campo_${c.clave}`}
                type={c.tipo === "fecha" ? "date" : "text"}
                defaultValue={valorDe(persona, c.clave)}
                maxLength={160}
                required={c.clave === "nombre"}
                autoComplete="off"
              />
            ))}
            <label className="block">
              <span className="text-sm font-semibold">¿Por qué el cambio? (opcional)</span>
              <textarea name="nota" maxLength={500} rows={2} className={claseEntrada} placeholder="Por ejemplo: me cambiaron de área en octubre." />
            </label>
          </div>
        </Formulario>
      </div>
    );
  } else {
    const digital = await gafeteDigitalDe(servicio, persona);
    contenido = (
      <div className="rounded-tarjeta border border-linea bg-white p-5 sm:p-6">
        <FormularioReposicion handle={handle} empresa={empresa.nombre} politica={reposicionDe(empresa.reposicion)} conDigital={Boolean(digital)} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <BarraPortal handle={handle} empresa={empresa.nombre} />
      <p className="mt-5 text-sm"><Link href={rutaPortal(handle)} className="underline underline-offset-4">← Mi gafete</Link></p>
      <h1 className="mt-2 text-3xl font-extrabold">{titulo}</h1>
      <div className="mt-5">{contenido}</div>
    </div>
  );
}
