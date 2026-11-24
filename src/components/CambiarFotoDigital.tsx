"use client";

import { useRouter } from "next/navigation";
import { type ChangeEvent, useEffect, useState } from "react";
import { cancelarCambioFoto, solicitarCambioFoto } from "@/app/mi-gafete/cambio-foto";
import { claseBoton, claseBotonSecundario } from "@/components/cuenta/clases";
import type { CambioFotoPersona } from "@/lib/cuenta/cambio-foto";
import type { Resultado } from "@/lib/cuenta/tipos";
import type { Encuadre } from "@/lib/cuenta/imagen";
import { pesos, REQUISITOS } from "@/lib/cuenta/reposicion";
import { site } from "@/lib/site";
import { AjustarFoto } from "./AjustarFoto";

/* eslint-disable @next/next/no-img-element -- vistas previas locales o ligas temporales de almacenamiento privado */

function Retrato({ src, etiqueta, resaltar = false }: { src?: string | null; etiqueta: string; resaltar?: boolean }) {
  return (
    <figure className="min-w-0 flex-1 text-center">
      {src ? (
        <img
          src={src}
          alt={etiqueta}
          width={150}
          height={200}
          className={`mx-auto aspect-[3/4] w-full max-w-36 rounded-tarjeta-chica object-cover ${resaltar ? "ring-4 ring-resaltador" : ""}`}
        />
      ) : (
        <div className="mx-auto flex aspect-[3/4] w-full max-w-36 items-center justify-center rounded-tarjeta-chica bg-papel text-xs text-gris">
          Sin foto
        </div>
      )}
      <figcaption className="mt-2 text-xs font-semibold text-gris">{etiqueta}</figcaption>
    </figure>
  );
}

/** Aviso de reposición para quien también tiene gafete impreso. */
function AvisoImpreso({ empresa, reposicion }: { empresa: string; reposicion: CambioFotoPersona["reposicion"] }) {
  return (
    <div className="rounded-tarjeta-chica border border-resaltador bg-resaltador/20 p-4 text-sm">
      <p className="font-semibold">También tienes gafete impreso</p>
      <p className="mt-1">
        Si {empresa} aprueba tu foto nueva, tu gafete impreso ya no va a coincidir y vas a necesitar uno nuevo (una
        reposición).
      </p>
      <ul className="mt-2 list-disc space-y-0.5 pl-5">
        <li>
          {reposicion.costo > 0 ? (
            <>
              Costo: <strong>{pesos(reposicion.costo)}</strong>. Lo cobra {empresa}, no {site.nombre}.
            </>
          ) : (
            <>Sin costo para ti.</>
          )}
        </li>
        {reposicion.requisitos.map((r) => (
          <li key={r}>{REQUISITOS[r]}.</li>
        ))}
      </ul>
      {reposicion.nota ? <p className="mt-2">{reposicion.nota}</p> : null}
    </div>
  );
}

