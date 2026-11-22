"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { guardarConstancia } from "@/app/cuenta/acciones";
import { claseBoton, claseEntrada } from "@/components/cuenta/Formulario";
import { PESO_MAXIMO_CONSTANCIA, rutaConstancia, TIPOS_CONSTANCIA, type TipoConstancia } from "@/lib/cuenta/constancia";
import { crearClienteNavegador } from "@/lib/supabase/client";

/** Sube la Constancia de Situación Fiscal de la empresa y la deja en revisión. */
export function SubirConstancia({
  empresaId,
  desde,
  hasta,
  meses,
  boton = "Subir constancia",
}: {
  empresaId: string;
  /** Fechas de emisión aceptadas, AAAA-MM-DD. */
  desde: string;
  hasta: string;
  meses: number;
  boton?: string;
}) {
  const router = useRouter();
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    const archivo = datos.get("archivo");
    const fecha = String(datos.get("fecha") ?? "");
    setError("");
    if (!(archivo instanceof File) || !archivo.size) return setError("Elige el archivo de tu constancia.");
    if (!(archivo.type in TIPOS_CONSTANCIA)) return setError("Sube tu constancia en PDF, JPG o PNG.");
    if (archivo.size > PESO_MAXIMO_CONSTANCIA) return setError("El archivo pesa más de 5 MB. Sube uno más ligero.");
    if (!fecha) return setError("Escribe la fecha de emisión que aparece en tu constancia.");
    if (fecha > hasta) return setError("La fecha de emisión no puede ser futura.");
    if (fecha < desde) {
      return setError(`Tu constancia tiene más de ${meses} meses. Descarga una nueva en el portal del SAT y súbela.`);
    }
    setSubiendo(true);
    try {
      const ruta = rutaConstancia(empresaId, TIPOS_CONSTANCIA[archivo.type as TipoConstancia]);
      const { error: falla } = await crearClienteNavegador()
        .storage.from("constancias")
        .upload(ruta, archivo, { contentType: archivo.type });
      if (falla) throw new Error("No pudimos subir el archivo. Intenta de nuevo.");
      const resultado = await guardarConstancia({ ruta, fecha });
      if (resultado.error) throw new Error(resultado.error);
      router.push("/cuenta/constancia");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos subir el archivo. Intenta de nuevo.");
      setSubiendo(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-5" noValidate>
      <label className="block">
        <span className="font-semibold">Archivo de tu constancia</span>
        <span className="block text-sm text-gris">PDF, JPG o PNG de hasta 5 MB. El PDF que descargas del SAT es lo ideal.</span>
        <input
          type="file"
          name="archivo"
          accept="application/pdf,image/jpeg,image/png"
          disabled={subiendo}
          className="mt-2 block w-full text-sm file:mr-4 file:cursor-pointer file:rounded-full file:border file:border-solid file:border-tinta file:bg-white file:px-4 file:py-2 file:font-semibold"
        />
      </label>
      <label className="block sm:max-w-xs">
        <span className="font-semibold">Fecha de emisión</span>
        <span className="block text-sm text-gris">Viene en la constancia, en «Lugar y fecha de emisión».</span>
        <input type="date" name="fecha" min={desde} max={hasta} disabled={subiendo} className={claseEntrada} />
      </label>
      {error ? <p role="alert" className="rounded-tarjeta-chica bg-rojo/10 p-3 text-sm font-medium text-rojo-oscuro">{error}</p> : null}
      <button type="submit" disabled={subiendo} className={claseBoton}>
        {subiendo ? "Subiendo…" : boton}
      </button>
    </form>
  );
}
