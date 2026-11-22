"use client";

import { useState } from "react";
import { guardarQr } from "@/app/cuenta/acciones";
import { type AjusteQr, datosVerificables, type ModoQr, modosQr } from "@/lib/cuenta/qr";
import { claseEntrada, Formulario } from "./Formulario";

type Opcion = { clave: string; etiqueta: string };

const MUESTRA: Record<string, string> = {
  nombre: "Ana Martínez López",
  puesto: "Ejecutiva de ventas",
  numero_empleado: "No. 0042",
  departamento: "Comercial",
};

/**
 * Ajuste "Qué muestra tu QR": página de verificación, una liga de la empresa
 * o un dato de la persona. A la derecha se ve cómo queda lo elegido.
 */
export function AjusteQrForm({
  ajuste,
  empresa,
  camposTexto,
  camposFecha,
  conFoto,
}: {
  ajuste: AjusteQr;
  empresa: string;
  /** Campos cuyo valor puede ir dentro del código. */
  camposTexto: Opcion[];
  /** Campos de fecha que pueden marcar el vencimiento del gafete. */
  camposFecha: Opcion[];
  /** Si el servidor puede mostrar la fotografía (necesita SUPABASE_SECRET_KEY). */
  conFoto: boolean;
}) {
  const [modo, setModo] = useState<ModoQr>(
    modosQr.find((m) => m.id === ajuste.qr_modo)?.id ?? "verificacion",
  );
  const [mostrar, setMostrar] = useState<string[]>(ajuste.qr_mostrar);
  const [liga, setLiga] = useState(ajuste.qr_liga ?? "");
  const [dato, setDato] = useState(ajuste.qr_dato);
  const datos = datosVerificables.filter((v) => v.clave !== "foto" || conFoto);
  const ve = (clave: string) => mostrar.includes(clave) && datos.some((v) => v.clave === clave);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_15rem]">
      <Formulario accion={guardarQr} boton="Guardar">
        <fieldset>
          <legend className="sr-only">Qué muestra tu QR</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {modosQr.map((m) => (
              <label key={m.id} className="cursor-pointer">
                <input
                  type="radio"
                  name="qr_modo"
                  value={m.id}
                  checked={modo === m.id}
                  onChange={() => setModo(m.id)}
                  className="peer sr-only"
                />
                <span className="block h-full rounded-tarjeta-chica border border-linea p-4 transition-colors peer-checked:border-tinta peer-checked:bg-tinta peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-rojo">
                  <span className="block font-semibold">{m.titulo}</span>
                  <span className="mt-1 block text-sm opacity-80">{m.texto}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {modo === "verificacion" ? (
          <div className="mt-5 space-y-5">
            <fieldset>
              <legend className="text-sm font-semibold">Qué ve quien escanea</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {datos.map((v) => (
                  <label key={v.clave} className="cursor-pointer">
                    <input
                      type="checkbox"
                      name={`mostrar_${v.clave}`}
                      checked={ve(v.clave)}
                      onChange={(e) =>
                        setMostrar(e.target.checked ? [...mostrar, v.clave] : mostrar.filter((c) => c !== v.clave))
                      }
                      className="peer sr-only"
                    />
                    <span className="inline-block rounded-full border border-linea bg-white px-4 py-2 text-sm font-semibold transition-colors peer-checked:border-tinta peer-checked:bg-tinta peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-rojo">
                      {v.etiqueta}
                    </span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-gris">
                Si una persona está de baja, su página solo dice que el gafete ya no es válido, sin
                sus datos.
              </p>
            </fieldset>
            <label className="block max-w-md">
              <span className="text-sm font-semibold">¿Hasta cuándo es vigente?</span>
              <select name="qr_vigencia" defaultValue={ajuste.qr_vigencia ?? ""} className={claseEntrada}>
                <option value="">Mientras la persona esté activa en tu equipo</option>
                {camposFecha.map((c) => (
                  <option key={c.clave} value={c.clave}>
                    Hasta la fecha de su campo «{c.etiqueta}»
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-gris">
                {camposFecha.length
                  ? "Pasada esa fecha, la página dice Expirado."
                  : "Para que venza en una fecha, agrega aquí arriba un campo de tipo Fecha, por ejemplo Vigencia."}
              </span>
            </label>
          </div>
        ) : null}

        {modo === "liga" ? (
          <label className="mt-5 block max-w-xl">
            <span className="text-sm font-semibold">Tu liga</span>
            <input
              type="url"
              name="qr_liga"
              required
              maxLength={300}
              value={liga}
              onChange={(e) => setLiga(e.target.value)}
              placeholder="https://tuempresa.com/personal/{numero}"
              className={claseEntrada}
            />
            <span className="mt-1 block text-xs text-gris">
              Debe empezar con https://. Escribe {"{numero}"} donde va el número de empleado de cada
              persona, o {"{codigo}"} para el código único de su gafete. Sin eso, todos los gafetes
              llevan a la misma liga.
            </span>
          </label>
        ) : null}

        {modo === "dato" ? (
          <label className="mt-5 block max-w-md">
            <span className="text-sm font-semibold">Qué dato lleva el código</span>
            <select name="qr_dato" value={dato} onChange={(e) => setDato(e.target.value)} className={claseEntrada}>
              {camposTexto.map((c) => (
                <option key={c.clave} value={c.clave}>{c.etiqueta}</option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-gris">
              Sirve para lectores y sistemas que solo necesitan ese dato. Al escanearlo con un celular
              se ve el texto, no una página.
            </span>
          </label>
        ) : null}
      </Formulario>

      <div aria-hidden className="lg:border-l lg:border-linea lg:pl-6">
        <p className="text-sm font-semibold">Al escanear se ve</p>
        {modo === "verificacion" ? (
          <div className="mt-2 rounded-tarjeta border border-linea bg-papel p-4 text-center">
            <p className="inline-block rounded-full bg-[#0a7d4f] px-3 py-1 text-xs font-bold tracking-wider text-white">
              VIGENTE
            </p>
            {ve("foto") ? <div className="mx-auto mt-3 size-14 rounded-full bg-linea" /> : null}
            {ve("nombre") ? <p className="mt-3 font-titulos font-extrabold">{MUESTRA.nombre}</p> : null}
            {(["puesto", "numero_empleado", "departamento"] as const).map((c) =>
              ve(c) ? <p key={c} className="text-sm text-gris">{MUESTRA[c]}</p> : null,
            )}
            {ve("empresa") ? <p className="mt-2 text-sm font-semibold">{empresa}</p> : null}
          </div>
        ) : (
          <p className="mt-2 rounded-tarjeta border border-linea bg-papel p-4 text-sm break-all">
            {modo === "liga"
              ? (liga || "https://tuempresa.com/personal/{numero}").replaceAll("{numero}", "0042")
              : dato === "numero_empleado"
                ? "0042"
                : `El valor de «${camposTexto.find((c) => c.clave === dato)?.etiqueta ?? dato}»`}
          </p>
        )}
      </div>
    </div>
  );
}
