/** Dominio del sitio. De este valor salen la URL canónica y el correo de contacto. */
const dominio = "lagafeteria.com";

/**
 * Datos centrales del sitio. Todo lo que aparece en metadatos, schema.org,
 * llms.txt y textos sale de aquí: cambia un dato una vez y se actualiza en todos lados.
 */
export const site = {
  nombre: "LaGafetería",
  dominio,
  url: process.env.NEXT_PUBLIC_SITE_URL ?? `https://${dominio}`,
  lema: "Hola, soy ___",
  titulo: "Gafetes y credenciales para empleados y eventos en México",
  descripcion:
    "Gafetes y credenciales para todo tu equipo o asistentes a eventos, impresos en PVC o digitales. Automático y simplificado: diseña tu gafete, sube a tu equipo y revisa cada uno antes de pagar. Plataforma incluida, sin costo extra. Envíos a todo México.",
  descripcionCorta:
    "Tienda en línea para administrar e imprimir gafetes y credenciales de empleados o de asistentes a eventos, impresos y digitales, con envíos a todo México.",
  correo: `hola@${dominio}`,
  /** Remitente de los correos automáticos. Las respuestas llegan a `correo`. */
  correoAutomatico: `no-reply@${dominio}`,
  idioma: "es-MX",
  locale: "es_MX",
  pais: "MX",
  moneda: "MXN",
  estadoBase: "Sonora",
  /** Tiempo de entrega estándar, tal como se muestra en todo el sitio. */
  entrega: "14 días",
  /** Días que se respeta el precio de una cotización descargada o enviada. */
  vigenciaCotizacionDias: 15,
  /**
   * Hasta cuándo se puede pedir la factura: el mismo mes calendario en que se paga
   * el pedido. Al cerrar el mes, lo que no pidió factura va en la factura global.
   */
  plazoFactura: "dentro del mismo mes en que pagas tu pedido",
  /** Antigüedad máxima, en meses, de la Constancia de Situación Fiscal que se pide a cada empresa. */
  constanciaMeses: 3,
  /** Fecha de la última revisión de contenido (se muestra y va al sitemap). */
  actualizado: "2026-11-25",
  /** Pon NEXT_PUBLIC_NOINDEX=true para que ningún buscador indexe (por ejemplo, en pruebas). */
  indexable: process.env.NEXT_PUBLIC_NOINDEX !== "true",
} as const;

export const entregaTexto = site.entrega;

/** La constancia y el desplegable «¿Por qué necesitan verificar mi empresa?». Se dice igual en todo el sitio. */
export const constancia = {
  nombre: "Constancia de Situación Fiscal",
  /** Desplegable «¿Por qué necesitan mi constancia?». */
  pregunta: "¿Por qué necesitan verificar mi empresa?",
  respuesta: "Por el bien y la seguridad de tu empresa.",
  razones: [
    {
      titulo: "Para que nadie se haga pasar por tu empresa.",
      texto:
        "Un gafete abre puertas. Al verificar tu empresa comprobamos que quien pide los gafetes y credenciales de tu empresa es de verdad tu empresa, y que nadie más puede mandarlos a hacer con tu nombre o tu logo.",
    },
    {
      titulo: "Para que tus gafetes valgan.",
      texto: "Quien ve un gafete hecho aquí sabe que detrás hay una empresa real y verificada.",
    },
    {
      titulo: "Para facturarte sin vueltas.",
      texto: "Si eliges la constancia, de ahí salen tu RFC, tu razón social, tu régimen y tu código postal, tal como los tiene el SAT.",
    },
    {
      titulo: "Y no te compromete.",
      texto:
        "Lo que subes no trae contraseñas ni datos bancarios. Solo lo ve nuestro equipo de revisión, no se comparte con nadie y se pide una sola vez.",
    },
  ],
} as const;

/**
 * Verificación de la empresa: comprueba que los gafetes son de quien los pide.
 * La empresa elige cómo; todas se revisan a mano antes del primer pedido.
 */