export function CambiarFotoDigital({
  liga,
  empresa,
  fotoActual,
  cambio,
  acciones = { solicitar: solicitarCambioFoto, cancelar: cancelarCambioFoto },
}: {
  /** Liga de la persona; en el portal de empleados va vacía (manda la sesión). */
  liga: string;
  empresa: string;
  fotoActual?: string | null;
  cambio: CambioFotoPersona;
  /** Por omisión, las de la liga por persona; el portal pasa las suyas. */
  acciones?: { solicitar: (d: FormData) => Promise<Resultado>; cancelar: (d: FormData) => Promise<Resultado> };
}) {
  const router = useRouter();
  const [foto, setFoto] = useState<Blob>();
  const [vista, setVista] = useState<string>();
  const [acepto, setAcepto] = useState(false);
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  /** La imagen elegida con su encuadre, para volver a acomodarla. */
  const [original, setOriginal] = useState<{ fuente: Blob; encuadre?: Encuadre; espejo: boolean }>();
  const [ajustando, setAjustando] = useState(false);
  const { solicitud, conImpreso, reposicion } = cambio;

  useEffect(() => () => {
    if (vista) URL.revokeObjectURL(vista);
  }, [vista]);

  function elegir(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (!archivo) return;
    setError("");
    setOriginal({ fuente: archivo, espejo: false });
    setAjustando(true);
  }

  const editor =
    ajustando && original ? (
      <AjustarFoto
        fuente={original.fuente}
        inicial={original.encuadre}
        espejoInicial={original.espejo}
        alCancelar={() => setAjustando(false)}
        alListo={({ foto: lista, encuadre, espejo }) => {
          setAjustando(false);
          setOriginal({ fuente: original.fuente, encuadre, espejo });
          setFoto(lista);
          setVista(URL.createObjectURL(lista));
        }}
      />
    ) : null;

  async function enviar() {
    if (!foto) return setError("Elige tu foto nueva.");
    if (conImpreso && !acepto) return setError("Confirma que sabes que vas a necesitar un gafete impreso nuevo.");
    const datos = new FormData();
    datos.set("liga", liga);
    datos.set("foto", foto, "foto.jpg");
    if (acepto) datos.set("acepto_reposicion", "on");
    setError("");
    setOcupado(true);
    const resultado = await acciones.solicitar(datos).catch(() => ({ error: "No pudimos mandar tu foto. Revisa tu conexión e intenta de nuevo." }));
    setOcupado(false);
    if (resultado.error) return setError(resultado.error);
    setFoto(undefined);
    setVista(undefined);
    setOriginal(undefined);
    setAcepto(false);
    router.refresh();
  }

  async function cancelar() {
    const datos = new FormData();
    datos.set("liga", liga);
    setOcupado(true);
    await acciones.cancelar(datos).catch(() => null);
    setOcupado(false);
    router.refresh();
  }

  const boton = (texto: string, secundario = false) => (
    <label className={`${secundario ? claseBotonSecundario : claseBoton} cursor-pointer ${ocupado ? "pointer-events-none opacity-60" : ""}`}>
      <input type="file" accept="image/*" onChange={elegir} disabled={ocupado} className="sr-only" />
      {texto}
    </label>
  );

  // Eligiendo una foto nueva: anterior y nueva lado a lado antes de mandarla.
  if (vista) {
    return (
      <section aria-label="Cambiar mi foto" className="rounded-tarjeta border border-linea bg-white p-5 sm:p-6">
        <h2 className="font-titulos text-lg font-extrabold">¿Así está bien?</h2>
        <p className="mt-1 text-sm text-gris">{empresa} va a ver las dos fotos y decide si aprueba el cambio.</p>
        <div className="mt-4 flex items-start gap-4">
          <Retrato src={fotoActual} etiqueta="Tu foto actual" />
          <span aria-hidden className="mt-16 text-2xl text-gris">→</span>
          <Retrato src={vista} etiqueta="Tu foto nueva" resaltar />
        </div>
        {conImpreso ? (
          <div className="mt-5 space-y-3">
            <AvisoImpreso empresa={empresa} reposicion={reposicion} />
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" checked={acepto} onChange={(e) => setAcepto(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-rojo" />
              <span>Entiendo que, si se aprueba, necesito un gafete impreso nuevo.</span>
            </label>
          </div>
        ) : null}
        {error ? <p role="alert" className="mt-4 rounded-tarjeta-chica bg-rojo/10 p-3 text-sm font-medium text-rojo-oscuro">{error}</p> : null}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={enviar} disabled={ocupado} className={`${claseBoton} flex-1`}>
            {ocupado ? "Enviando…" : `Enviar a ${empresa}`}
          </button>
          {boton("Elegir otra", true)}
        </div>
        <button
          type="button"
          onClick={() => setAjustando(true)}
          disabled={ocupado || !original}
          className="mt-3 text-sm font-semibold underline underline-offset-4"
        >
          Acomodar o voltear la foto
        </button>
        {editor}
      </section>
    );
  }

  return (
    <section aria-label="Cambiar mi foto" className="rounded-tarjeta border border-linea bg-white p-5 sm:p-6">
      {solicitud?.estado === "pendiente" ? (
        <>
          <h2 className="font-titulos text-lg font-extrabold">Tu foto nueva está en revisión</h2>
          <p className="mt-1 text-sm text-gris">
            Mientras {empresa} la aprueba, tu gafete sigue con tu foto actual.
            {conImpreso ? " Si la aprueba, te dirá cómo recibir tu gafete impreso nuevo." : ""}
          </p>
          <div className="mt-4 flex items-start gap-4">
            <Retrato src={fotoActual} etiqueta="Actual" />
            <span aria-hidden className="mt-16 text-2xl text-gris">→</span>
            <Retrato src={solicitud.foto} etiqueta="En revisión" resaltar />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
            {boton("Mandar otra foto", true)}
            <button type="button" onClick={cancelar} disabled={ocupado} className="text-sm font-semibold underline underline-offset-4">
              Cancelar el cambio
            </button>
          </div>
        </>
      ) : (
        <>
          {solicitud?.estado === "rechazada" ? (
            <div role="status" className="mb-4 rounded-tarjeta-chica border border-rojo bg-rojo/10 p-4 text-sm">
              <p className="font-semibold">{empresa} no aprobó tu foto nueva.</p>
              <p className="mt-1">{solicitud.motivo || "Prueba con otra foto."}</p>
            </div>
          ) : solicitud?.estado === "aprobada" ? (
            <div role="status" className="mb-4 rounded-tarjeta-chica border border-[#0a7d4f] bg-[#dff3ea] p-4 text-sm">
              <p className="font-semibold">Listo, tu foto nueva ya está en tu gafete.</p>
              {conImpreso ? <p className="mt-1">{empresa} te dirá cómo y cuándo recibes tu gafete impreso nuevo.</p> : null}
            </div>
          ) : null}
          <div className="flex items-center gap-4">
            {fotoActual ? (
              <img src={fotoActual} alt="Tu foto actual" width={64} height={85} className="aspect-[3/4] w-16 shrink-0 rounded-tarjeta-chica object-cover" />
            ) : null}
            <div className="min-w-0">
              <h2 className="font-titulos text-lg font-extrabold">¿Quieres cambiar tu foto?</h2>
              <p className="mt-0.5 text-sm text-gris">
                Toma o elige una nueva. {empresa} la revisa antes de que aparezca en tu gafete.
              </p>
            </div>
          </div>
          {conImpreso ? (
            <p className="mt-3 text-sm text-gris">
              Ojo: como también tienes gafete impreso, cambiar tu foto implica pedir uno nuevo.
            </p>
          ) : null}
          {error ? <p role="alert" className="mt-4 rounded-tarjeta-chica bg-rojo/10 p-3 text-sm font-medium text-rojo-oscuro">{error}</p> : null}
          <div className="mt-4">{boton(solicitud?.estado === "rechazada" ? "Probar con otra foto" : "Cambiar mi foto")}</div>
        </>
      )}
      {editor}
    </section>
  );
}
