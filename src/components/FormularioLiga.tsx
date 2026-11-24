"use client";

import { useRouter } from "next/navigation";
import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";
import { enviarMisDatos } from "@/app/mi-gafete/acciones";
import { claseBoton, claseEntrada } from "@/components/cuenta/Formulario";
import { prepararFoto } from "@/lib/cuenta/imagen";
import { CamaraFoto } from "./CamaraFoto";

export type CampoDeLiga = { clave: string; etiqueta: string; tipo: string; obligatorio: boolean; valor: string };

/** Formulario de la liga personal: los datos que pidió la empresa y la foto. */
export function FormularioLiga({
  liga,
  campos,
  conFoto,
  fotoActual,
  boton,
}: {
  liga: string;
  campos: CampoDeLiga[];
  conFoto: boolean;
  /** Liga temporal de la foto que ya tiene (o que ya mandó). */
  fotoActual?: string;
  boton: string;
}) {
  const router = useRouter();
  const [foto, setFoto] = useState<Blob>();
  const [vista, setVista] = useState<string>();
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [camara, setCamara] = useState(false);
  /** La imagen original y si va volteada, para poder corregir una selfie en espejo. */
  const [original, setOriginal] = useState<{ fuente: Blob | ImageBitmap; espejo: boolean }>();

  useEffect(() => () => {
    if (vista) URL.revokeObjectURL(vista);
  }, [vista]);

  async function usar(fuente: Blob | ImageBitmap, espejo: boolean) {
    setError("");
    try {
      const lista = await prepararFoto(fuente, { espejo });
      setOriginal({ fuente, espejo });
      setFoto(lista);
      setVista(URL.createObjectURL(lista));
    } catch {
      setError("No pudimos leer esa imagen. Usa una foto JPG o PNG.");
    }
  }

  async function elegir(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (archivo) await usar(archivo, false);
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (conFoto && !foto && !fotoActual) return setError("Falta tu foto.");
    const datos = new FormData(evento.currentTarget);
    datos.set("liga", liga);
    if (foto) datos.set("foto", foto, "foto.jpg");
    setError("");
    setOcupado(true);
    const resultado = await enviarMisDatos(datos).catch(() => ({ error: "No pudimos mandar tus datos. Revisa tu conexión e intenta de nuevo." }));
    setOcupado(false);
    if (resultado.error) return setError(resultado.error);
    setFoto(undefined);
    setVista(undefined);
    setOriginal(undefined);
    router.refresh();
    window.scrollTo({ top: 0 });
  }

  const imagen = vista ?? fotoActual;

  return (
    <form onSubmit={enviar} className="space-y-5">
      {campos.map((c) => (
        <label key={c.clave} className="block">
          <span className="text-sm font-semibold">{c.etiqueta}</span>
          <input
            name={`dato_${c.clave}`}
            type={c.tipo === "fecha" ? "date" : "text"}
            defaultValue={c.valor}
            required={c.obligatorio}
            maxLength={c.clave === "nombre" ? 160 : 120}
            autoComplete={c.clave === "nombre" ? "name" : "off"}
            className={claseEntrada}
          />
        </label>
      ))}

      {conFoto ? (
        <div>
          <p className="text-sm font-semibold">Tu foto</p>
          <div className="mt-2 flex items-start gap-4">
            {imagen ? (
              // eslint-disable-next-line @next/next/no-img-element -- vista previa local o liga temporal de almacenamiento privado
              <img src={imagen} alt="Tu foto" width={120} height={160} className="aspect-[3/4] w-28 shrink-0 rounded-tarjeta-chica object-cover" />
            ) : (
              <div className="flex aspect-[3/4] w-28 shrink-0 items-center justify-center rounded-tarjeta-chica bg-papel px-2 text-center text-xs text-gris">
                Aún sin foto
              </div>
            )}
            <div className="min-w-0 text-sm">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCamara(true)}
                  disabled={ocupado || camara}
                  className="inline-flex items-center rounded-full border border-tinta bg-tinta px-4 py-2 font-semibold text-white"
                >
                  {imagen ? "Tomar otra" : "Tomar foto"}
                </button>
                <label className="inline-flex cursor-pointer items-center rounded-full border border-tinta px-4 py-2 font-semibold hover:bg-papel">
                  <input type="file" accept="image/*" onChange={elegir} disabled={ocupado} className="sr-only" />
                  Elegir de mi galería
                </label>
              </div>
              {original ? (
                <button
                  type="button"
                  onClick={() => void usar(original.fuente, !original.espejo)}
                  disabled={ocupado}
                  className="mt-2 font-semibold underline underline-offset-4"
                >
                  ¿Salió al revés? Voltear foto
                </button>
              ) : null}
              <ul className="mt-3 list-disc space-y-0.5 pl-5 text-gris">
                <li>De frente y con buena luz.</li>
                <li>Fondo liso y claro.</li>
                <li>Sin lentes oscuros ni gorra.</li>
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      {camara ? (
        <CamaraFoto
          alCerrar={() => setCamara(false)}
          alTomar={(cuadro) => {
            setCamara(false);
            void usar(cuadro, false);
          }}
        />
      ) : null}

      {error ? <p role="alert" className="rounded-tarjeta-chica bg-rojo/10 p-3 text-sm font-medium text-rojo-oscuro">{error}</p> : null}

      <button type="submit" disabled={ocupado} className={`${claseBoton} w-full`}>
        {ocupado ? "Enviando…" : boton}
      </button>
    </form>
  );
}
