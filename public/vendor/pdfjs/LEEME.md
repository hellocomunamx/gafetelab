# pdf.js

Copia de `pdfjs-dist` 4.10.38 (versión `legacy`, para navegadores no tan nuevos), de Mozilla, con licencia Apache 2.0 (ver `LICENSE`).

Se usa solo en el navegador, para leer el texto de la Constancia de Situación Fiscal y prellenar sus datos (`src/lib/cuenta/leer-pdf.ts`). Vive aquí, como archivo estático, para que no entre al paquete del servidor.

Para actualizarla: `npm pack pdfjs-dist@<versión>` y copiar `legacy/build/pdf.min.mjs` y `legacy/build/pdf.worker.min.mjs` (aquí con extensión `.js`, para que cualquier servidor los entregue como JavaScript) y `LICENSE`.
