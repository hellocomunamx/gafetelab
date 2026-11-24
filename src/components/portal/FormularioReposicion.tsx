"use client";

import { type ChangeEvent, type FormEvent, startTransition, useActionState, useState } from "react";
import { pedirReposicion } from "@/app/e/acciones";
import { claseBoton, claseEntrada } from "@/components/cuenta/clases";
import type { Resultado } from "@/lib/cuenta/tipos";
import { pesos, REQUISITOS, type Requisito, type Reposicion } from "@/lib/cuenta/reposicion";
import { CAUSAS_REPOSICION, type CausaReposicion } from "@/lib/portal/solicitudes";
import { site } from "@/lib/site";

/** Qué requisitos aplican según lo que le pasó al gafete. */
function aplica(r: Requisito, causa: CausaReposicion | null): boolean {
  if (!causa) return false;
  if (r === "carta_extravio") return causa !== "dano";
  if (r === "acta_robo") return causa === "robo";
  if (r === "entregar_anterior") return causa === "dano";
  return true;
}

/** Reduce la foto del documento a lo legible (1600 px) y la manda como JPEG, sin metadatos. */
async function prepararDocumento(archivo: File): Promise<Blob> {
  const imagen = await createImageBitmap(archivo, { imageOrientation: "from-image" });
  const escala = Math.min(1, 1600 / Math.max(imagen.width, imagen.height));
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.round(imagen.width * escala);
  lienzo.height = Math.round(imagen.height * escala);
  const ctx = lienzo.getContext("2d");
  if (!ctx) throw new Error("sin lienzo");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, lienzo.width, lienzo.height);
  ctx.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
  imagen.close();
  return new Promise((ok, mal) => lienzo.toBlob((b) => (b ? ok(b) : mal(new Error("sin imagen"))), "image/jpeg", 0.82));
}

export function FormularioReposicion({ handle, empresa, politica, conDigital }: { handle: string; empresa: string; politica: Reposicion; conDigital: boolean }) {
  const [estado, enviar, enviando] = useActionState<Resultado, FormData>(pedirReposicion, {});
  const [causa, setCausa] = useState<CausaReposicion | null>(null);
  const [documento, setDocumento] = useState<Blob | null>(null);
  const [vista, setVista] = useState<string | null>(null);
  const [errorDoc, setErrorDoc] = useState("");
  const requisitos = politica.requisitos.filter((r) => aplica(r, causa));
  const pideDocumento = requisitos.includes("carta_extravio") || requisitos.includes("acta_robo");

  async function elegir(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    setErrorDoc("");
    if (!archivo) return;
    try {
      const listo = await prepararDocumento(archivo);
      setDocumento(listo);
      if (vista) URL.revokeObjectURL(vista);
      setVista(URL.createObjectURL(listo));
    } catch {
      setErrorDoc("No pudimos leer esa imagen. Usa una foto JPG o PNG.");
    }
  }

  function alEnviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    if (documento) datos.set("comprobante", documento, "documento.jpg");
    startTransition(() => enviar(datos));
  }

  return (
    <form onSubmit={alEnviar} noValidate className="space-y-5">
      <input type="hidden" name="empresa" value={handle} />
      <fieldset>
        <legend className="text-sm font-semibold">¿Qué le pasó a tu gafete?</legend>
        <div className="mt-2 grid gap-2">
          {(Object.entries(CAUSAS_REPOSICION) as [CausaReposicion, string][]).map(([valor, texto]) => (
            <label key={valor} className={`flex cursor-pointer items-center gap-3 rounded-tarjeta-chica border p-3 ${causa === valor ? "border-tinta bg-papel" : "border-linea"}`}>
              <input type="radio" name="causa" value={valor} checked={causa === valor} onChange={() => setCausa(valor)} className="size-4 accent-rojo" />
              <span className="font-medium">{texto}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {causa ? (
        <>
          <div className="rounded-tarjeta-chica border border-resaltador bg-resaltador/20 p-4 text-sm">
            <p className="font-semibold">Lo que pide {empresa}</p>
            <p className="mt-1">
              {politica.costo > 0 ? (
                <>Costo de la reposición: <strong>{pesos(politica.costo)}</strong>. Lo cobra {empresa}, no {site.nombre}.</>
              ) : (
                <>La reposición no tiene costo para ti.</>
              )}
            </p>
            {politica.nota ? <p className="mt-2">{politica.nota}</p> : null}
            {conDigital && causa !== "dano" ? (
              <p className="mt-2">Mientras llega el nuevo, tu gafete digital sigue funcionando en tu celular.</p>
            ) : null}
          </div>

          {requisitos.length || politica.costo > 0 ? (
            <fieldset>
              <legend className="text-sm font-semibold">Confirma cada punto</legend>
              <div className="mt-2 space-y-2">
                {requisitos.map((r) => (
                  <label key={r} className="flex items-start gap-3 text-sm">
                    <input type="checkbox" name="requisitos" value={r} className="mt-0.5 size-5 shrink-0 accent-rojo" />
                    <span>{REQUISITOS[r]}.</span>
                  </label>
                ))}
                {politica.costo > 0 ? (
                  <label className="flex items-start gap-3 text-sm">
                    <input type="checkbox" name="acepto_costo" className="mt-0.5 size-5 shrink-0 accent-rojo" />
                    <span>Sé que la reposición cuesta {pesos(politica.costo)}.</span>
                  </label>
                ) : null}
              </div>
            </fieldset>
          ) : null}

          {pideDocumento ? (
            <div>
              <p className="text-sm font-semibold">Foto de tu {causa === "robo" ? "carta o denuncia" : "carta de extravío"} (opcional)</p>
              <p className="text-xs text-gris">Si ya la tienes, súbela aquí. Si no, entrégala en papel a {empresa}.</p>
              {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local */}
              {vista ? <img src={vista} alt="Documento" className="mt-2 max-h-48 rounded-tarjeta-chica border border-linea" /> : null}
              <label className="mt-2 inline-flex cursor-pointer items-center rounded-full border border-tinta px-4 py-2 text-sm font-semibold">
                <input type="file" accept="image/*" onChange={elegir} className="sr-only" />
                {vista ? "Cambiar foto" : "Tomar o elegir foto"}
              </label>
              {errorDoc ? <p role="alert" className="mt-2 text-sm text-rojo-oscuro">{errorDoc}</p> : null}
            </div>
          ) : null}

          <label className="block">
            <span className="text-sm font-semibold">¿Algo más que deba saber {empresa}? (opcional)</span>
            <textarea name="nota" maxLength={500} rows={3} className={claseEntrada} placeholder="Por ejemplo: lo perdí el viernes en el estacionamiento." />
          </label>
        </>
      ) : null}

      {estado.error ? <p role="alert" className="rounded-tarjeta-chica bg-rojo/10 p-3 text-sm font-medium text-rojo-oscuro">{estado.error}</p> : null}
      <button type="submit" disabled={enviando || !causa} className={`${claseBoton} w-full`}>
        {enviando ? "Enviando…" : `Enviar a ${empresa}`}
      </button>
    </form>
  );
}
