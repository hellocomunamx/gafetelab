"use client";

import { useRouter } from "next/navigation";
import { type ChangeEvent, useState } from "react";
import { asignarFotos } from "@/app/cuenta/acciones";
import { prepararFoto, rutaFoto } from "@/lib/cuenta/imagen";
import { crearClienteNavegador } from "@/lib/supabase/client";

/** Foto de una persona: la muestra y permite subir o cambiarla. */
export function FotoEmpleado({
  empresaId,
  empleadoId,
  url,
  children,
}: {
  empresaId: string;
  empleadoId: string;
  url?: string;
  /** Acción extra junto al botón (por ejemplo, quitar la foto). */
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");

  async function cargar(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!archivo) return;
    setError("");
    setSubiendo(true);
    try {
      const foto = await prepararFoto(archivo);
      const ruta = rutaFoto(empresaId, empleadoId);
      const { error: falla } = await crearClienteNavegador()
        .storage.from("fotos")
        .upload(ruta, foto, { contentType: "image/jpeg", upsert: true });
      if (falla) throw falla;
      const resultado = await asignarFotos([{ id: empleadoId, ruta }]);
      if (resultado.error) throw new Error(resultado.error);
      router.refresh();
    } catch {
      setError("No pudimos subir la foto. Usa una imagen JPG, PNG o WebP.");
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- liga temporal de almacenamiento privado
        <img src={url} alt="Fotografía" width={180} height={240} className="aspect-[3/4] w-full max-w-[11rem] rounded-tarjeta-chica object-cover" />
      ) : (
        <div className="flex aspect-[3/4] w-full max-w-[11rem] items-center justify-center rounded-tarjeta-chica bg-papel text-sm text-gris">
          Sin fotografía
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <label className="inline-flex cursor-pointer items-center rounded-full border border-tinta px-4 py-1.5 font-semibold hover:bg-papel">
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={cargar} disabled={subiendo} className="sr-only" />
          {subiendo ? "Subiendo…" : url ? "Cambiar foto" : "Subir foto"}
        </label>
        {children}
      </div>
      {error ? <p role="alert" className="mt-2 text-sm font-medium text-rojo-oscuro">{error}</p> : null}
    </div>
  );
}
