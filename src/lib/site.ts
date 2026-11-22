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
  titulo: "Gafetes y credenciales para empleados en todo México",
  descripcion:
    "Gafetes y credenciales para tu equipo, impresos en PVC o digitales, sin vueltas: diseña tu gafete, sube a tu equipo y revisa cada uno antes de pagar. Plataforma incluida, sin costo extra. Envíos a todo México.",
  descripcionCorta:
    "Tienda en línea para administrar e imprimir gafetes y credenciales de empleados o de asistentes a eventos, impresos y digitales, con envíos a todo México.",
  correo: `hola@${dominio}`,
  idioma: "es-MX",
  locale: "es_MX",
  pais: "MX",
  moneda: "MXN",
  estadoBase: "Sonora",
  /** Tiempo de entrega estándar, tal como se muestra en todo el sitio. */
  entrega: "14 días",
  /** Días que se respeta el precio de una cotización descargada o enviada. */
  vigenciaCotizacionDias: 15,
  /** Días después del pedido en los que todavía se puede pedir la factura. */
  plazoFacturaDias: 60,
  /** Antigüedad máxima, en meses, de la Constancia de Situación Fiscal que se pide a cada empresa. */
  constanciaMeses: 3,
  /** Fecha de la última revisión de contenido (se muestra y va al sitemap). */
  actualizado: "2026-11-22",
  /** Pon NEXT_PUBLIC_NOINDEX=true para que ningún buscador indexe (por ejemplo, en pruebas). */
  indexable: process.env.NEXT_PUBLIC_NOINDEX !== "true",
} as const;

export const entregaTexto = site.entrega;

/** Por qué se pide la Constancia de Situación Fiscal. Se dice igual en todo el sitio. */
export const constancia = {
  nombre: "Constancia de Situación Fiscal",
  corto: `Para abrir la cuenta de tu empresa te pedimos su Constancia de Situación Fiscal, con no más de ${site.constanciaMeses} meses de antigüedad.`,
  motivo:
    "Así comprobamos que los gafetes y credenciales son de tu propia empresa: el RFC y la razón social de la constancia deben coincidir con la empresa que aparece en los gafetes, y son los mismos datos con los que te facturamos.",
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
  avisoVersion: "1.4",
  avisoFecha: "2026-11-22",
  terminosVersion: "1.1",
  terminosFecha: "2026-11-22",
  /** Días naturales, desde la entrega, para reportar un gafete con defecto. */
  plazoDefectosDias: 10,
} as const;

/** Convierte una ruta ("/precios") en URL absoluta canónica. */
export function urlAbsoluta(ruta = "/"): string {
  return new URL(ruta, site.url).toString();
}
