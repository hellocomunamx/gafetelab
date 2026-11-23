import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { Apartado, fechaLegal } from "@/components/Legal";
import { Contenedor, Portada } from "@/components/ui";
import { envio, notaIva, paqueteVigenciaMeses, pesos } from "@/lib/precios";
import { pago } from "@/lib/pedidos/reglas";
import { migas } from "@/lib/schema";
import { metadatos } from "@/lib/seo";
import { figalo, legal, site } from "@/lib/site";

const ruta = "/terminos";
const rutaMigas = [{ nombre: "Términos y condiciones", ruta }];

export const metadata = metadatos({
  titulo: "Términos y condiciones",
  descripcion: `Términos y condiciones de ${site.nombre}: cómo funcionan la cuenta y la plataforma, los pedidos, los precios, el pago, la factura, los envíos, las cancelaciones, las reposiciones y el manejo de los datos de tu personal.`,
  ruta,
});

const Correo = () => (
  <a href={`mailto:${legal.correo}`} className="text-tinta underline">
    {legal.correo}
  </a>
);

const liga = "text-tinta underline";

export default function Terminos() {
  return (
    <>
      <Portada migas={rutaMigas} titulo="Términos y condiciones">
        <p>
          Última actualización: <time dateTime={legal.terminosFecha}>{fechaLegal(legal.terminosFecha)}</time> ·
          Versión {legal.terminosVersion}
        </p>
      </Portada>

      <Contenedor className="pb-16">
        <article className="max-w-3xl">
          <Apartado numero={1} titulo="Quiénes somos y a qué aplican estos términos">
            <p>
              {site.nombre} es una tienda en línea de gafetes y credenciales para empleados, operada
              por <strong>{legal.responsable}</strong>, {legal.figura}, bajo los nombres comerciales{" "}
              <strong>{figalo.nombre}</strong> y <strong>{site.nombre}</strong>, con domicilio en{" "}
              {legal.domicilio} (en adelante “{site.nombre}” o “nosotros”).
            </p>
            <p>
              Estos términos regulan el uso del sitio {site.dominio}, del cotizador, de tu cuenta y tu
              plataforma, y la compra de gafetes y credenciales impresos y digitales.
            </p>
          </Apartado>

          <Apartado numero={2} titulo="Aceptación">
            <p>
              Al crear una cuenta, hacer un pedido o usar la plataforma aceptas estos términos y
              nuestro{" "}
              <Link href="/aviso-de-privacidad" className={liga}>aviso de privacidad</Link>. Si actúas
              a nombre de una empresa o institución, declaras que tienes facultades para obligarla. Si
              no estás de acuerdo con estos términos, no uses la plataforma ni hagas pedidos.
            </p>
            <p>
              Guardamos la versión de los términos y del aviso que aceptaste y la fecha en que lo
              hiciste. Recibir novedades y promociones es opcional: tiene su propia casilla, aparte
              de esta aceptación, y puedes cambiarla cuando quieras.
            </p>
          </Apartado>

          <Apartado numero={3} titulo="Tu cuenta y tu plataforma">
            <ul>
              <li>Para crear una cuenta debes ser mayor de 18 años y darnos datos verdaderos.</li>
              <li>
                Antes del primer pedido verificamos tu empresa con la opción que elijas: su Constancia
                de Situación Fiscal, con no más de {site.constanciaMeses} meses de antigüedad; tu INE y
                una prueba de tu negocio (la liga a sus redes o a Google Maps, o una foto del local); o
                un correo con el dominio de tu empresa. El nombre de la empresa verificada debe
                coincidir con el que aparece en los gafetes. Si verificas con la constancia, su RFC y su
                razón social son los datos con los que te facturamos.
              </li>
              <li>
                Al verificar tu empresa aceptas una carta de responsabilidad: declaras que representas
                al negocio de los gafetes, que tienes derecho a usar su nombre, su logo y los datos de
                las personas que aparecen en ellos, que los usarás solo para identificar a personas de
                tu propia organización y que lo que nos mandas es verdadero. Si no lo es, respondes tú
                por los daños a terceros y podemos cancelar el pedido sin producirlo. Podemos revisar un pedido antes de producirlo y pedirte que aclares o
                compruebes que los gafetes son de tu propia organización.
              </li>
              <li>
                Tú decides quién más entra a la plataforma de tu empresa y con qué permisos. Eres
                responsable de lo que hagan las personas a las que invites y de cuidar el acceso a tu
                correo y, si la usas, tu contraseña.
              </li>
              <li>
                Usar la plataforma no tiene costo: no hay mensualidad, anualidad ni cobro por usuario
                o por persona guardada. Solo pagas los gafetes que pides.
              </li>
              <li>
                Podemos mejorar, cambiar o retirar funciones de la plataforma. Las funciones que el
                sitio anuncia como “Muy pronto” o “Próximamente” todavía no están disponibles y no
                forman parte de lo que contratas.
              </li>
              <li>
                Podemos suspender o cerrar una cuenta que se use en contra de estos términos o de la
                ley. Tú puedes pedir el cierre de tu cuenta y la eliminación de sus datos en cualquier
                momento.
              </li>
            </ul>
          </Apartado>

          <Apartado numero={4} titulo="Cotizaciones y precios">
            <ul>
              <li>
                Los precios están en pesos mexicanos y se muestran {notaIva}. El cotizador en línea
                calcula el precio por pieza, el envío, el IVA y el total antes de que pagues.
              </li>
              <li>
                Una cotización descargada o enviada por correo respeta su precio durante{" "}
                {site.vigenciaCotizacionDias} días naturales. Fuera de ese plazo aplican los precios
                publicados en el sitio el día de tu pedido.
              </li>
              <li>
                Podemos cambiar los precios publicados en cualquier momento. Los cambios no afectan
                los pedidos ya pagados.
              </li>
              <li>
                Si un precio aparece con un error evidente, te avisaremos antes de producir tu pedido
                para que decidas si lo confirmas con el precio correcto o lo cancelas con reembolso
                completo.
              </li>
            </ul>
          </Apartado>

          <Apartado numero={5} titulo="Tu pedido y la revisión antes de imprimir">
            <ul>
              <li>Tu pedido queda confirmado cuando recibimos tu pago.</li>
              <li>
                Antes de pagar ves cómo queda cada gafete con los datos que capturaste o subiste.{" "}
                <strong>Imprimimos lo que tú apruebas</strong>: revisa nombres, puestos, números,
                fotografías y diseño.
              </li>
              <li>
                Si un gafete sale con un error que venía en los datos o en los archivos que nos
                diste, lo volvemos a imprimir como un pedido nuevo, con su costo.
              </li>
              <li>
                Los colores pueden variar ligeramente entre la pantalla y la tarjeta impresa. Esa
                variación es normal y no se considera defecto.
              </li>
            </ul>
          </Apartado>

          <Apartado numero={6} titulo="Pago y factura">
            <ul>
              <li>
                El pago se hace en línea por medio de un proveedor de pagos. Nosotros no almacenamos
                los datos de tu tarjeta.
              </li>
              <li>
                Puedes pagar con tarjeta de crédito o débito, en efectivo en OXXO o por transferencia
                (SPEI). Los pedidos de {pago.soloTransferenciaDesdePiezas} gafetes o más, o de{" "}
                {pesos(pago.soloTransferenciaDesdeTotal)} o más, se pagan solo por transferencia. Con
                OXXO y con transferencia, tu pedido queda confirmado cuando el pago se acredita.
              </li>
              <li>
                Si pagas con tarjeta, durante los primeros {pago.minutosDeGracia} minutos el cargo
                solo queda autorizado. Pasado ese tiempo, si no cancelaste, se hace el cargo y tu
                pedido queda confirmado.
              </li>
              <li>
                Emitimos factura electrónica (CFDI) con los datos fiscales que captures. Puedes
                pedirla al hacer tu pedido o después, {site.plazoFactura} (hora de Sonora). Al
                cerrar ese mes, las ventas sin factura van en nuestra factura global y ya no se
                pueden facturar por separado. Revisa bien tus datos: una factura ya emitida no se
                puede modificar.
              </li>
            </ul>
          </Apartado>

          <Apartado numero={7} titulo="Producción y entrega">
            <ul>
              <li>
                El tiempo de entrega estándar es de {site.entrega} a partir de que tu pedido queda
                pagado y completo. Es un estimado: puede variar por la paquetería, por días inhábiles
                o por causas fuera de nuestro control.
              </li>
              <li>
                Enviamos a todo México. El envío cuesta {pesos(envio.tarifa)} {notaIva} y es gratis en
                pedidos desde {pesos(envio.gratisDesde)} antes de IVA. Los gafetes digitales no llevan
                envío.
              </li>
              <li>
                Revisa que tu domicilio de entrega esté completo y correcto. Si un paquete regresa
                por un domicilio equivocado o porque no hubo quien lo recibiera, el nuevo envío corre
                por tu cuenta.
              </li>
              <li>
                Si tu paquete llega dañado o no llega, avísanos y lo resolvemos con la paquetería: te
                lo reponemos o te devolvemos tu dinero.
              </li>
            </ul>
          </Apartado>

          <Apartado numero={8} titulo="Cancelaciones, cambios y devoluciones">
            <ul>
              <li>
                Puedes cancelar tu pedido o cambiar sus datos sin costo mientras no haya entrado a
                producción. Si ya lo pagaste, te devolvemos el importe completo por el mismo medio de
                pago.
              </li>
              <li>
                Si pagaste con tarjeta, tienes {pago.minutosDeGracia} minutos después de pagar para
                cancelar tú mismo el pedido desde tu plataforma: el cargo se libera y no se te cobra
                nada. Con OXXO o con transferencia puedes cancelarlo de la misma forma mientras no
                hayas hecho el pago.
              </li>
              <li>
                Los gafetes y credenciales se fabrican con el diseño de tu empresa y los datos de tu
                personal. Por eso, una vez que el pedido entra a producción ya no se puede cancelar
                ni devolver, salvo que tenga un defecto o un error nuestro (ver el apartado
                siguiente).
              </li>
              <li>
                Nada de lo anterior limita los derechos que te reconozca la Ley Federal de
                Protección al Consumidor cuando te sea aplicable.
              </li>
            </ul>
          </Apartado>

          <Apartado numero={9} titulo="Garantía: gafetes con defecto o error nuestro">
            <p>
              Si un gafete llega con un defecto de impresión o de material, o no corresponde a lo que
              aprobaste, escríbenos dentro de los <strong>{legal.plazoDefectosDias} días naturales</strong>{" "}
              siguientes a la entrega, con una fotografía de la pieza. Te lo reponemos sin costo, con
              envío incluido. Si no pudiéramos reponerlo, te devolvemos lo que pagaste por esa pieza.
            </p>
            <p>
              La garantía no cubre el desgaste por el uso, los daños por maltrato ni los errores que
              venían en los datos o archivos que nos entregaste.
            </p>
          </Apartado>

          <Apartado numero={10} titulo="Paquetes prepagados">
            <p>
              Cuando estén disponibles, los paquetes prepagados funcionarán así: compras por
              adelantado cierta cantidad de gafetes impresos, con un número de envíos incluidos, y los
              vas pidiendo conforme los necesitas. Se compran gafetes, no saldo en pesos. Cada paquete
              tiene una vigencia de {paqueteVigenciaMeses} meses desde su compra; los gafetes y envíos
              que no uses en ese plazo se pierden. Los paquetes no son reembolsables, ni completos ni por la
              parte que no se haya usado, pero sí puedes transferirlos sin costo a la cuenta de otra empresa.
            </p>
          </Apartado>

          <Apartado numero={11} titulo="Gafetes digitales y verificación con código QR">
            <ul>
              <li>
                El gafete digital se paga una sola vez por pieza. No es un cobro recurrente y no
                genera cargos posteriores. Sigue activo mientras la cuenta de tu empresa esté
                activa y no lo desactives ni des de baja a la persona.
              </li>
              <li>
                Al escanear el código QR de un gafete se muestra la información que tu empresa
                decidió hacer visible y si el gafete está vigente. Tú eliges esos datos y eres
                responsable de mantener al día las altas, las bajas y las desactivaciones.
              </li>
              <li>
                Procuramos que la verificación y la plataforma estén disponibles en todo momento,
                pero puede haber interrupciones por mantenimiento o por fallas de terceros. La
                página de verificación es un apoyo y no sustituye los controles de acceso o de
                seguridad de tu empresa.
              </li>
            </ul>
          </Apartado>

          <Apartado numero={12} titulo="Datos de tu personal">
            <p>
              Tu empresa es la responsable de los datos y las fotografías de su personal que sube a la
              plataforma; {site.nombre} los trata como encargada, solo para producir, entregar y
              administrar tus gafetes. Al subirlos declaras que cuentas con el consentimiento o la
              base legal para compartirlos y que informaste a tu personal. El detalle está en nuestro{" "}
              <Link href="/aviso-de-privacidad" className={liga}>aviso de privacidad</Link>.
            </p>
          </Apartado>

          <Apartado numero={13} titulo="Lo que no imprimimos y usos no permitidos">
            <p>No aceptamos pedidos ni permitimos usar la plataforma para:</p>
            <ul>
              <li>
                Identificaciones oficiales o credenciales de dependencias de gobierno, corporaciones
                policiacas, fuerzas armadas o cualquier autoridad, ni imitaciones de ellas.
              </li>
              <li>
                Gafetes o credenciales de una empresa, institución o marca distinta a la tuya, sin
                su autorización.
              </li>
              <li>Gafetes que busquen engañar sobre la identidad, el cargo o la relación de una persona.</li>
              <li>Contenido ilegal, ofensivo o que infrinja derechos de terceros.</li>
              <li>Intentar acceder a cuentas ajenas, alterar el servicio o extraer datos de la plataforma.</li>
            </ul>
            <p>
              Podemos pedirte que acredites que representas a la empresa del pedido. Si un pedido cae
              en alguno de estos casos, podemos rechazarlo o cancelarlo y devolverte lo que no se haya
              producido.
            </p>
          </Apartado>

          <Apartado numero={14} titulo="Propiedad intelectual">
            <ul>
              <li>
                Tus logotipos, diseños, fotografías y datos siguen siendo tuyos. Nos autorizas a
                usarlos únicamente para elaborar, mostrar y entregar tus gafetes. Declaras que tienes
                derecho a usarlos y respondes por ello frente a terceros.
              </li>
              <li>
                La marca {site.nombre}, el sitio, la plataforma y sus plantillas son nuestros. Puedes
                usar las plantillas para tus gafetes hechos con nosotros; no puedes copiarlas,
                revenderlas ni usarlas para ofrecer un servicio similar.
              </li>
            </ul>
          </Apartado>

          <Apartado numero={15} titulo="Límite de responsabilidad">
            <p>
              Respondemos por la calidad de los gafetes que producimos conforme a estos términos. En
              la medida que la ley lo permita, nuestra responsabilidad total por un pedido se limita
              al importe que pagaste por él, y no respondemos por daños indirectos, como ganancias no
              obtenidas o retrasos en la operación de tu empresa.
            </p>
          </Apartado>

          <Apartado numero={16} titulo="Cambios a estos términos">
            <p>
              Podemos actualizar estos términos. Publicaremos la nueva versión en esta página, con su
              fecha, y si el cambio es importante te lo avisaremos por correo o al entrar a tu cuenta.
              A cada pedido le aplican los términos vigentes el día en que se hizo.
            </p>
          </Apartado>

          <Apartado numero={17} titulo="Ley aplicable y jurisdicción">
            <p>
              Estos términos se rigen por las leyes federales de los Estados Unidos Mexicanos. Si
              tienes una queja, escríbenos primero: queremos resolverla contigo. Cuando te sea
              aplicable, puedes acudir a la Procuraduría Federal del Consumidor (Profeco). Para
              cualquier controversia, las partes se someten a los tribunales competentes de Cajeme,
              Sonora.
            </p>
          </Apartado>

          <Apartado numero={18} titulo="Contacto">
            <p>
              Para dudas, aclaraciones o reportes sobre un pedido, escríbenos desde el{" "}
              <Link href="/contacto" className={liga}>formulario de contacto</Link> o a <Correo />.
              Atendemos de {legal.horario}.
            </p>
          </Apartado>
        </article>
      </Contenedor>

      <JsonLd data={migas(rutaMigas)} />
    </>
  );
}