export const verificacion = {
  nombre: "Verificación de tu empresa",
  corto:
    "Antes de tu primer pedido verificamos que los gafetes sean de tu propia empresa. Tú eliges cómo: con tu Constancia de Situación Fiscal, con tu INE y una prueba de tu negocio, o con un correo de tu empresa.",
  motivo:
    "Así nadie puede mandar a hacer gafetes y credenciales con el nombre o el logo de tu empresa. Si no tienes RFC no hay problema: con tu INE y la liga a las redes o al Google Maps de tu negocio, o una foto del local, también se puede.",
  /** Desplegable «¿Por qué necesitan verificar mi empresa?». */
  pregunta: "¿Por qué necesitan verificar mi empresa?",
  metodos: {
    constancia: {
      titulo: "Constancia de Situación Fiscal",
      texto: "Si tu empresa o tú tienen RFC. Es la más rápida de revisar y de ahí salen tus datos para facturar.",
      etiqueta: "Recomendada",
    },
    ine: {
      titulo: "INE y una prueba de tu negocio",
      texto:
        "Si no tienes RFC. Tu INE, más la liga a tu Facebook, Instagram o Google Maps, o una foto de tu local, menú o uniforme donde se vea el nombre de tu negocio.",
      etiqueta: "Sin RFC",
    },
    correo: {
      titulo: "Correo de tu empresa",
      texto: "Si tienes un correo con el dominio de tu negocio (por ejemplo, tu@tunegocio.com). Te mandamos un código para confirmarlo.",
      etiqueta: "",
    },
  },
} as const;

/** Carta de responsabilidad que se acepta al verificar la empresa. Cambia la versión si cambia el texto. */
export const carta = {
  version: "2026-11-23",
  titulo: "Carta de responsabilidad",
  casilla: "Acepto la carta de responsabilidad.",
  puntos: [
    "Declaro que represento al negocio o empresa que aparece en los gafetes y credenciales que voy a pedir, y que tengo derecho a usar su nombre, su logo y los datos de las personas que aparecen en ellos.",
    "Los gafetes y credenciales son solo para identificar internamente a personas de mi propia organización. No los usaré para hacerme pasar por otra empresa, por una autoridad o por una dependencia de gobierno.",
    "La información y los documentos que subo para verificar mi empresa son verdaderos.",
    "Si algo de esto no es cierto, respondo yo, y no LaGafetería, por los daños que cause a terceros, y LaGafetería puede cancelar mi pedido sin producirlo.",
  ],
} as const;

/** Empresa detrás de LaGafetería: aparece en el "Powered by" y en el aviso de privacidad. */
export const figalo = {
  nombre: "Figalo",
  url: "https://figalo.mx",
} as const;

/**
 * Negocios afiliados: de ellos puede llegar publicidad a quien la haya aceptado.
 * Con `url` y `texto`, el afiliado aparece con una mención discreta en la landing.
 */
export const afiliados: { nombre: string; url?: string; texto?: string; logo?: string }[] = [
  {
    nombre: "Talentu",
    url: "https://talentu.work/?utm_source=lagafeteria&utm_medium=referido",
    texto:
      "Software de recursos humanos para PyMEs en México: checador desde el celular, expedientes, vacaciones y recibos de nómina para el mismo equipo que ya trae su gafete.",
    logo: "/marca/talentu-isotipo.svg",
  },
];

/** Responsable legal del tratamiento de datos (aviso de privacidad). */
export const legal = {
  responsable: "Gloria Inés Higuera Ley",
  figura: "persona física con actividad empresarial",
  domicilio: "Cajeme, Sonora, México",
  correo: "hola@figalo.mx",
  horario: "lunes a viernes de 09:00 a 15:00 horas (hora del centro de México)",
  avisoVersion: "1.7",
  avisoFecha: "2026-11-24",
  terminosVersion: "1.3",
  terminosFecha: "2026-11-24",
  /** Días naturales, desde la entrega, para reportar un gafete con defecto. */
  plazoDefectosDias: 10,
} as const;

/** Convierte una ruta ("/precios") en URL absoluta canónica. */
export function urlAbsoluta(ruta = "/"): string {
  return new URL(ruta, site.url).toString();
}
