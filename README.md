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
npx wrangler secret put SUPABASE_SECRET_KEY   # fotografía en la verificación del QR, panel de administración y pedidos
npx wrangler secret put STRIPE_SECRET_KEY     # cobro de pedidos (llave restringida rk_...)
npx wrangler secret put STRIPE_WEBHOOK_SECRET # firma de los avisos de Stripe (whsec_...)
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

### Términos y aviso de privacidad

Para usar la cuenta hay que aceptar los términos y condiciones (`/terminos`) y el aviso de privacidad. Quien entra sin haberlo hecho llega a `/aceptar`, con una casilla obligatoria; aplica igual a quien entra con liga, contraseña, Google o Microsoft, y a las cuentas que ya existían (una sola vez).

Cada aceptación queda en la tabla `aceptaciones`: usuario, versión de los términos, versión del aviso y fecha. La fecha y el usuario los pone la base de datos, y los renglones no se pueden cambiar ni borrar desde la app. Las versiones salen de `legal` en `src/lib/site.ts`: al cambiar un documento, sube ahí su versión y su fecha. La casilla de novedades y promociones es opcional y va aparte: se guarda en `perfiles.publicidad` (con la fecha del último cambio en `publicidad_en`), nace apagada y cada persona la cambia en `/cuenta/acceso`. Los negocios afiliados que se nombran salen de `afiliados` en `src/lib/site.ts`. Hoy basta con haber aceptado una vez; si un cambio futuro debe volver a aceptarse, se ajusta `miAceptacion` en `src/lib/cuenta/sesion.ts`.

### Ya tengo mis gafetes listos

En `/cuenta/disenos/listos` una empresa sube de forma masiva los gafetes que ya tiene terminados, una imagen por persona y por cara (JPG o PNG, sueltas o en un ZIP). No pasan por el editor.

- **A quién le toca cada archivo.** Por el nombre: número de empleado o nombre completo, igual que las fotos (`src/lib/cuenta/emparejar.ts`). Si termina en `-frente`, `-vuelta`, `_f`, `_v`, `-1` o `-2`, ese final dice la cara. Lo que no se reconoce queda sin asignar y se elige a mano.
- **Revisión.** `revisarGafete` en `src/lib/cuenta/listos.ts` compara la proporción con la del gafete con margen de corte y sin él, y calcula los dpi. Bloquea lo que no tiene proporción de gafete o trae menos de 150 dpi; lo demás se sube con su aviso (sin margen de corte, proporción no exacta, resolución baja o justa, frente y vuelta con distinta orientación).
- **Dónde quedan.** Tabla `gafetes_listos` (un renglón por persona, con ruta, ancho y alto de cada cara) y bucket privado `gafetes`, en `<empresa>/<empleado>-<cara>.<jpg|png>`. Subir otra vez la misma cara la reemplaza. Las imágenes de más de 3000 px o de 8 MB se reducen a JPEG de 2400 px antes de subir.

### Liga por persona

Cada persona del equipo tiene una liga propia (`/mi-gafete/<liga>`) para revisar sus datos y subir su foto desde el celular, sin crear cuenta. Lo que manda no cambia su ficha: queda como propuesta hasta que la empresa la aprueba en `/cuenta/equipo/ligas`. Migración `20261123060000_liga_por_persona.sql`.

