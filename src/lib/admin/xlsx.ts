import { strToU8, zipSync } from "fflate";

/**
 * Archivo de Excel (.xlsx) mínimo, sin dependencias aparte de `fflate`:
 * varias hojas, encabezado en negritas, y celdas de texto, número, dinero,
 * fecha y fecha con hora. Alcanza para las descargas del panel.
 */

export type Celda =
  | string
  | number
  | null
  | undefined
  | { dinero: number }
  | { fecha: string | null }
  | { fechaHora: string | null };

export type Hoja = {
  nombre: string;
  encabezados: string[];
  /** Ancho de cada columna, en caracteres. Por omisión, 16. */
  anchos?: number[];
  filas: Celda[][];
};

// Estilos de `cellXfs`, en el orden en que se declaran abajo.
const NEGRITAS = 1;
const DINERO = 2;
const FECHA = 3;
const FECHA_HORA = 4;

/** Las fechas se escriben en la hora de Sonora (UTC-7 todo el año). */
const DESFASE_MS = -7 * 60 * 60 * 1000;
const DIA_MS = 24 * 60 * 60 * 1000;
/** Días entre el 30 de diciembre de 1899 (día cero de Excel) y el 1 de enero de 1970. */
const EPOCA_EXCEL = 25569;

const escapar = (texto: string) =>
  texto
    // Caracteres de control que XML no admite.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** "A", "B", ..., "Z", "AA", ... */
function letra(indice: number): string {
  let n = indice + 1;
  let salida = "";
  while (n > 0) {
    const resto = (n - 1) % 26;
    salida = String.fromCharCode(65 + resto) + salida;
    n = Math.floor((n - 1) / 26);
  }
  return salida;
}

function serie(iso: string | null, conHora: boolean): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return null;
  const dias = (ms + DESFASE_MS) / DIA_MS + EPOCA_EXCEL;
  return conHora ? Math.round(dias * 100000) / 100000 : Math.floor(dias);
}

function celda(valor: Celda, ref: string, estilo?: number): string {
  const s = estilo ? ` s="${estilo}"` : "";
  if (valor === null || valor === undefined || valor === "") return "";
  if (typeof valor === "number") return Number.isFinite(valor) ? `<c r="${ref}"${s}><v>${valor}</v></c>` : "";
  if (typeof valor === "string") {
    return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${escapar(valor)}</t></is></c>`;
  }
  if ("dinero" in valor) {
    return Number.isFinite(valor.dinero) ? `<c r="${ref}" s="${DINERO}"><v>${valor.dinero}</v></c>` : "";
  }
  const conHora = "fechaHora" in valor;
  const n = serie(conHora ? valor.fechaHora : valor.fecha, conHora);
  return n === null ? "" : `<c r="${ref}" s="${conHora ? FECHA_HORA : FECHA}"><v>${n}</v></c>`;
}

function hojaXml(hoja: Hoja): string {
  const columnas = hoja.encabezados
    .map((_, i) => `<col min="${i + 1}" max="${i + 1}" width="${hoja.anchos?.[i] ?? 16}" customWidth="1"/>`)
    .join("");
  const encabezado = `<row r="1">${hoja.encabezados.map((t, i) => celda(t, `${letra(i)}1`, NEGRITAS)).join("")}</row>`;
  const filas = hoja.filas
    .map((fila, f) => `<row r="${f + 2}">${fila.map((v, i) => celda(v, `${letra(i)}${f + 2}`)).join("")}</row>`)
    .join("");
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
    `<cols>${columnas}</cols><sheetData>${encabezado}${filas}</sheetData></worksheet>`
  );
}

const ESTILOS =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
  `<numFmts count="3">` +
  `<numFmt numFmtId="164" formatCode="&quot;$&quot;#,##0.00"/>` +
  `<numFmt numFmtId="165" formatCode="dd/mm/yyyy"/>` +
  `<numFmt numFmtId="166" formatCode="dd/mm/yyyy hh:mm"/>` +
  `</numFmts>` +
  `<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>` +
  `<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>` +
  `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
  `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
  `<cellXfs count="5">` +
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
  `<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>` +
  `<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>` +
  `<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>` +
  `<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>` +
  `</cellXfs>` +
  `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
  `</styleSheet>`;

/** Nombre de hoja válido para Excel: sin \ / ? * [ ] : y de hasta 31 caracteres. */
const nombreDeHoja = (nombre: string) => escapar(nombre.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Hoja");

export function crearXlsx(hojas: Hoja[]): Uint8Array {
  const archivos: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
        `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
        hojas
          .map(
            (_, i) =>
              `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
          )
          .join("") +
        `</Types>`,
    ),
    "_rels/.rels": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
        `</Relationships>`,
    ),
    "xl/workbook.xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
        `<sheets>${hojas.map((h, i) => `<sheet name="${nombreDeHoja(h.nombre)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets>` +
        `</workbook>`,
    ),
    "xl/_rels/workbook.xml.rels": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        hojas
          .map(
            (_, i) =>
              `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
          )
          .join("") +
        `<Relationship Id="rId${hojas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
        `</Relationships>`,
    ),
    "xl/styles.xml": strToU8(ESTILOS),
  };
  hojas.forEach((h, i) => {
    archivos[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(hojaXml(h));
  });
  return zipSync(archivos, { level: 6 });
}

/** La fecha de hoy en Sonora ("2026-11-22"), para el nombre de los archivos. */
export const hoyEnSonora = () => new Date(Date.now() + DESFASE_MS).toISOString().slice(0, 10);

/** Respuesta HTTP que descarga el archivo. `nombre` va sin extensión. */
export function descargaXlsx(nombre: string, hojas: Hoja[]): Response {
  const datos = crearXlsx(hojas);
  return new Response(datos.buffer.slice(datos.byteOffset, datos.byteOffset + datos.byteLength) as ArrayBuffer, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${nombre.replace(/[^a-z0-9_-]/gi, "-")}.xlsx"`,
      "cache-control": "private, no-store",
    },
  });
}
