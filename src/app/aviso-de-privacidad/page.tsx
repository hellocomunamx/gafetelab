import { JsonLd } from "@/components/JsonLd";
import { Apartado, fechaLegal } from "@/components/Legal";
import { Contenedor, Portada } from "@/components/ui";
import { migas } from "@/lib/schema";
import { metadatos } from "@/lib/seo";
import { figalo, legal, site } from "@/lib/site";

const ruta = "/aviso-de-privacidad";
const rutaMigas = [{ nombre: "Aviso de privacidad", ruta }];

export const metadata = metadatos({
  titulo: "Aviso de privacidad",
  descripcion: `Aviso de privacidad de ${site.nombre}: quién es responsable de tus datos, qué datos tratamos de clientes y de las personas que aparecen en los gafetes, para qué los usamos y cómo ejercer tus derechos ARCO.`,
  ruta,
});

const fecha = fechaLegal(legal.avisoFecha);

const Correo = () => (
  <a href={`mailto:${legal.correo}`} className="text-tinta underline">
    {legal.correo}
  </a>
);

export default function AvisoDePrivacidad() {
  return (
    <>
      <Portada migas={rutaMigas} titulo="Aviso de privacidad">
        <p>
          Última actualización: <time dateTime={legal.avisoFecha}>{fecha}</time> · Versión{" "}
          {legal.avisoVersion}
        </p>
      </Portada>

      <Contenedor className="pb-16">
        <article className="max-w-3xl">
          <Apartado numero={1} titulo="Responsable del tratamiento de tus datos">
            <p>
              <strong>{legal.responsable}</strong>, {legal.figura} que opera bajo los nombres
              comerciales <strong>{figalo.nombre}</strong> y <strong>{site.nombre}</strong> (en
              adelante “{site.nombre}” o “nosotros”), con domicilio en {legal.domicilio}, es la
              responsable del tratamiento de los datos personales que nos proporcionas a través del
              sitio {site.dominio}, conforme a la Ley Federal de Protección de Datos Personales en
              Posesión de los Particulares y demás normativa aplicable.
            </p>
          </Apartado>

          <Apartado numero={2} titulo="Datos personales que recabamos">
            <p>Recabamos únicamente los datos necesarios para cotizar, producir y entregar tu pedido:</p>
            <ul>
              <li>
                <strong>De quien cotiza:</strong> correo electrónico y, si lo indicas, el nombre de
                tu empresa, cuando pides que te enviemos tu cotización. Usar el cotizador o
                descargar el PDF no requiere ningún dato.
              </li>
              <li>
                <strong>De quien nos escribe desde el formulario de contacto:</strong> nombre,
                correo electrónico, el mensaje y, si los indicas, el nombre de tu empresa y tu
                teléfono.
              </li>
              <li>
                <strong>De quien compra o crea una cuenta:</strong> nombre, correo electrónico,
                teléfono, empresa, domicilio de entrega y datos de facturación (RFC, nombre o razón
                social, régimen fiscal, código postal y uso del comprobante).
              </li>
              <li>
                <strong>De las personas que aparecen en los gafetes y credenciales:</strong> los
                datos que tu empresa decida incluir, como nombre, puesto, número de empleado, área,
                vigencia y fotografía.
              </li>
              <li>
                <strong>Datos técnicos:</strong> al navegar el sitio, nuestros proveedores de
                infraestructura procesan tu dirección IP y datos de navegación con el único fin de
                servir las páginas y proteger el sitio contra abusos.
              </li>
            </ul>
            <p>
              <strong>No recabamos datos personales sensibles.</strong> Las fotografías se usan solo
              para mostrarse en el gafete: no hacemos reconocimiento facial ni ningún tratamiento
              biométrico. Los pagos los procesa un proveedor de pagos; nosotros no almacenamos los
              datos de tu tarjeta.
            </p>
          </Apartado>

          <Apartado numero={3} titulo="Datos de tus empleados: quién es responsable">
            <p>
              Cuando una empresa nos entrega datos y fotografías de su personal para elaborar gafetes
              y credenciales, <strong>esa empresa es la responsable</strong> de dichos datos y{" "}
              {site.nombre} actúa como <strong>encargada</strong>: los tratamos únicamente por cuenta
              de la empresa y conforme a sus instrucciones, para producir, entregar y administrar sus
              gafetes.
            </p>
            <p>
              La empresa que hace el pedido declara que cuenta con el consentimiento o la base legal
              necesaria para compartirnos esos datos y que informó a su personal mediante su propio
              aviso de privacidad. Si eres una persona cuyos datos aparecen en un gafete, puedes
              ejercer tus derechos ante tu empresa o escribirnos, y canalizaremos tu solicitud.
            </p>
          </Apartado>

          <Apartado numero={4} titulo="Para qué usamos los datos (finalidades primarias)">
            <ul>
              <li>Elaborar y enviarte la cotización que solicites y darle seguimiento.</li>
              <li>Responder los mensajes que nos envíes desde el formulario de contacto.</li>
              <li>Diseñar, producir, imprimir y entregar tus gafetes y credenciales.</li>
              <li>
                Generar los gafetes digitales y mostrar, a quien escanee su código QR, la información
                que tu empresa haya decidido incluir y si el gafete está vigente.
              </li>
              <li>
                Crear y administrar tu cuenta y tu plataforma: altas, bajas, reposiciones,
                desactivaciones y reactivaciones.
              </li>
              <li>Cobrar tu pedido, emitir tu factura y cumplir obligaciones fiscales.</li>
              <li>Atender dudas, aclaraciones y solicitudes de soporte.</li>
            </ul>
          </Apartado>

          <Apartado numero={5} titulo="Finalidades secundarias">
            <p>
              No usamos tus datos para finalidades secundarias: no te suscribimos a boletines, no
              hacemos publicidad con tus datos ni con los de tu personal, y no los usamos con fines
              distintos a los descritos. Si esto llegara a cambiar, actualizaríamos este aviso y te
              daríamos la opción de negarte escribiendo a <Correo />.
            </p>
          </Apartado>

          <Apartado numero={6} titulo="Con quién compartimos los datos">
            <p>
              No vendemos ni rentamos datos personales. Para operar usamos proveedores que actúan
              como encargados y tratan los datos por cuenta nuestra:
            </p>
            <ul>
              <li>
                <strong>Cloudflare</strong> (Estados Unidos): alojamiento y protección del sitio.
              </li>
              <li>
                <strong>Supabase</strong> (Estados Unidos): base de datos y almacenamiento de
                archivos de la plataforma.
              </li>
              <li>
                <strong>Resend</strong> (Estados Unidos): envío de cotizaciones, de los mensajes del
                formulario de contacto y de correos de servicio.
              </li>
              <li>
                <strong>Talleres de impresión:</strong> reciben los diseños y los datos que van en
                cada gafete, solo para imprimirlos.
              </li>
              <li>
                <strong>Empresas de paquetería:</strong> reciben el nombre, el domicilio y el
                teléfono de entrega para llevar tu pedido.
              </li>
              <li>
                <strong>Proveedores de pagos y de facturación electrónica:</strong> procesan tu pago
                y timbran tu factura.
              </li>
            </ul>
            <p>
              Estas remisiones a encargados no requieren tu consentimiento conforme a la ley. Fuera
              de estos casos, solo compartiríamos datos si una autoridad competente lo requiere
              legalmente.
            </p>
          </Apartado>

          <Apartado numero={7} titulo="Cookies">
            <p>
              Este sitio no usa cookies de publicidad ni herramientas de rastreo publicitario. Al
              iniciar sesión en tu cuenta se usan cookies estrictamente necesarias para mantener tu
              sesión.
            </p>
          </Apartado>

          <Apartado numero={8} titulo="Cuánto tiempo conservamos los datos">
            <p>
              Conservamos los datos de tu cuenta y de tu equipo mientras tu cuenta esté activa, para
              que puedas pedir reposiciones y administrar tus gafetes sin capturar todo de nuevo.
              Puedes eliminar a una persona o pedir la eliminación de tu cuenta y sus datos en
              cualquier momento. La información con relevancia fiscal se conserva 5 años conforme al
              Código Fiscal de la Federación.
            </p>
          </Apartado>

          <Apartado numero={9} titulo="Tus derechos ARCO y cómo ejercerlos">
            <p>
              Tienes derecho a Acceder, Rectificar y Cancelar tus datos personales, a Oponerte a su
              tratamiento, a limitar su uso o divulgación y a revocar el consentimiento que nos hayas
              otorgado. Para ejercerlos, envía tu solicitud a:
            </p>
            <ul>
              <li>
                <strong>Correo:</strong> <Correo />
              </li>
              <li>
                <strong>Domicilio:</strong> {legal.domicilio}
              </li>
              <li>
                <strong>Horario de atención:</strong> {legal.horario}
              </li>
            </ul>
            <p>
              Tu solicitud debe incluir tu nombre, un medio para responderte, una descripción clara
              de los datos y del derecho que quieres ejercer, y una copia de tu identificación
              oficial para acreditar tu identidad (o de la carta poder e identificación de tu
              representante, en su caso).
            </p>
            <p>
              Te responderemos en un plazo máximo de <strong>20 días hábiles</strong> contados desde
              que recibamos tu solicitud y, si resulta procedente, la haremos efectiva dentro de los{" "}
              <strong>15 días hábiles</strong> siguientes a la respuesta.
            </p>
          </Apartado>

          <Apartado numero={10} titulo="Autoridad de protección de datos">
            <p>
              Si consideras que tu derecho a la protección de datos fue vulnerado, puedes acudir a la
              Secretaría Anticorrupción y Buen Gobierno, autoridad competente en materia de
              protección de datos personales en México.
            </p>
          </Apartado>

          <Apartado numero={11} titulo="Menores de edad">
            <p>
              Nuestros servicios están dirigidos a empresas, instituciones y personas mayores de 18
              años. Cuando una escuela solicita credenciales para alumnos menores de edad, la escuela
              es responsable de contar con el consentimiento de madres, padres o tutores para
              compartirnos esos datos.
            </p>
          </Apartado>

          <Apartado numero={12} titulo="Cambios a este aviso">
            <p>
              Cualquier cambio a este aviso se publicará en esta misma página, actualizando la fecha
              y la versión que aparecen al inicio. Te recomendamos revisarlo periódicamente.
            </p>
          </Apartado>

          <Apartado numero={13} titulo="Jurisdicción">
            <p>
              Este aviso se rige por la legislación federal vigente en los Estados Unidos Mexicanos.
              Cualquier controversia se someterá a los tribunales competentes en el estado de Sonora.
            </p>
          </Apartado>
        </article>
      </Contenedor>

      <JsonLd data={migas(rutaMigas)} />
    </>
  );
}
