"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ChangeEvent, useMemo, useState } from "react";
import { camposDesdeExcel, importarEmpleados } from "@/app/cuenta/acciones";
import {
  COLUMNA_CORREO,
  COLUMNA_FOTO,
  type CampoExcel,
  type ColumnaNueva,
  columnasDe,
  columnasExtra,
  columnasNuevas,
  type Lectura,
  leerFilas,
  ordenDelArchivo,
  textoDeCelda,
} from "@/lib/cuenta/excel";
import { correoValido } from "@/lib/cuenta/ligas";
import { esColumnaSistema } from "@/lib/cuenta/tipos";
import { BotonPlantilla } from "./BotonPlantilla";
import { claseBoton, claseBotonSecundario, claseEntrada } from "./Formulario";

const MAXIMO = 2000;
const TOPE_CAMPOS = 30;

type Eleccion = "texto" | "fecha" | "no";
type Nueva = ColumnaNueva & { clave: string; eleccion: Eleccion };
/** Lugar de una clave en el archivo; las que no vienen van al final. */
const lugar = (orden: string[], clave: string) => (orden.includes(clave) ? orden.indexOf(clave) : orden.length);
const numero = (n: number) => n.toLocaleString("es-MX");

/** Los tres pasos del Excel: personalizar campos, descargar la plantilla y subirla llena. */
export function ImportarExcel({ campos, empresa }: { campos: CampoExcel[]; empresa: string }) {
  const router = useRouter();
  const [hoja, setHoja] = useState<unknown[][]>();
  const [nuevas, setNuevas] = useState<Nueva[]>([]);
  const [reordenar, setReordenar] = useState(true);
  const [archivo, setArchivo] = useState("");
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [hecho, setHecho] = useState<{ nuevas: number; actualizadas: number; datos: number }>();

  // Mientras se revisa, las columnas nuevas cuentan como datos provisionales.
  const agregadas = useMemo(() => nuevas.filter((n) => n.eleccion !== "no"), [nuevas]);
  const provisionales = useMemo(
    () => [...campos, ...agregadas.map(({ clave, etiqueta, eleccion }) => ({ clave, etiqueta, tipo: eleccion }))],
    [campos, agregadas],
  );
  const lectura: Lectura | undefined = useMemo(() => (hoja ? leerFilas(hoja, provisionales) : undefined), [hoja, provisionales]);
  const encabezados = hoja?.[0]?.map(textoDeCelda) ?? [];
  const delArchivo = hoja ? ordenDelArchivo(encabezados, provisionales) : [];
  const ordenDistinto =
    delArchivo.join("|") !== columnasDe(provisionales).map((c) => c.clave).filter((c) => delArchivo.includes(c)).join("|");
  // La vista previa muestra las columnas en el orden en que quedarán.
  const columnas = [...columnasDe(provisionales)].sort((a, b) =>
    reordenar && ordenDistinto ? lugar(delArchivo, a.clave) - lugar(delArchivo, b.clave) : 0,
  );
  const sobran = campos.length + agregadas.length - TOPE_CAMPOS;

  async function leer(evento: ChangeEvent<HTMLInputElement>) {
    const elegido = evento.target.files?.[0];
    evento.target.value = "";
    if (!elegido) return;
    setError("");
    setHecho(undefined);
    setHoja(undefined);
    setNuevas([]);
    setReordenar(true);
    setArchivo(elegido.name);
    try {
      const { readSheet } = await import("read-excel-file/browser");
      const leida = (await readSheet(elegido)) as unknown[][];
      const propuestas: Nueva[] = columnasNuevas(leida, campos).map((n, i) => ({ ...n, clave: `nuevo_${i}`, eleccion: n.tipo }));
      const resultado = leerFilas(leida, [...campos, ...propuestas.map(({ clave, etiqueta, tipo }) => ({ clave, etiqueta, tipo }))]);
      if (resultado.faltaNombre) setError("No reconocimos ninguna columna. Revisa que la primera fila traiga los títulos.");
      else if (!resultado.filas.length) setError("El archivo no trae personas. Llena al menos un renglón.");
      else if (resultado.filas.length > MAXIMO) setError(`El archivo trae ${numero(resultado.filas.length)} personas. Sube como máximo ${numero(MAXIMO)} por archivo.`);
      else {
        setNuevas(propuestas);
        setHoja(leida);
      }
    } catch {
      setError("No pudimos leer el archivo. Tiene que ser un Excel (.xlsx).");
    }
  }

  async function importar() {
    if (!hoja || !lectura) return;
    setOcupado(true);
    setError("");
    const fallo = { error: "No pudimos importar. Intenta de nuevo." } as const;
    // Primero «Tus datos»: las columnas nuevas y, si se pidió, el orden del archivo.
    let finales = campos;
    if (agregadas.length || (reordenar && ordenDistinto)) {
      const r = await camposDesdeExcel(
        agregadas.map(({ etiqueta, eleccion }) => ({ etiqueta, tipo: eleccion })),
        reordenar && ordenDistinto ? encabezados : null,
      ).catch(() => fallo);
      if (r.error || !("campos" in r) || !r.campos) {
        setOcupado(false);
        return setError(r.error ?? fallo.error);
      }
      finales = r.campos;
    }
    // Luego las personas, leídas otra vez con los datos ya guardados.
    const resultado = await importarEmpleados(leerFilas(hoja, finales).filas).catch(() => fallo);
    setOcupado(false);
    if (resultado.error) {
      router.refresh();
      return setError(resultado.error);
    }
    setHecho({
      nuevas: "nuevas" in resultado ? (resultado.nuevas ?? 0) : 0,
      actualizadas: "actualizadas" in resultado ? (resultado.actualizadas ?? 0) : 0,
      datos: agregadas.length,
    });
    setHoja(undefined);
    setNuevas([]);
    router.refresh();
  }

  const elegir = (clave: string, eleccion: Eleccion) =>
    setNuevas((actuales) => actuales.map((n) => (n.clave === clave ? { ...n, eleccion } : n)));

  const valor = (fila: Lectura["filas"][number], clave: string) =>
    esColumnaSistema(clave) ? fila[clave] : fila.datos?.[clave];

  const conCorreo = Boolean(lectura?.filas.some((f) => f.correo));
  const correosMalos = lectura?.filas.filter((f) => f.correo && !correoValido(f.correo)).length ?? 0;

  return (
    <div className="space-y-5">
      <ol className="grid gap-4 lg:grid-cols-3">
        <li className="rounded-tarjeta border border-linea bg-white p-5">
          <p className="font-titulos text-lg font-extrabold">1. Personaliza tus campos</p>
          <p className="mt-1 text-sm text-gris">
            Tu plantilla trae una columna por cada campo de tu empresa. Hoy son:
          </p>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {[...columnasDe(campos).map((c) => c.etiqueta), ...columnasExtra(campos)].map((c) => (
              <li key={c} className="rounded-full bg-papel px-2.5 py-1 text-xs font-semibold">
                {c}
              </li>
            ))}
          </ul>
          <Link href="/cuenta/campos" className={`${claseBotonSecundario} mt-4`}>
            Personalizar mis campos
          </Link>
        </li>
        <li className="rounded-tarjeta border-2 border-tinta bg-white p-5">
          <p className="font-titulos text-lg font-extrabold">2. Descarga tu plantilla</p>
          <p className="mt-1 text-sm text-gris">
            Se arma al momento con tus campos. Llénala con una persona por renglón. Nada es obligatorio: sin nombre queda como gafete genérico.
          </p>
          <BotonPlantilla campos={campos} empresa={empresa} className={`${claseBoton} mt-4`}>
            Descargar mi plantilla de Excel
          </BotonPlantilla>
        </li>
        <li className="rounded-tarjeta border border-linea bg-white p-5">
          <p className="font-titulos text-lg font-extrabold">3. Súbela llena</p>
          <p className="mt-1 text-sm text-gris">
            Primero te mostramos lo que leímos. Nada se guarda hasta que confirmes.
          </p>
          <label className={`${claseBotonSecundario} mt-4 cursor-pointer`}>
            <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={leer} className="sr-only" />
            Elegir archivo de Excel
          </label>
          {archivo ? <p className="mt-3 text-xs text-gris">Archivo: {archivo}</p> : null}
        </li>
      </ol>

      {error ? <p role="alert" className="rounded-tarjeta-chica bg-rojo/10 p-4 font-medium text-rojo-oscuro">{error}</p> : null}

      {hecho ? (
        <div role="status" className="rounded-tarjeta border border-[#0a7d4f] bg-[#dff3ea] p-5">
          <p className="font-titulos text-lg font-extrabold">Listo: tu equipo ya está arriba.</p>
          <p className="mt-1 text-sm">
            {numero(hecho.nuevas)} {hecho.nuevas === 1 ? "persona nueva" : "personas nuevas"} y{" "}
            {numero(hecho.actualizadas)} {hecho.actualizadas === 1 ? "actualizada" : "actualizadas"}.
            {hecho.datos
              ? ` También agregamos ${hecho.datos === 1 ? "1 dato nuevo" : `${hecho.datos} datos nuevos`} a «Tus datos».`
              : ""}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/cuenta/equipo/fotos" className={claseBoton}>Subir las fotos</Link>
            <Link href="/cuenta/equipo" className={claseBotonSecundario}>Ver mi equipo</Link>
          </div>
        </div>
      ) : null}

      {lectura ? (
        <div className="rounded-tarjeta border border-linea bg-white p-5">
          <p className="font-titulos text-lg font-extrabold">
            3. Revisa: {numero(lectura.filas.length)} {lectura.filas.length === 1 ? "persona" : "personas"} por importar
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {lectura.sinNombre.length ? (
              <li>
                {lectura.sinNombre.length === 1 ? "1 renglón no trae" : `${numero(lectura.sinNombre.length)} renglones no traen`} nombre
                (renglón {lectura.sinNombre.slice(0, 8).join(", ")}
                {lectura.sinNombre.length > 8 ? "…" : ""}): se suben como gafetes genéricos, sin nombre impreso. Si fue un
                olvido, corrige el archivo antes de importar.
              </li>
            ) : null}
            {lectura.repetidos.length ? (
              <li className="text-rojo-oscuro">
                Número de empleado repetido en el archivo: {[...new Set(lectura.repetidos)].slice(0, 8).join(", ")}. Se
                queda el último renglón de cada uno.
              </li>
            ) : null}
            {correosMalos ? (
              <li className="text-rojo-oscuro">
                {correosMalos === 1 ? "1 correo no parece válido y no se guarda" : `${correosMalos} correos no parecen válidos y no se guardan`}.
                Revísalos en el archivo o corrígelos después en la ficha de cada persona.
              </li>
            ) : null}
            {lectura.ignoradas.length ? (
              <li className="text-gris">
                Columnas que no se importan: {lectura.ignoradas.join(", ")}.
              </li>
            ) : null}
          </ul>
          {nuevas.length ? (
            <div className="mt-4 rounded-tarjeta-chica border border-linea p-4">
              <p className="font-semibold">
                {nuevas.length === 1
                  ? "Tu Excel trae 1 columna que todavía no está en «Tus datos»."
                  : `Tu Excel trae ${nuevas.length} columnas que todavía no están en «Tus datos».`}{" "}
                {nuevas.length === 1 ? "La agregamos" : "Las agregamos"} al importar. Revisa que el tipo sea el correcto:
              </p>
              <ul className="mt-3 divide-y divide-linea">
                {nuevas.map((n) => (
                  <li key={n.clave} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2.5">
                    <div className="min-w-0">
                      <p className="font-semibold">{n.etiqueta}</p>
                      {n.ejemplos.length ? (
                        <p className="truncate text-xs text-gris">Por ejemplo: {n.ejemplos.join(", ")}</p>
                      ) : (
                        <p className="text-xs text-gris">Columna vacía</p>
                      )}
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <span className="sr-only">Tipo de {n.etiqueta}</span>
                      <select
                        value={n.eleccion}
                        onChange={(e) => elegir(n.clave, e.target.value as Eleccion)}
                        className={`${claseEntrada} w-auto`}
                      >
                        <option value="texto">Texto</option>
                        <option value="fecha">Fecha</option>
                        <option value="no">No agregar</option>
                      </select>
                    </label>
                  </li>
                ))}
              </ul>
              {sobran > 0 ? (
                <p role="alert" className="mt-2 text-sm font-medium text-rojo-oscuro">
                  Solo caben {TOPE_CAMPOS} datos. Marca {sobran === 1 ? "1 columna" : `${sobran} columnas`} como «No agregar» o
                  quita datos que no uses en «Tus datos».
                </p>
              ) : null}
            </div>
          ) : null}
          {ordenDistinto ? (
            <label className="mt-4 flex items-start gap-2 text-sm">
              <input type="checkbox" checked={reordenar} onChange={(e) => setReordenar(e.target.checked)} className="mt-0.5 size-4 accent-rojo" />
              <span>
                Acomodar «Tus datos» en el orden de las columnas de este Excel.{" "}
                <span className="text-gris">Así tu próxima plantilla sale igual que tu archivo.</span>
              </span>
            </label>
          ) : null}
          <div className="mt-4 overflow-x-auto rounded-tarjeta-chica border border-linea">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="bg-papel">
                <tr>
                  {columnas.map((c) => (
                    <th key={c.clave} scope="col" className="px-3 py-2 font-semibold">{c.etiqueta}</th>
                  ))}
                  {conCorreo ? <th scope="col" className="px-3 py-2 font-semibold">{COLUMNA_CORREO}</th> : null}
                  <th scope="col" className="px-3 py-2 font-semibold">{COLUMNA_FOTO}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-linea">
                {lectura.filas.slice(0, 8).map((f, i) => (
                  <tr key={i}>
                    {columnas.map((c) => (
                      <td key={c.clave} className="px-3 py-2">{valor(f, c.clave)}</td>
                    ))}
                    {conCorreo ? <td className="px-3 py-2">{f.correo}</td> : null}
                    <td className="px-3 py-2">{f.foto_archivo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {lectura.filas.length > 8 ? (
            <p className="mt-2 text-xs text-gris">y {numero(lectura.filas.length - 8)} más.</p>
          ) : null}
          <button type="button" onClick={importar} disabled={ocupado || sobran > 0 || !lectura.filas.length} className={`${claseBoton} mt-5`}>
            {ocupado ? "Importando…" : `Importar ${numero(lectura.filas.length)} ${lectura.filas.length === 1 ? "persona" : "personas"}`}
          </button>
        </div>
      ) : null}
    </div>
  );
}
