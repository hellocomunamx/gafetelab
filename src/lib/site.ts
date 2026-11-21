/**
 * Datos centrales del sitio. Todo lo que aparece en metadatos, schema.org,
 * llms.txt y textos sale de aquí: cambia un dato una vez y se actualiza en todos lados.
 */
export const site = {
  nombre: "GafeteLab",
  dominio: "gafetelab.com",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://gafetelab.com",
  lema: "Hola, soy ___",
  titulo: "Gafetes y credenciales para empleados en todo México",
  descripcion:
    "Gafetes y credenciales de PVC para tu equipo, sin vueltas: elige una plantilla, sube tu Excel, revisa cada gafete y conoce el precio con envío desde el primer paso. Enviamos a todo México.",
  descripcionCorta:
    "Tienda en línea de gafetes y credenciales para empleados, con envío a todo México.",
  correo: "hola@gafetelab.com",
  idioma: "es-MX",
  locale: "es_MX",
  pais: "MX",
  moneda: "MXN",
  ciudadBase: "Ciudad Obregón",
  estadoBase: "Sonora",
  /** Días hábiles prometidos de entrega. */
  entrega: { min: 5, max: 7 },
  /** Fecha de la última revisión de contenido (se muestra y va al sitemap). */
  actualizado: "2026-11-21",
  /** Pon NEXT_PUBLIC_NOINDEX=true para que ningún buscador indexe (por ejemplo, en pruebas). */
  indexable: process.env.NEXT_PUBLIC_NOINDEX !== "true",
} as const;

export const entregaTexto = `${site.entrega.min} a ${site.entrega.max} días hábiles`;

/** Convierte una ruta ("/precios") en URL absoluta canónica. */
export function urlAbsoluta(ruta = "/"): string {
  return new URL(ruta, site.url).toString();
}
