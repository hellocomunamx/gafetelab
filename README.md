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
npx wrangler secret put SUPABASE_SECRET_KEY   # opcional: fotografía en la página de verificación del QR
```

Sin `RESEND_API_KEY`, el cotizador sigue funcionando y descargando el PDF; solo el envío por correo responde que todavía no está activo.

El formulario de contacto (`/contacto`) usa el mismo secreto: manda cada mensaje a `site.correo` con Resend y pone como «responder a» el correo de quien escribió. Sin `RESEND_API_KEY` avisa que todavía no está activo y muestra el correo de contacto.

### Publicar

`npm run deploy` compila con los valores de `.env.production` (URL del sitio y Supabase, todos públicos) y publica el Worker en `lagafeteria.com` y `www.lagafeteria.com`. Esos valores mandan sobre `.env.local`, así que lo que tengas para desarrollo no se cuela al sitio publicado.

Antes de la primera vez:

1. El dominio debe estar en la misma cuenta de Cloudflare que el Worker.
2. `npx wrangler login`.
3. Después del primer `npm run deploy`, carga los secretos de arriba.
4. En Supabase, pon `https://lagafeteria.com` como Site URL y agrega `https://lagafeteria.com/auth/confirmar` a las Redirect URLs. Sin eso, la liga del correo de acceso no regresa al sitio.

`routes` en `wrangler.jsonc` solo agrega el sitio al dominio; no toca los registros de correo (MX, SPF, DKIM).

## Plataforma (cuenta, empresa y equipo)

Vive en `/cuenta` y pide sesión. Lo que hay hoy: entrar con liga o código por correo, con contraseña (opcional, se crea en `/cuenta/acceso`) o con Google o Microsoft si se activan; invitar usuarios a la empresa con roles; crear la empresa, datos de envío y de facturación guardados, equipo con filtros, altas, bajas e historial de gafetes, campos a la medida, plantilla de Excel para subir al equipo, carga masiva de fotos y editor de diseño con vista previa de cada gafete.

| Qué | Dónde |
| --- | --- |
| Tablas, permisos, reglas de acceso y almacenamiento de fotos | `supabase/migrations/` |
| Correo de acceso (liga y código) | `supabase/templates/acceso.html` |
| Sesión: renovarla y proteger `/cuenta` | `src/middleware.ts`, `src/lib/cuenta/sesion.ts` |
| Usuarios, invitaciones, roles y contraseña | `src/app/cuenta/usuarios/`, `src/app/cuenta/invitaciones/`, `src/app/cuenta/acceso/`, `src/lib/cuenta/roles.ts` |
| Entrar, confirmar la liga y salir | `src/app/entrar/`, `src/app/auth/confirmar/route.ts`, `src/app/salir/route.ts` |
| Páginas de la cuenta | `src/app/cuenta/` |
| Todo lo que guarda o borra (acciones del servidor) | `src/app/cuenta/acciones.ts` |
| Lectura del Excel y sus columnas | `src/lib/cuenta/excel.ts`, `src/components/cuenta/ImportarExcel.tsx` |
| A quién corresponde cada foto | `src/lib/cuenta/emparejar.ts`, `src/components/cuenta/SubirFotos.tsx` |
| Editor de diseño, dibujo del gafete y panel de propiedades | `src/components/diseno/` |
| Diseños: tipos, plantillas de arranque, acomodo del texto y limpieza de lo que llega del navegador | `src/lib/diseno/` |
| Páginas de diseños (lista, nuevo, editor, vista previa) y sus acciones | `src/app/cuenta/disenos/` |
| Tipos de la base de datos | `src/lib/supabase/tipos.ts` (generados) |

Reglas que conviene saber:

- Cada persona solo ve las empresas donde es miembro. Lo garantiza la base de datos (RLS), no solo la página.
- Las fotos van a un almacenamiento privado, en `<empresa>/<empleado>.jpg`, ya recortadas a 600 × 800 en el navegador. Se muestran con ligas temporales.
- Al importar, quien ya existe se actualiza: se reconoce por número de empleado o, si no tiene, por nombre.
- Una foto se asigna por el archivo indicado en el Excel, luego por número de empleado y luego por nombre completo. Si hay duda, se queda sin asignar para acomodarla a mano.
- Un diseño guarda sus elementos en milímetros, medidos desde la esquina superior izquierda del corte; lo que sale al margen de corte (sangrado) lleva coordenadas negativas. El mismo dibujo (`GafeteSvg`) sirve para el editor, las miniaturas y la vista previa.
- Si un texto no cabe en su caja, primero se parte en renglones, luego se reduce la letra hasta 55 % y al final se recorta con puntos suspensivos. El editor avisa cuando algo se recorta o se sale de la zona segura.
- Los fondos, logos e imágenes de los diseños van al almacenamiento privado `disenos`, en `<empresa>/<archivo>`. Al guardar o borrar un diseño se eliminan los archivos de más de un día que ya no usa ningún diseño.
- Todo diseño que llega del navegador pasa por `limpiarCara` antes de guardarse: solo admite tipos conocidos, medidas dentro del gafete y archivos de la propia empresa.
- `src/middleware.ts` no se renombra a `proxy.ts` aunque Next lo sugiera: con OpenNext en Cloudflare el proxy de Node responde 500 a cualquier visita que traiga cookies.