- **La liga.** `empleados.liga`, 24 caracteres al azar que pone la base de datos. Es distinta del código del QR (que es público). No vence, deja de funcionar si la persona se da de baja y se puede cambiar por una nueva desde su ficha.
- **Qué se pide.** La empresa elige con chips qué campos de texto y fecha ve cada quien y si se pide fotografía (`empresas.liga_campos` y `empresas.liga_foto`; por omisión, nombre y foto). Lo que no se elige no se muestra ni se puede cambiar.
- **Lo que manda la persona.** Una fila por persona en `propuestas` (si vuelve a mandar, se reemplaza) y su foto en `fotos/<empresa>/pendientes/<persona>.jpg`, ya recortada a 600 × 800 en el navegador. La página pública lee y escribe con `SUPABASE_SECRET_KEY` (`src/lib/cuenta/liga-publica.ts`, `src/app/mi-gafete/acciones.ts`).
- **Aprobar o pedir corrección.** Al aprobar, los datos y la foto pasan a la ficha. Al pedir una corrección se guarda el motivo, y la persona lo ve al abrir su liga.
- **Cómo se manda.** El correo de cada persona (`empleados.correo`) se captura en su ficha o en la columna «Correo» de la plantilla de Excel. Con un botón se manda la liga por correo a todas las personas que tienen correo y todavía no la reciben (`enviarCorreos` en `src/lib/correo.ts`, en lotes de 100 con Resend; hasta 1,000 por clic; la respuesta le llega a quien oprimió el botón). Cada persona trae además su botón para copiar la liga, otro de WhatsApp con el mensaje ya escrito y otro para mandar o reenviar su correo, y todas las ligas se bajan en un Excel.
- **Contra el abuso.** Mandar correos desde la plataforma pide `RESEND_API_KEY` y la constancia aprobada; copiar la liga, WhatsApp y el Excel funcionan siempre. El plan gratuito de Resend deja mandar 100 correos al día: si se acaba, se avisa cuántos salieron y los demás quedan pendientes.
- La liga no se indexa (`robots.ts` y `noindex`), no manda referente y no entra al conteo de visitas.

### Qué muestra tu QR

Cada empresa decide en `/cuenta/campos#qr` qué lleva el código QR de sus gafetes (columnas `qr_*` de `empresas`). Solo lo cambia quien administra.

- **Página de verificación** (por omisión, incluida en todos los gafetes sin costo extra). El código lleva a `/v/<código>`, una página pública y sin indexar que dice Vigente, Expirado, No válido (baja) o Aún no activo (pendiente), con los datos que la empresa eligió: su nombre, nombre de la persona, puesto, número de empleado, departamento y fotografía. De alguien de baja o pendiente no muestra ningún dato personal. Si la empresa elige un campo de tipo Fecha como vigencia, pasada esa fecha dice Expirado.
- **Una liga tuya.** Debe empezar con `https://`. Acepta `{numero}` (número de empleado) y `{codigo}` (código único del gafete).
- **Un dato.** El código contiene solo el valor de un campo, por ejemplo el número de empleado.

Cada persona tiene un código público de 12 caracteres (`empleados.codigo`) que pone la base de datos y nunca cambia. La página consulta la función `verificar_gafete`, la única puerta abierta sin sesión: devuelve solo lo que la empresa eligió mostrar. El código QR se genera en `src/lib/qr.ts` y se dibuja como vector en el gafete, en la vista previa y en la página de cada persona.

La fotografía vive en almacenamiento privado, así que la página de verificación la pide con la llave secreta del proyecto (`SUPABASE_SECRET_KEY`, en Project Settings, API Keys) y una liga que dura 5 minutos. Sin esa llave, la opción «Fotografía» no se ofrece y todo lo demás funciona igual.

Hoy la verificación responde por cualquier persona activa del equipo. Cuando existan los pedidos se ligará a los gafetes emitidos, para poder desactivar un gafete sin dar de baja a la persona.

### Constancia de Situación Fiscal

Al crear una empresa, lo primero que se le pide es su Constancia de Situación Fiscal (`/cuenta/constancia`), en PDF, JPG o PNG de hasta 5 MB y con no más de 3 meses de antigüedad (`site.constanciaMeses`). Puede dejarla para después, pero debe estar **aprobada antes del primer pedido**: `puedePedir()` en `src/lib/cuenta/constancia.ts` es la comprobación que usan los pedidos. La sube quien es dueño o administrador de la empresa; queda «en revisión» y se aprueba o se rechaza (con motivo) desde el panel de administración. La empresa no puede cambiarla ni borrarla; si se rechaza, sube una nueva. Tabla `constancias` y almacenamiento privado `constancias`.

**Datos prellenados.** Si el archivo es el PDF original del SAT, el navegador lee su texto (`src/lib/cuenta/leer-pdf.ts`, con pdf.js servido desde `public/vendor/pdfjs`, fuera del paquete del sitio) y `leerConstancia` (`src/lib/cuenta/constancia-datos.ts`) saca RFC, nombre o razón social, régimen, código postal y fecha de emisión. Se muestran prellenados para que la persona los revise, los corrija y los confirme; al subir la constancia se guardan como datos de facturación (`guardarFiscalesDeConstancia`), salvo que quite la casilla o ya exista ese RFC. Con fotos, escaneos o un PDF que no se pueda leer, todo sigue como antes: solo se pide la fecha. El archivo no sale del navegador hasta que se sube.

