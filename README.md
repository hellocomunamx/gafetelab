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
```

Para servir en `lagafeteria.com`, quita el comentario de `routes` en `wrangler.jsonc` y corre `npm run deploy`.

## Dónde vive cada cosa

| Qué | Dónde |
| --- | --- |
| Nombre, URL, correo, días de entrega | `src/lib/site.ts` |
| Precios por pieza, frente y vuelta, IVA | `src/lib/precios.ts` |
| Preguntas frecuentes | `src/lib/faqs.ts` |
| Páginas por giro (`/gafetes-para/...`) | `src/lib/giros.ts` |
| Páginas por ciudad (`/gafetes-en/...`) | `src/lib/ciudades.ts` |
| Pasos de "cómo funciona" | `src/lib/pasos.ts` |
| Colores y tipografías | `src/app/globals.css`, `src/fonts/` |
| Logo, íconos e imagen para redes | `public/marca/`, `src/app/` (`favicon.ico`, `icon.svg`, `apple-icon.png`) |

Agregar un giro o una ciudad es agregar un objeto a su archivo: la página, el sitemap, el pie y `llms.txt` se actualizan solos.

## SEO, GEO y AEO

- **Render:** todas las páginas públicas se generan como HTML estático al compilar. No dependen de JavaScript para mostrar contenido.
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
- Confirmar precios, IVA y extra de frente y vuelta en `src/lib/precios.ts`.
- Confirmar el correo de contacto en `src/lib/site.ts`.
- Aviso de privacidad definitivo (`/aviso-de-privacidad` no se indexa mientras tanto).
- En Cloudflare, revisar que el bloqueo de bots de IA y el `robots.txt` administrado estén apagados para el dominio; si no, anulan lo que define el sitio.
- Dar de alta el sitio en Google Search Console y Bing Webmaster Tools y enviar el sitemap.