### Usuarios y roles

Cada empresa puede invitar a más personas a su plataforma desde `/cuenta/usuarios`:

| Rol | Qué puede hacer |
| --- | --- |
| Dueño (`propietario`) | Todo, incluido invitar administradores, cambiar roles y quitar personas. La empresa nunca se queda sin dueño. |
| Administrador | Todo lo de la empresa (equipo, diseños, envío y facturación). Invita y quita editores. |
| Editor | Equipo, campos y diseños. Ve envío y facturación, pero no los cambia. |

- La invitación va a un correo. Quien entra con ese correo la ve en `/cuenta/invitaciones` y la acepta; el aviso sale con Resend (`RESEND_API_KEY`) y, si no está configurado, la invitación se guarda igual y la pantalla lo dice.
- Los permisos se cumplen en la base de datos (reglas de acceso y funciones `invitar_usuario`, `aceptar_invitacion`, `cambiar_rol_usuario`, `quitar_usuario`), no solo en la pantalla.
- **Importante:** las invitaciones confían en que el correo de la sesión está verificado. En Supabase, deja activado "Confirm email" en Authentication, Sign In / Providers, Email (viene activado). Si se apaga, alguien podría registrarse con un correo ajeno y aceptar su invitación.
- La contraseña es opcional y se crea en `/cuenta/acceso`. No hay pantalla de "olvidé mi contraseña": se entra con la liga o el código por correo y se crea otra.

### Qué muestra tu QR

Cada empresa decide en `/cuenta/campos#qr` qué lleva el código QR de sus gafetes (columnas `qr_*` de `empresas`). Solo lo cambia quien administra.

- **Página de verificación** (por omisión, incluida en todos los gafetes sin costo extra). El código lleva a `/v/<código>`, una página pública y sin indexar que dice Vigente, Expirado, No válido (baja) o Aún no activo (pendiente), con los datos que la empresa eligió: su nombre, nombre de la persona, puesto, número de empleado, departamento y fotografía. De alguien de baja o pendiente no muestra ningún dato personal. Si la empresa elige un campo de tipo Fecha como vigencia, pasada esa fecha dice Expirado.
- **Una liga tuya.** Debe empezar con `https://`. Acepta `{numero}` (número de empleado) y `{codigo}` (código único del gafete).
- **Un dato.** El código contiene solo el valor de un campo, por ejemplo el número de empleado.

Cada persona tiene un código público de 12 caracteres (`empleados.codigo`) que pone la base de datos y nunca cambia. La página consulta la función `verificar_gafete`, la única puerta abierta sin sesión: devuelve solo lo que la empresa eligió mostrar. El código QR se genera en `src/lib/qr.ts` y se dibuja como vector en el gafete, en la vista previa y en la página de cada persona.

La fotografía vive en almacenamiento privado, así que la página de verificación la pide con la llave secreta del proyecto (`SUPABASE_SECRET_KEY`, en Project Settings, API Keys) y una liga que dura 5 minutos. Sin esa llave, la opción «Fotografía» no se ofrece y todo lo demás funciona igual.

Hoy la verificación responde por cualquier persona activa del equipo. Cuando existan los pedidos se ligará a los gafetes emitidos, para poder desactivar un gafete sin dar de baja a la persona.

### Configurar Supabase (una vez)

Las tablas ya están aplicadas en el proyecto `lagafeteria`. Falta esto en el panel de Supabase:

1. **Authentication, URL Configuration.** Site URL: la del sitio. Redirect URLs: `https://TU-DOMINIO/auth/confirmar` y `http://localhost:3000/**`.
2. **Authentication, Emails.** Pega cada plantilla de `supabase/templates/` con su asunto (tabla de abajo). Sin la de acceso la liga funciona, pero el correo no trae el código.
3. **Authentication, Emails, SMTP.** Conecta Resend. El correo integrado de Supabase solo manda unos cuantos mensajes por hora.
4. **Authentication, Sign In / Providers (opcional).** Activa Google o Azure (Microsoft) y agrégalo en `NEXT_PUBLIC_AUTH_PROVEEDORES`.
5. En `.env.local` y en la compilación para Cloudflare: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Project Settings, API Keys).