**Por qué se pide.** El desplegable «¿Por qué necesitan mi constancia?» (`PorQueConstancia`, textos en `constancia` de `src/lib/site.ts`) aparece en el aviso del resumen y en la página de la constancia.

### Pedidos y pago

Quien es dueño o administrador de una empresa con la constancia aprobada pide desde `/cuenta/pedidos/nuevo`: elige el diseño (o sus gafetes listos), a quién incluir, el material, la dirección y si quiere factura, revisa el resumen, marca que aprobó la vista previa y pasa a pagar. El precio se vuelve a calcular en el servidor con `cotizar()`; lo que mande el navegador no cuenta.

El pedido guarda una **copia** de todo lo que se va a imprimir y a cobrar (diseño, datos de cada persona, dirección, datos de facturación e importes), para que nada cambie después de aprobado. Los pedidos solo los escribe el servidor con la llave secreta; las empresas los leen, sin las notas internas ni los controles de revisión (migración `20261123040000_pedidos.sql`).

Estados: `por_pagar`, `pago_en_proceso` (ficha de OXXO o datos de transferencia generados), `autorizado` (tarjeta autorizada, corren los minutos de gracia), `pagado`, `en_produccion`, `enviado`, `entregado`, `cancelado` y `reembolsado`. Las reglas viven en `src/lib/pedidos/reglas.ts`:

- **Solo transferencia** desde 300 piezas o desde $10,000 de total.
- **Ficha de OXXO** con 3 días de vigencia.
- **30 minutos de gracia** con tarjeta: el cargo queda solo autorizado y la empresa puede cancelar desde su plataforma sin costo. Pasado ese tiempo se hace el cargo. Con OXXO o SPEI se cancela sin costo mientras no se haya pagado.
- **No se produce sin pago confirmado**, y el primer pedido de cada empresa (o uno con alertas) pide revisión antes de producir.
- Máximo 5 pedidos abiertos por empresa y 5,000 piezas por pedido.

El cobro es un Checkout alojado de Stripe, creado con `fetch` desde `src/lib/stripe.ts` (sin SDK), con 3D Secure en tarjeta. Stripe avisa a `/api/stripe/webhook`, que comprueba la firma, no procesa dos veces el mismo aviso y mueve el pedido (`src/lib/pedidos/avisos.ts`).

El cargo después de la gracia no tiene reloj propio: se hace cuando llega cualquier aviso de Stripe y cuando alguien abre el panel de pedidos, la lista o el detalle de un pedido. La autorización dura cerca de 7 días; si se vence, el pedido vuelve a «por pagar».

Configurar Stripe (una vez):

1. Crear una llave restringida con escritura en Checkout Sessions, Customers y PaymentIntents, y cargarla como `STRIPE_SECRET_KEY`.
2. Con el sitio ya publicado, crear el webhook hacia `https://lagafeteria.com/api/stripe/webhook` con estos eventos: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `payment_intent.payment_failed`, `payment_intent.canceled`, `charge.refunded`, `charge.dispute.created` y `charge.dispute.closed`. Su secreto de firma va en `STRIPE_WEBHOOK_SECRET`.

Sin esas dos llaves (o sin `SUPABASE_SECRET_KEY`), la plataforma dice que los pedidos todavía no están activos y todo lo demás funciona igual. `STRIPE_API_URL` solo sirve para apuntar a un Stripe simulado en pruebas locales.

### Carrito y saldo prepagado

Los paquetes (`/precios#paquetes`), el paquete a la medida y el cotizador tienen «Lo quiero» o «Agregar al carrito». El carrito vive en el navegador (`src/lib/carrito-navegador.ts`) y no pide cuenta hasta pagar; `/carrito` lleva a entrar o crear la cuenta, aceptar términos y registrar la empresa, y regresa solo al carrito (`?siguiente=/carrito`, `src/lib/cuenta/siguiente.ts`).

