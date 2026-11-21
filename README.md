# LaGafetería

Tienda en línea de gafetes y credenciales para empleados. Sitio en Next.js (App Router) desplegado en Cloudflare Workers con OpenNext, con Supabase y Resend.

## Comandos

```bash
npm install
cp .env.example .env.local
npm run dev        # desarrollo en http://localhost:3000
npm run lint
npm run build      # compilación de Next.js
npm run preview    # compila y corre en el runtime de Cloudflare (local)
npm run deploy     # compila y publica en Cloudflare Workers
```

Secretos en Cloudflare:

```bash
npx wrangler login
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put RESEND_FROM      # opcional: "LaGafetería <hola@tudominio>"
```

Sin `RESEND_API_KEY`, el cotizador sigue funcionando y descargando el PDF; solo el envío por correo responde que todavía no está activo.

Para servir en `lagafeteria.com`, quita el comentario de `routes` en `wrangler.jsonc` y corre `npm run deploy`.

## Dónde vive cada cosa

| Qué | Dónde |
| --- | --- |
| Nombre, URL, correo, tiempo de entrega, vigencia de la cotización | `src/lib/site.ts` |
| Datos legales del aviso de privacidad y enlace de Figalo | `src/lib/site.ts` (`legal`, `figalo`) |
| Precios por pieza (impreso y digital), frente y vuelta, IVA, paquetes prepagados | `src/lib/precios.ts` |
| Materiales, grosores, extra por material y medidas del archivo (sangrado, zona segura) | `src/lib/materiales.ts` |
| Vista del diseño y zona de impresión | `src/components/VistaGafete.tsx`, `src/components/DiagramaGafete.tsx` |
| Tarifa de envío y monto para envío gratis | `src/lib/precios.ts` (`envio`) |
| Cotizador | `src/components/Cotizador.tsx` |
| Textos y PDF de la cotización | `src/lib/cotizacion.ts`, `src/lib/cotizacion-pdf.ts` |
| Envío de la cotización por correo | `src/app/api/cotizacion/route.ts`, `src/lib/correo.ts` |
| Modalidades, acciones y ajustes de la plataforma | `src/lib/plataforma.ts` |
| Aviso de privacidad | `src/app/aviso-de-privacidad/page.tsx` |
| Preguntas frecuentes | `src/lib/faqs.ts` |
| Páginas por giro (`/gafetes-para/...`) | `src/lib/giros.ts` |
| Páginas por ciudad (`/gafetes-en/...`) | `src/lib/ciudades.ts` |
| Pasos de "cómo funciona" | `src/lib/pasos.ts` |
| Colores y tipografías | `src/app/globals.css`, `src/fonts/` |
| Logo, íconos e imagen para redes | `public/marca/`, `src/app/` (`favicon.ico`, `icon.svg`, `apple-icon.png`) |

Agregar un giro o una ciudad es agregar un objeto a su archivo: la página, el sitemap, el pie y `llms.txt` se actualizan solos.

Los precios, el envío y la entrega se escriben una sola vez: el cotizador, la tabla, las preguntas frecuentes, el PDF, el correo, los datos estructurados y `llms.txt` leen de `src/lib/precios.ts` y `src/lib/site.ts`. Con `envio.gratisDesde = 0`, todo el envío es gratis.

## SEO, GEO y AEO

- **Render:** todas las páginas públicas se generan como HTML estático al compilar. No dependen de JavaScript para mostrar contenido (el cotizador es interactivo, pero la tabla de precios está en HTML).
- **Metadatos:** `src/lib/seo.ts` da título, descripción, canónica, Open Graph y Twitter a cada página. El layout define robots y verificación de buscadores.
- **Datos estructurados (schema.org, JSON-LD):** `src/lib/schema.ts`. `Organization` + `OnlineStore` y `WebSite` en todo el sitio; `Product` con rango de precios; `FAQPage`; `HowTo`; `Service` por giro y por ciudad; `BreadcrumbList`.
- **Rastreo:** `/sitemap.xml` (`src/app/sitemap.ts`) y `/robots.txt` (`src/app/robots.ts`), que permite de forma explícita a los rastreadores de IA.
- **Asistentes de IA:** `/llms.txt` y `/llms-full.txt` (`src/lib/llms.ts`), generados con los mismos datos que las páginas.
- **Contenido:** encabezados en forma de pregunta, respuesta corta al inicio de cada página, tablas HTML reales para precios y preguntas frecuentes visibles sin JavaScript.
- **Vocabulario:** usar siempre "gafetes y credenciales".

Variables útiles: `NEXT_PUBLIC_NOINDEX=true` evita que se indexe un ambiente de pruebas; `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` y `NEXT_PUBLIC_BING_SITE_VERIFICATION` verifican el sitio en Search Console y Bing.

Al cambiar contenido, actualiza `actualizado` en `src/lib/site.ts` (alimenta `lastmod` del sitemap).

## Pendientes antes de lanzar

- Dominio definitivo: hoy es provisional (`lagafeteria.com`). Se cambia en una línea de `src/lib/site.ts`, más `routes` en `wrangler.jsonc` y `.env.example`.
- Confirmar precios, IVA, extra de frente y vuelta, tarifa de envío, monto de envío gratis y paquetes prepagados en `src/lib/precios.ts`.
- Confirmar con el taller o la impresora los materiales, sus costos y las medidas de sangrado y zona segura en `src/lib/materiales.ts`.
- Cambiar las ilustraciones de materiales (`src/components/MuestraMaterial.tsx`) por fotos reales cuando haya muestras.
- Los paquetes prepagados se anuncian, pero todavía no se pueden comprar: falta el cobro y el saldo de gafetes en la cuenta.
- Confirmar el correo de contacto y el tiempo de entrega en `src/lib/site.ts`.
- Correo de cotizaciones: verificar el dominio en Resend y cargar `RESEND_API_KEY` (y `RESEND_FROM` si aplica).
- Proteger `/api/cotizacion` contra abuso antes de lanzar (regla de rate limiting en Cloudflare o Turnstile). Hoy valida origen, formato y un campo trampa.
- Revisión del aviso de privacidad por una persona abogada. Está adaptado del aviso de Figalo y nombra proveedores (pagos, facturación, talleres, paquetería) que aún no están contratados.
- La plataforma de cuenta y los gafetes digitales se describen en el sitio, pero todavía no están construidos. Esto incluye predeterminados, pedido abierto con aviso, diseños por reglas y campos a la medida con plantilla de Excel.
- Entrega exprés: aparece como "Próximamente" en el cotizador y en las preguntas frecuentes.
- En Cloudflare, revisar que el bloqueo de bots de IA y el `robots.txt` administrado estén apagados para el dominio; si no, anulan lo que define el sitio.
- Dar de alta el sitio en Google Search Console y Bing Webmaster Tools y enviar el sitemap.