Plantillas de correo ([panel de Email Templates](https://supabase.com/dashboard/project/iegmamfbggjvzwktvkjx/auth/templates)):

| Plantilla en Supabase | Archivo | Asunto |
| --- | --- | --- |
| Magic Link y Confirm signup | `acceso.html` | `Tu acceso a LaGafetería` |
| Invite user | `invitacion.html` | `Te invitaron a LaGafetería` |
| Change email address | `cambio-de-correo.html` | `{{ .Token }} es tu código para confirmar tu nuevo correo` |
| Reset password | `restablecer-contrasena.html` | `{{ .Token }} es tu código para restablecer tu contraseña` |
| Reauthentication | `verificacion.html` | `{{ .Token }} es tu código de verificación de LaGafetería` |

Hoy Supabase solo manda el correo de acceso; el aviso de invitación a una empresa lo manda la propia app con Resend. Los demás quedan listos para cuando existan el cambio de correo o el restablecimiento de contraseña; sus ligas regresan a `/auth/confirmar` e inician la sesión.

### Base de datos local

Con Docker abierto:

```bash
npx supabase start           # levanta Supabase local y aplica las migraciones
npx supabase status          # muestra la URL y la llave para .env.local
npx supabase migration new nombre_del_cambio
npx supabase migration up    # aplica migraciones nuevas
npx supabase gen types typescript --local > src/lib/supabase/tipos.ts
npx supabase db push         # aplica las migraciones al proyecto real (pide `supabase link`)
```

Los correos de acceso locales llegan a http://127.0.0.1:54324.

## Dónde vive cada cosa

| Qué | Dónde |
| --- | --- |
| Nombre, URL, correo, tiempo de entrega, vigencia de la cotización | `src/lib/site.ts` |
| Datos legales del aviso de privacidad y enlace de Figalo | `src/lib/site.ts` (`legal`, `figalo`) |
| Precios por pieza (impreso y digital), frente y vuelta, IVA, paquetes prepagados | `src/lib/precios.ts` |
| Materiales, grosores, extra por material y medidas del archivo (margen de corte, zona segura) | `src/lib/materiales.ts` |
| Vista del diseño y zona de impresión | `src/components/VistaGafete.tsx`, `src/components/DiagramaGafete.tsx` |
| Tarifa de envío y monto para envío gratis | `src/lib/precios.ts` (`envio`) |
| Cotizador | `src/components/Cotizador.tsx` |
| Qué muestra el QR, generador del código y página de verificación | `src/lib/cuenta/qr.ts`, `src/lib/qr.ts`, `src/app/v/[codigo]/page.tsx` |
| Video de la página de inicio (archivo, portada, título y datos estructurados) | `public/video/`, `videoPitch` en `src/lib/schema.ts`, `src/components/VideoPitch.tsx` |
| Textos y PDF de la cotización | `src/lib/cotizacion.ts`, `src/lib/cotizacion-pdf.ts` |
| Envío de la cotización por correo | `src/app/api/cotizacion/route.ts`, `src/lib/correo.ts` |
| Modalidades, funciones de la plataforma (con la marca `pronto` de lo que aún no está disponible), formas de subir al equipo y lo que no cobra | `src/lib/plataforma.ts` |
| Animación del héroe y maquetas de gafetes, celular y plataforma (solo HTML y CSS) | `src/components/HeroAnimado.tsx`, `src/components/Muestras.tsx`, `.heroe-animado` en `src/app/globals.css` |
| Aviso de privacidad | `src/app/aviso-de-privacidad/page.tsx` |
| Preguntas frecuentes | `src/lib/faqs.ts` |
| Páginas por giro (`/gafetes-para/...`) | `src/lib/giros.ts` |
| Página de envíos (`/gafetes-en`) y páginas por ciudad (`/gafetes-en/...`) | `src/lib/ciudades.ts` |
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

- Confirmar precios, IVA, extra de frente y vuelta, tarifa de envío, monto de envío gratis y paquetes prepagados en `src/lib/precios.ts`.
- Confirmar con el taller o la impresora los materiales, sus costos y las medidas de margen de corte y zona segura en `src/lib/materiales.ts`.
- Cambiar las ilustraciones de materiales (`src/components/MuestraMaterial.tsx`) por fotos reales cuando haya muestras.
- Los paquetes prepagados se anuncian, pero todavía no se pueden comprar: falta el cobro y el saldo de gafetes en la cuenta.
- Confirmar el correo de contacto y el tiempo de entrega en `src/lib/site.ts`.
- Correo de cotizaciones: verificar el dominio en Resend y cargar `RESEND_API_KEY` (y `RESEND_FROM` si aplica).
- Proteger `/api/cotizacion` contra abuso antes de lanzar (regla de rate limiting en Cloudflare o Turnstile). Hoy valida origen, formato y un campo trampa.
- Revisión del aviso de privacidad por una persona abogada. Está adaptado del aviso de Figalo y nombra proveedores (pagos, facturación, talleres, paquetería) que aún no están contratados.
- Terminar de configurar Supabase para la plataforma (ver "Configurar Supabase").
- De la plataforma falta: invitar a más personas a la empresa, liga por empleado para que suba sus datos, diseños por reglas (puesto, departamento, contrato), código QR real de cada persona, pedidos con pago (Stripe) y factura, pedido abierto con aviso, paquetes con saldo y gafetes digitales.
- Entrega exprés: aparece como "Próximamente" en el cotizador y en las preguntas frecuentes.
- En Cloudflare, revisar que el bloqueo de bots de IA y el `robots.txt` administrado estén apagados para el dominio; si no, anulan lo que define el sitio.
- Dar de alta el sitio en Google Search Console y Bing Webmaster Tools y enviar el sitemap.
