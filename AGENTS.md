<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## GafeteLab

- Textos en español de México, tono cercano. Usar siempre "gafetes y credenciales".
- El contenido vive en `src/lib/` (ver README). No escribir precios, tiempos de entrega ni datos de contacto directo en las páginas: importarlos de `src/lib/precios.ts` y `src/lib/site.ts`.
- Toda página pública nueva lleva `metadatos()` de `src/lib/seo.ts`, sus datos estructurados de `src/lib/schema.ts` y una entrada en `src/lib/rutas.ts`.
- `cacheComponents` está apagado a propósito: las páginas por giro y ciudad usan `dynamicParams = false` para responder 404 real en rutas que no existen.
- Despliegue: Cloudflare Workers con OpenNext (`npm run preview`, `npm run deploy`).
