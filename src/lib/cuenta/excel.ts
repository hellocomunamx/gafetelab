import { normalizar } from "./texto";
import { esColumnaSistema, type FilaImportada } from "./tipos";

/** Columna del Excel que guarda el nombre del archivo de la foto. */
export const COLUMNA_FOTO = "Foto (archivo)";

/** Columna del Excel con el correo de la persona, para mandarle su liga. */
export const COLUMNA_CORREO = "Correo";
/** Títulos de las columnas extra de la plantilla, después de los campos de la empresa. */
export function columnasExtra(campos: CampoExcel[]): string[] {
  // Si la empresa ya tiene un campo propio que se llama igual, no se repite la columna.
  const yaEsta = columnasDe(campos).some((c) => normalizar(c.etiqueta) === normalizar(COLUMNA_CORREO));
  return yaEsta ? [COLUMNA_FOTO] : [COLUMNA_CORREO, COLUMNA_FOTO];
}

export type CampoExcel = { clave: string; etiqueta: string; tipo: string };

/** Otras formas comunes de llamar a las columnas de siempre. */
const ALIAS: Record<string, string[]> = {
  nombre: ["nombre", "nombre completo", "nombre y apellidos", "empleado", "colaborador"],
  numero_empleado: ["numero de empleado", "numero empleado", "no empleado", "num empleado", "no de empleado", "numero", "no", "id", "clave", "nomina", "numero de nomina"],
  puesto: ["puesto", "cargo", "posicion"],
  departamento: ["departamento", "depto", "area"],
  tipo_contrato: ["tipo de contrato", "contrato", "tipo contrato", "temporalidad"],
};
const ALIAS_CORREO = ["correo", "correo electronico", "email", "e mail", "mail", "correo e"];
const ALIAS_FOTO = ["foto archivo", "foto", "archivo de foto", "nombre de la foto", "fotografia"];

/** Los campos que se capturan en Excel: los de texto y fecha, en el orden que eligió la empresa. */
export function columnasDe<T extends CampoExcel>(campos: T[]): T[] {
  return campos.filter((c) => c.tipo === "texto" || c.tipo === "fecha");
}

/** Para cada encabezado del archivo, la clave del campo al que corresponde, "correo", "foto_archivo" o null. */
export function mapearEncabezados(encabezados: string[], campos: CampoExcel[]): (string | null)[] {
  const columnas = columnasDe(campos);
  const usadas = new Set<string>();
  return encabezados.map((encabezado) => {
    const n = normalizar(encabezado);
    if (!n) return null;
    const campo =
      columnas.find((c) => normalizar(c.etiqueta) === n || c.clave.replace(/_/g, " ") === n) ??
      columnas.find((c) => ALIAS[c.clave]?.includes(n));
    const clave = campo?.clave ?? (ALIAS_FOTO.includes(n) ? "foto_archivo" : ALIAS_CORREO.includes(n) ? "correo" : null);
    if (!clave || usadas.has(clave)) return null;
    usadas.add(clave);
    return clave;
  });
}

const dosDigitos = (n: number) => String(n).padStart(2, "0");

/** Fecha escrita como 15/03/2025, 15-03-2025 o 2025-03-15, en formato AAAA-MM-DD. Si no lo es, null. */
export function fechaIso(valor: string): string | null {
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(valor);
  const mx = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(valor);
  const [a, m, d] = iso ? [iso[1], iso[2], iso[3]] : mx ? [mx[3], mx[2], mx[1]] : [];
  if (!a) return null;
  const fecha = new Date(Date.UTC(Number(a), Number(m) - 1, Number(d)));
  if (fecha.getUTCMonth() !== Number(m) - 1 || fecha.getUTCDate() !== Number(d)) return null;
  return `${a}-${dosDigitos(Number(m))}-${dosDigitos(Number(d))}`;
}

/** Palabras que suelen tener los títulos de columnas con fecha. */
const PISTAS_FECHA = ["fecha", "vigencia", "vence", "vencimiento", "nacimiento", "ingreso", "caducidad", "expira", "valido hasta"];

/** Columna del Excel que todavía no es un dato de la empresa, con el tipo que creemos que es. */
export type ColumnaNueva = { etiqueta: string; tipo: "texto" | "fecha"; ejemplos: string[] };

/**
 * Columnas del archivo que no corresponden a ningún dato de la empresa, para
 * proponer agregarlas. El tipo se adivina por los valores y por el título.
 */
