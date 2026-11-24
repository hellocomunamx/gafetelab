"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { guardarIne } from "@/app/cuenta/verificacion/acciones";
import { CartaResponsabilidad } from "@/components/cuenta/CartaResponsabilidad";
import { claseBoton, claseEntrada } from "@/components/cuenta/Formulario";
import { ACEPTA_VERIFICACION, extensionDe, FORMATOS_VERIFICACION, prepararArchivo } from "@/lib/cuenta/archivo-verificacion";
import { ligaValida, rutaConstancia } from "@/lib/cuenta/constancia";
import { crearClienteNavegador } from "@/lib/supabase/client";

const claseArchivo =
  "mt-2 block w-full text-sm file:mr-4 file:cursor-pointer file:rounded-full file:border file:border-solid file:border-tinta file:bg-white file:px-4 file:py-2 file:font-semibold";

/** Para quien no tiene RFC: INE de quien responde y una prueba del negocio (liga o foto). */
export function SubirIne({ empresaId, nombreEmpresa }: { empresaId: string; nombreEmpresa: string }) {
  const router = useRouter();
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
  const [cartaAceptada, setCartaAceptada] = useState(false);

  const archivo = (d: FormData, clave: string) => {
    const a = d.get(clave);
    return a instanceof File && a.size ? a : null;
  };
  // Convierte HEIC a JPG y achica fotos pesadas; null si no hay archivo.
  const preparar = async (a: File | null, nombre: string) => {
    if (!a) return null;
    const listo = await prepararArchivo(a, nombre);
    if ("error" in listo) throw new Error(listo.error);
    return listo.archivo;
  };

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const d = new FormData(evento.currentTarget);
    const frente = archivo(d, "frente");
    const reverso = archivo(d, "reverso");
    const foto = archivo(d, "foto");
    const negocio = String(d.get("negocio") ?? "").trim();
    const textoLiga = String(d.get("liga") ?? "").trim();
    setError("");
    if (!negocio) return setError("Escribe el nombre de tu negocio como aparece en los gafetes.");
    if (!frente) return setError("Sube la foto de tu INE por el frente.");
    if (textoLiga && !ligaValida(textoLiga)) return setError("Revisa la liga: cópiala completa desde tu navegador.");
    if (!textoLiga && !foto) return setError("Agrega la liga a tus redes o a Google Maps, o una foto de tu negocio.");
    if (!cartaAceptada) return setError("Para continuar, debes aceptar la carta de responsabilidad: léela y marca la casilla «Acepto la carta de responsabilidad».");
    setSubiendo(true);
    try {
      const listos = [
        await preparar(frente, "tu INE"),
        await preparar(reverso, "el reverso de tu INE"),
        await preparar(foto, "la foto de tu negocio"),
      ];
      const almacen = crearClienteNavegador().storage.from("constancias");
      const subir = async (a: File | null) => {
        if (!a) return null;
        const ruta = rutaConstancia(empresaId, extensionDe(a));
        const { error: falla } = await almacen.upload(ruta, a, { contentType: a.type });
        if (falla) throw new Error("No pudimos subir tus archivos. Intenta de nuevo.");
        return ruta;
      };
      const [ruta, rutaReverso, rutaFoto] = await Promise.all(listos.map(subir));
      const resultado = await guardarIne({
        ruta: ruta as string,
        reverso: rutaReverso,
        prueba: rutaFoto,
        liga: textoLiga,
        negocio,
        carta: true,
      });
      if (resultado.error) throw new Error(resultado.error);
      router.push("/cuenta/verificacion");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos subir tus archivos. Intenta de nuevo.");
      setSubiendo(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-5" noValidate>
      <fieldset disabled={subiendo} className="space-y-5">
        <label className="block">
          <span className="font-semibold">Nombre de tu negocio, como aparece en los gafetes</span>
          <input name="negocio" defaultValue={nombreEmpresa} maxLength={120} className={claseEntrada} />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="font-semibold">Tu INE, por el frente</span>
            <span className="block text-sm text-gris">{FORMATOS_VERIFICACION}.</span>
            <input type="file" name="frente" accept={ACEPTA_VERIFICACION} className={claseArchivo} />
          </label>
          <label className="block">
            <span className="font-semibold">Reverso <span className="font-normal text-gris">(opcional)</span></span>
            <span className="block text-sm text-gris">Si lo tienes a la mano, mejor. {FORMATOS_VERIFICACION}.</span>
            <input type="file" name="reverso" accept={ACEPTA_VERIFICACION} className={claseArchivo} />
          </label>
        </div>

        <div className="rounded-tarjeta-chica border border-linea p-4">
          <p className="font-semibold">Una prueba de tu negocio</p>
          <p className="text-sm text-gris">
            Con una basta: que se vea el mismo nombre o logo que llevarán los gafetes.
          </p>
          <label className="mt-3 block">
            <span className="text-sm font-semibold">Liga a tu Facebook, Instagram, Google Maps o sitio web</span>
            <input name="liga" type="url" inputMode="url" placeholder="https://www.facebook.com/tunegocio" maxLength={500} className={claseEntrada} />
          </label>
          <p className="my-3 text-center text-sm text-gris">o</p>
          <label className="block">
            <span className="text-sm font-semibold">Foto de tu local, fachada, menú o uniforme</span>
            <span className="block text-sm text-gris">{FORMATOS_VERIFICACION}.</span>
            <input type="file" name="foto" accept={ACEPTA_VERIFICACION} className={claseArchivo} />
          </label>
        </div>
      </fieldset>

      <CartaResponsabilidad aceptada={cartaAceptada} alCambiar={setCartaAceptada} deshabilitada={subiendo} />
      {error ? <p role="alert" className="rounded-tarjeta-chica bg-rojo/10 p-3 text-sm font-medium text-rojo-oscuro">{error}</p> : null}
      <button type="submit" disabled={subiendo} className={claseBoton}>
        {subiendo ? "Subiendo…" : "Mandar a revisión"}
      </button>
    </form>
  );
}