Pagar el carrito crea un pedido de tipo `prepago` (`src/app/carrito/acciones.ts`) que se cobra igual que cualquier pedido. Al confirmarse el pago, su contenido queda en `saldos` (gafetes por cara y material, y envíos), con vigencia de 12 meses. Al hacer un pedido de impresión se usa primero el saldo (`src/lib/pedidos/saldo.ts`): se cobra solo la diferencia de vuelta o de material y los gafetes que falten; si el saldo cubre todo, el pedido queda pagado sin pasar por Stripe. El saldo se aparta con `usar_saldo` (todo o nada) y regresa si el pedido se cancela. Migración `20261123070000_carrito_y_saldo.sql`.

### Administración (solo quien opera LaGafetería)

`/8admins` es el panel interno (la ruta está en `src/lib/admin/ruta.ts`; no es `/admin` a propósito, y no se anuncia en `robots.txt` ni en el sitemap). No aparece en ningún menú de las empresas y, a quien no es administradora o no ha iniciado sesión, le responde «no existe». Trae ocho cosas:

- **Constancias por revisar**: abre el archivo, lo compara con el RFC y la razón social que la empresa capturó, y aprueba o rechaza.
- **Empresas**: todas las cuentas con el estado de su constancia, sus personas activas, diseños y gafetes listos, y un aviso de «Revisar» cuando el nombre de la empresa o los textos de sus diseños mencionan autoridades, dependencias o identificaciones oficiales (INE, gobierno, policía, SAT, IMSS y parecidas; la lista está en `src/lib/admin/alertas.ts`). El aviso no bloquea nada: pide que una persona lo vea antes de producir.
- **PDF de impresión** (`/8admins/imprimir/<empresa>`): una página por cara, de 85.6 × 54 mm exactos y de orilla a orilla, para mandarlo tal cual a la impresora de credenciales. Sale de un diseño con los datos de cada persona o de los gafetes que la empresa subió ya terminados. Se elige el orden de las páginas (frente y vuelta seguidos, o frentes y vueltas en archivos aparte), si la vuelta va girada 180° y a quién incluir. Se arma en el navegador, en archivos de hasta 50 gafetes, y no se guarda en ningún lado. Las empresas no tienen ninguna salida a tamaño real.

- **Pedidos** (`/8admins/pedidos`): el historial con estado, fechas, piezas, total y forma de pago, con filtros (por atender, en producción, enviados, sin pagar, cerrados) y búsqueda por folio o empresa. El detalle de cada pedido dice qué sigue (revisar, producir, enviar con guía, entregar), abre el PDF de impresión desde la copia guardada en el pedido, y junta la evidencia para una disputa: quién aprobó, cuándo, desde qué IP y navegador, con qué versión de los términos, y la bitácora completa.

- **Clientes** (`/8admins/clientes`): la base de clientes, una fila por empresa, con su contacto (quien es dueño de la cuenta), RFC, constancia, personas activas, pedidos pagados, cuánto ha pagado y su último pedido. Se filtra por quién ya compró y se busca por empresa, contacto, correo o RFC. La ficha de cada cliente junta sus pedidos, sus usuarios (con rol, último acceso y si aceptan publicidad), sus datos de facturación y sus direcciones.
- **Finanzas** (`/8admins/finanzas`): lo cobrado en el periodo (este mes, mes pasado, últimos 90 días, este año o todo), antes de IVA, pedido promedio, devuelto, cancelados (y cuántos fueron en los minutos de gracia), lo que está por cobrar, el reparto por forma de pago, las disputas, los últimos 12 meses y quién más compró. Los meses se cortan con la hora de Sonora. Las cifras son lo que pagaron los clientes: no descuentan la comisión de Stripe. Los cálculos están en `src/lib/admin/finanzas.ts`.

- **Visitas** (`/8admins/visitas`): visitas, páginas vistas y escaneos de QR por periodo (hoy, 7, 30 o 90 días), la gráfica por día, de dónde llegan (Google, ChatGPT, directo y demás), las páginas más vistas, con qué dispositivo y desde qué estado, y el camino de la visita a la compra (visitas, cuentas nuevas, empresas, pedidos hechos y pagados).
- **Abandonos** (`/8admins/abandonos`): los pedidos sin pagar, las empresas que se quedaron a medio camino (con el paso que les falta) y las cuentas que nunca registraron su empresa, cada una con su correo para escribirle.