export function columnasNuevas(hoja: unknown[][], campos: CampoExcel[]): ColumnaNueva[] {
  const [primera = [], ...resto] = hoja;
  const encabezados = primera.map(textoDeCelda);
  const mapa = mapearEncabezados(encabezados, campos);
  const conocidas = new Set(campos.map((c) => normalizar(c.etiqueta)));
  const nuevas: ColumnaNueva[] = [];
  encabezados.forEach((encabezado, i) => {
    const n = normalizar(encabezado);
    if (!n || mapa[i] || conocidas.has(n)) return;
    conocidas.add(n);
    const valores = resto.map((fila) => textoDeCelda(fila?.[i])).filter(Boolean);
    const fechas = valores.filter((v) => fechaIso(v)).length;
    const pista = PISTAS_FECHA.some((p) => n.includes(p));
    // Basta el título (como «Vigencia») o que la mitad sean fechas: el tipo fecha
    // también acepta texto, como «Indefinido».
    const esFecha = pista || (valores.length > 0 && fechas / valores.length >= 0.5);
    nuevas.push({ etiqueta: encabezado.trim().slice(0, 60), tipo: esFecha ? "fecha" : "texto", ejemplos: [...new Set(valores)].slice(0, 3) });
  });
  return nuevas;
}

/** Las claves de los datos de la empresa en el orden de las columnas del archivo. */
export function ordenDelArchivo(encabezados: string[], campos: CampoExcel[]): string[] {
  const claves = new Set(campos.map((c) => c.clave));
  return mapearEncabezados(encabezados, campos).filter((c): c is string => Boolean(c && claves.has(c)));
}

/** Valor de una celda como texto. Las fechas quedan como AAAA-MM-DD. */
export function textoDeCelda(valor: unknown): string {
  if (valor == null) return "";
  if (valor instanceof Date) {
    return `${valor.getUTCFullYear()}-${dosDigitos(valor.getUTCMonth() + 1)}-${dosDigitos(valor.getUTCDate())}`;
  }
  return String(valor).trim();
}

export type Lectura = {
  filas: FilaImportada[];
  /** Encabezados que no corresponden a ningún campo. */
  ignoradas: string[];
  /** Renglones (número en Excel) sin nombre: se importan como gafetes genéricos. */
  sinNombre: number[];
  /** Números de empleado repetidos dentro del archivo. */
  repetidos: string[];
  faltaNombre: boolean;
};

/** Convierte las filas crudas de la hoja en personas listas para importar. */
export function leerFilas(hoja: unknown[][], campos: CampoExcel[]): Lectura {
  const [primera = [], ...resto] = hoja;
  const encabezados = primera.map(textoDeCelda);
  const mapa = mapearEncabezados(encabezados, campos);
  const fechas = new Set(campos.filter((c) => c.tipo === "fecha").map((c) => c.clave));
  const lectura: Lectura = {
    filas: [],
    ignoradas: encabezados.filter((e, i) => e && !mapa[i]),
    sinNombre: [],
    repetidos: [],
    // El nombre es opcional; basta con que el archivo traiga alguna columna conocida.
    faltaNombre: !mapa.some(Boolean),
  };
  if (lectura.faltaNombre) return lectura;

  const vistos = new Set<string>();
  resto.forEach((celdas, i) => {
    const fila: FilaImportada = { nombre: "", datos: {} };
    let conAlgo = false;
    mapa.forEach((clave, columna) => {
      const crudo = textoDeCelda(celdas[columna]);
      // Las fechas se guardan como AAAA-MM-DD aunque en el Excel vengan como 15/03/2025.
      const valor = clave && fechas.has(clave) ? (fechaIso(crudo) ?? crudo) : crudo;
      if (!clave || !valor) return;
      conAlgo = true;
      if (clave === "foto_archivo") fila.foto_archivo = valor;
      else if (clave === "correo") fila.correo = valor;
      else if (esColumnaSistema(clave)) fila[clave] = valor;
      else fila.datos![clave] = valor;
    });
    if (!conAlgo) return;
    if (!fila.nombre) lectura.sinNombre.push(i + 2);
    if (fila.numero_empleado) {
      if (vistos.has(fila.numero_empleado)) lectura.repetidos.push(fila.numero_empleado);
      vistos.add(fila.numero_empleado);
    }
    lectura.filas.push(fila);
  });
  return lectura;
}
