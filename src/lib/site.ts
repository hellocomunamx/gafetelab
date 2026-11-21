/**
 * Dominio PROVISIONAL: cámbialo aquí cuando esté definido el definitivo.
 * De este valor salen la URL canónica y el correo de contacto.
 */
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
    "Gafetes y credenciales para tu equipo, impresos en PVC o digitales, sin vueltas: sube tu Excel, revisa cada gafete y conoce el precio con envío desde el primer paso. Envíos a todo México.",
  descripcionCorta:
    "Tienda en línea de gafetes y credenciales para empleados, impresos y digitales, con envíos a todo México.",
  correo: `hola@${dominio}`,
  idioma: "es-MX",
  locale: "es_MX",
  pais: "MX",
  moneda: "MXN",
  estadoBase: "Sonora",
  /** Tiempo de entrega estándar, tal como se muestra en todo el sitio. */
  entrega: "2 semanas",
  /** Días que se respeta el precio de una cotización descargada o enviada. */
  vigenciaCotizacionDias: 15,
  /** Días después del pedido en los que todavía se puede pedir la factura. */
  plazoFacturaDias: 60,
  /** Fecha de la última revisión de contenido (se muestra y va al sitemap). */
  actualizado: "2026-11-21",
  /** Pon NEXT_PUBLIC_NOINDEX=true para que ningún buscador indexe (por ejemplo, en pruebas). */
  indexable: process.env.NEXT_PUBLIC_NOINDEX !== "true",
} as const;

export const entregaTexto = site.entrega;

/** Empresa detrás de LaGafetería: aparece en el "Powered by" y en el aviso de privacidad. */
export const figalo = {
  nombre: "Figalo",
  url: "https://figalo.mx",
} as const;

/** Responsable legal del tratamiento de datos (aviso de privacidad). */
export const legal = {
  responsable: "Gloria Inés Higuera Ley",
  figura: "persona física con actividad empresarial",
  domicilio: "Cajeme, Sonora, México",
  correo: "hola@figalo.mx",
  horario: "lunes a viernes de 09:00 a 15:00 horas (hora del centro de México)",
  avisoVersion: "1.0",
  avisoFecha: "2026-11-21",
} as const;

/** Convierte una ruta ("/precios") en URL absoluta canónica. */
export function urlAbsoluta(ruta = "/"): string {
  return new URL(ruta, site.url).toString();
}