Clientes y Finanzas se descargan en Excel (`src/lib/admin/xlsx.ts` arma el `.xlsx` sin dependencias nuevas).

Necesita `SUPABASE_SECRET_KEY` en el servidor, porque lee los datos de todas las empresas. Esa llave solo se usa después de comprobar que la sesión es de una administradora.

Para dar de alta a una administradora (no se puede desde la app), en el editor SQL de Supabase:

```sql
insert into privado.administradores (usuario_id)
select id from auth.users where email = 'correo-de-la-administradora';
```

Y para quitarla: `delete from privado.administradores where usuario_id = '<id>';`

### Conteo de visitas

Las visitas se cuentan en casa, sin servicios externos y sin cookies: el componente `Visita` (en el layout) avisa de cada página vista a `/api/visita`, que guarda un renglón en la tabla `visitas` (migración `20261123050000_visitas.sql`) con la página, si es la primera de la visita, de dónde llegó (el sitio que la mandó o `utm_source`), el tipo de dispositivo y el país y estado que informa Cloudflare. No se guarda la dirección IP ni el navegador. Las reglas están en `src/lib/visitas.ts`:

- Una **visita** empieza cuando alguien llega de fuera o entra directo; recargar o navegar dentro del sitio suma páginas vistas, no visitas.
- No se cuentan `/cuenta`, el panel, `/api`, las ligas personales (`/mi-gafete`) ni los rastreadores y navegadores automáticos, ni a quien tiene activado Do Not Track o Global Privacy Control.
- Las verificaciones de QR (`/v/<código>`) se guardan todas como `/v`, sin el código de la persona, y se muestran aparte como «escaneos de QR».

Necesita `SUPABASE_SECRET_KEY`; sin ella no se cuenta nada y el sitio funciona igual. El aviso de privacidad (versión 1.5) lo explica en el apartado de cookies.

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
| Precios por pieza (impreso y digital), frente y vuelta, IVA, paquetes prepagados y paquete a la medida (`cotizarPaquete`) | `src/lib/precios.ts` |
| Texto de la Constancia de Situación Fiscal y su antigüedad máxima | `src/lib/site.ts` (`constancia`, `site.constanciaMeses`) |
| Motivos del formulario de contacto, incluido «Tengo una idea» (`/contacto#idea`) | `src/lib/contacto.ts` |
| Materiales, grosores, extra por material y medidas del archivo (margen de corte, zona segura) | `src/lib/materiales.ts` |
| Vista del diseño y zona de impresión | `src/components/VistaGafete.tsx`, `src/components/DiagramaGafete.tsx` |
| Tarifa de envío y monto para envío gratis | `src/lib/precios.ts` (`envio`) |
| Cotizador | `src/components/Cotizador.tsx` |
| Qué muestra el QR, generador del código y página de verificación | `src/lib/cuenta/qr.ts`, `src/lib/qr.ts`, `src/app/v/[codigo]/page.tsx` |
| Liga por persona: reglas, correo, página pública y pantalla de la empresa | `src/lib/cuenta/ligas.ts`, `src/lib/cuenta/correo-liga.ts`, `src/app/mi-gafete/`, `src/app/cuenta/equipo/ligas/` |
| Panel de administración, alerta de palabras y PDF de impresión | `src/app/8admins/`, `src/lib/admin/`, `src/components/admin/ImprimirGafetes.tsx` |
| Letras de los diseños de gafete, con tamaño óptico fijo | `src/fonts/*-Gafete.woff2`, `src/app/layout.tsx`, `src/lib/diseno/tipos.ts` |
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
- De la plataforma falta: invitar a más personas a la empresa, liga por empleado para que suba sus datos, diseños por reglas (puesto, departamento, contrato), la factura de cada pedido, pedido abierto con aviso, paquetes con saldo y gafetes digitales.
- Entrega exprés: aparece como "Próximamente" en el cotizador y en las preguntas frecuentes.
- En Cloudflare, revisar que el bloqueo de bots de IA y el `robots.txt` administrado estén apagados para el dominio; si no, anulan lo que define el sitio.
- Dar de alta el sitio en Google Search Console y Bing Webmaster Tools y enviar el sitemap.
