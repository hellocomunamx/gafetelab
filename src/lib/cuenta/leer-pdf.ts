/**
 * Texto de un PDF, leído en el navegador con pdf.js. El archivo no sale de la
 * computadora de la persona. pdf.js se carga solo cuando hace falta, desde
 * `public/vendor/pdfjs` (no entra al paquete del sitio).
 */

type Pagina = { getTextContent(): Promise<{ items: { str?: string; hasEOL?: boolean }[] }> };
type Documento = { numPages: number; getPage(numero: number): Promise<Pagina>; destroy(): Promise<void> };
type PdfJs = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument(origen: { data: ArrayBuffer }): { promise: Promise<Documento> };
};

const RUTA = "/vendor/pdfjs";

/** El texto de las primeras páginas del PDF. Lanza un error si no se puede leer. */
export async function textoDePdf(archivo: Blob, paginas = 4): Promise<string> {
  const pdfjs = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ `${RUTA}/pdf.min.js`)) as PdfJs;
  pdfjs.GlobalWorkerOptions.workerSrc = `${RUTA}/pdf.worker.min.js`;
  const documento = await pdfjs.getDocument({ data: await archivo.arrayBuffer() }).promise;
  try {
    const partes: string[] = [];
    for (let numero = 1; numero <= Math.min(documento.numPages, paginas); numero++) {
      const { items } = await (await documento.getPage(numero)).getTextContent();
      for (const item of items) if (item.str) partes.push(item.str, item.hasEOL ? "\n" : " ");
      partes.push("\n");
    }
    return partes.join("");
  } finally {
    void documento.destroy();
  }
}
