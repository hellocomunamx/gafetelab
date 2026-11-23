"use client";

import { useRouter } from "next/navigation";
import { type ChangeEvent, type FormEvent, useState } from "react";
import { guardarConstancia } from "@/app/cuenta/acciones";
import { guardarFiscalesDeConstancia } from "@/app/cuenta/verificacion/acciones";
import { CartaResponsabilidad } from "@/components/cuenta/CartaResponsabilidad";
import { claseBoton, claseEntrada } from "@/components/cuenta/Formulario";
import { regimenesFiscales } from "@/lib/cuenta/catalogos";
import { ACEPTA_VERIFICACION, extensionDe, FORMATOS_VERIFICACION, prepararArchivo } from "@/lib/cuenta/archivo-verificacion";
import { PESO_MAXIMO_CONSTANCIA, rutaConstancia } from "@/lib/cuenta/constancia";
import { type DatosConstancia, leerConstancia, RFC_VALIDO } from "@/lib/cuenta/constancia-datos";
import { textoDePdf } from "@/lib/cuenta/leer-pdf";
import { crearClienteNavegador } from "@/lib/supabase/client";

type Lectura = "nada" | "leyendo" | "leida" | "sin_datos";

/**
 * Sube la Constancia de Situación Fiscal de la empresa y la deja en revisión.
 * Si es el PDF del SAT, lee sus datos en el navegador y los deja prellenados
 * para que la persona los revise y los confirme.
 */
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
  const [lectura, setLectura] = useState<Lectura>("nada");
  const [leido, setLeido] = useState<DatosConstancia>({});
  const [fecha, setFecha] = useState("");
  // Si la fecha se leyó del PDF del SAT, queda fija: no se puede cambiar a mano.
  const [fechaLeida, setFechaLeida] = useState(false);
  const [rfc, setRfc] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [regimen, setRegimen] = useState("");
  const [cp, setCp] = useState("");
  const [paraFacturar, setParaFacturar] = useState(true);
  const [cartaAceptada, setCartaAceptada] = useState(false);

  async function alElegir(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    setError("");
    setLectura("nada");
    setFechaLeida(false);
    setFecha("");
    if (!archivo || archivo.type !== "application/pdf" || archivo.size > PESO_MAXIMO_CONSTANCIA) return;
    setLectura("leyendo");
    const datos = await textoDePdf(archivo).then(leerConstancia).catch(() => null);
    if (!datos) return setLectura("sin_datos");
    setLeido(datos);
    setRfc(datos.rfc ?? "");
    setRazonSocial(datos.razonSocial ?? "");
    setRegimen(datos.regimen ?? "");
    setCp(datos.cp ?? "");
    if (datos.fecha) {
      setFecha(datos.fecha);
      setFechaLeida(true);
    }
    setLectura("leida");
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const archivo = new FormData(evento.currentTarget).get("archivo");
    setError("");
    if (!(archivo instanceof File) || !archivo.size) return setError("Elige el archivo de tu constancia.");
    if (!fecha) return setError("Escribe la fecha de emisión que aparece en tu constancia.");
    if (fecha > hasta) return setError("La fecha de emisión no puede ser futura.");
    if (fecha < desde) {
      return setError(
        `Tu constancia es del ${fecha.split("-").reverse().join("/")} y tiene más de ${meses} meses. Descarga una nueva en el portal del SAT y súbela.`,
      );
    }
    if (!cartaAceptada) return setError("Para continuar, debes aceptar la carta de responsabilidad: léela y marca la casilla «Acepto la carta de responsabilidad».");
    const conFiscales = lectura === "leida" && paraFacturar;
    const fiscales = { rfc: rfc.toUpperCase().replace(/[\s-]/g, ""), razonSocial: razonSocial.trim(), regimen, cp: cp.trim() };
    if (conFiscales) {
      if (!RFC_VALIDO.test(fiscales.rfc)) return setError("Revisa el RFC: lleva 12 caracteres (empresa) o 13 (persona).");
      if (!fiscales.razonSocial) return setError("Escribe el nombre o razón social como aparece en tu constancia.");
      if (!fiscales.regimen) return setError("Elige el régimen fiscal con el que facturas.");
      if (!/^[0-9]{5}$/.test(fiscales.cp)) return setError("El código postal fiscal lleva 5 dígitos.");
    }
    setSubiendo(true);
    try {
      const listo = await prepararArchivo(archivo, "tu constancia");
      if ("error" in listo) throw new Error(listo.error);
      const ruta = rutaConstancia(empresaId, extensionDe(listo.archivo));
      const { error: falla } = await crearClienteNavegador()
        .storage.from("constancias")
        .upload(ruta, listo.archivo, { contentType: listo.archivo.type });
      if (falla) throw new Error("No pudimos subir el archivo. Intenta de nuevo.");
      const resultado = await guardarConstancia({ ruta, fecha, fechaLeida, carta: true });
      if (resultado.error) throw new Error(resultado.error);
      // La constancia ya quedó; si los datos de facturación no se guardan, se capturan después.
      if (conFiscales) await guardarFiscalesDeConstancia(fiscales).catch(() => null);
      router.push("/cuenta/verificacion");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos subir el archivo. Intenta de nuevo.");
      setSubiendo(false);
    }
  }

  const leyo = (dato: unknown) => (dato ? null : <span className="font-normal text-rojo-oscuro"> (no lo encontramos: escríbelo)</span>);

  return (
    <form onSubmit={enviar} className="space-y-5" noValidate>
      <label className="block">
        <span className="font-semibold">Archivo de tu constancia</span>
        <span className="block text-sm text-gris">
          {FORMATOS_VERIFICACION}. Con el PDF que descargas del SAT, tus datos se llenan solos.
        </span>
        <input
          type="file"
          name="archivo"
          accept={ACEPTA_VERIFICACION}
          disabled={subiendo}
          onChange={alElegir}
          className="mt-2 block w-full text-sm file:mr-4 file:cursor-pointer file:rounded-full file:border file:border-solid file:border-tinta file:bg-white file:px-4 file:py-2 file:font-semibold"
        />
      </label>

      {lectura === "leyendo" ? <p role="status" className="text-sm text-gris">Leyendo tu constancia…</p> : null}
      {lectura === "sin_datos" ? (
        <p role="status" className="rounded-tarjeta-chica bg-papel p-3 text-sm">
          No pudimos leer los datos de este archivo (pasa con escaneos y fotos). No hay problema: escribe la fecha de
          emisión y súbela así.
        </p>
      ) : null}

      {lectura === "leida" ? (
        <fieldset className="rounded-tarjeta-chica border border-[#0a7d4f] bg-[#dff3ea]/50 p-4" disabled={subiendo}>
          <legend className="px-1 font-titulos text-lg font-extrabold">Esto leímos de tu constancia</legend>
          <p className="text-sm">
            Revisa que esté bien y corrige lo que haga falta. Se leyó aquí, en tu navegador; nada se guarda hasta que
            subas la constancia.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold">RFC{leyo(leido.rfc)}</span>
              <input value={rfc} onChange={(e) => setRfc(e.target.value)} maxLength={13} autoCapitalize="characters" className={`${claseEntrada} uppercase`} />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Código postal fiscal{leyo(leido.cp)}</span>
              <input value={cp} onChange={(e) => setCp(e.target.value)} maxLength={5} inputMode="numeric" className={claseEntrada} />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-semibold">Nombre o razón social{leyo(leido.razonSocial)}</span>
              <input value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} maxLength={200} className={claseEntrada} />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-semibold">
                Régimen fiscal
                {leido.regimen ? (
                  leido.variosRegimenes ? <span className="font-normal text-gris"> (tu constancia trae varios: elige con cuál facturas)</span> : null
                ) : (
                  <span className="font-normal text-rojo-oscuro"> (no lo encontramos: elígelo)</span>
                )}
              </span>
              <select value={regimen} onChange={(e) => setRegimen(e.target.value)} className={claseEntrada}>
                <option value="">Elige uno</option>
                {regimenesFiscales.map((r) => (
                  <option key={r.clave} value={r.clave}>{r.clave} · {r.nombre}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="mt-4 flex items-start gap-2 text-sm">
            <input type="checkbox" checked={paraFacturar} onChange={(e) => setParaFacturar(e.target.checked)} className="mt-0.5 size-4 accent-[#0a7d4f]" />
            <span>
              Sí, son correctos: guárdenlos como mis datos de facturación.
              <span className="block text-gris">Así no los capturas otra vez. Después los puedes cambiar en Envío y facturación.</span>
            </span>
          </label>
        </fieldset>
      ) : null}

      <label className="block sm:max-w-xs">
        <span className="font-semibold">Fecha de emisión{lectura === "leida" ? leyo(leido.fecha) : null}</span>
        <span className="block text-sm text-gris">
          {fechaLeida
            ? "La leímos de tu constancia y no se puede cambiar."
            : "Viene en la constancia, en «Lugar y fecha de emisión». La revisamos contra tu archivo."}
        </span>
        <input
          type="date"
          name="fecha"
          min={desde}
          max={hasta}
          value={fecha}
          onChange={(e) => (fechaLeida ? null : setFecha(e.target.value))}
          readOnly={fechaLeida}
          aria-readonly={fechaLeida}
          disabled={subiendo}
          className={`${claseEntrada} ${fechaLeida ? "cursor-not-allowed bg-papel text-gris" : ""}`}
        />
      </label>
      <CartaResponsabilidad aceptada={cartaAceptada} alCambiar={setCartaAceptada} deshabilitada={subiendo} />
      {error ? <p role="alert" className="rounded-tarjeta-chica bg-rojo/10 p-3 text-sm font-medium text-rojo-oscuro">{error}</p> : null}
      <button type="submit" disabled={subiendo || lectura === "leyendo"} className={claseBoton}>
        {subiendo ? "Subiendo…" : lectura === "leida" ? "Confirmar y subir constancia" : boton}
      </button>
    </form>
  );
}
