/**
 * Datos estructurados schema.org (JSON-LD). Cada función devuelve un nodo listo
 * para <JsonLd />. Los nodos se enlazan entre sí por @id para que buscadores y
 * asistentes de IA entiendan que todo habla de la misma organización.
 */
import type { Faq } from "./faqs";
import { extraDosCaras, precioMaximo, precioMinimo, tramos } from "./precios";
import { site, urlAbsoluta } from "./site";

const ORG_ID = `${site.url}/#organizacion`;
const WEB_ID = `${site.url}/#sitio`;
const PRODUCTO_ID = `${site.url}/#producto`;

export function organizacion() {
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "OnlineStore"],
    "@id": ORG_ID,
    name: site.nombre,
    url: site.url,
    logo: urlAbsoluta("/marca/icon-512.png"),
    image: urlAbsoluta("/marca/og-image.png"),
    description: site.descripcion,
    slogan: "Hola, soy ___",
    email: site.correo,
    address: {
      "@type": "PostalAddress",
      addressLocality: site.ciudadBase,
      addressRegion: site.estadoBase,
      addressCountry: site.pais,
    },
    areaServed: { "@type": "Country", name: "México" },
    knowsAbout: [
      "gafetes para empleados",
      "credenciales para empleados",
      "credenciales de PVC",
      "identificación de personal",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "ventas",
      email: site.correo,
      availableLanguage: "es",
      areaServed: site.pais,
    },
  };
}

export function sitioWeb() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEB_ID,
    url: site.url,
    name: site.nombre,
    description: site.descripcionCorta,
    inLanguage: site.idioma,
    publisher: { "@id": ORG_ID },
  };
}

export function producto() {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": PRODUCTO_ID,
    name: "Gafetes y credenciales de PVC para empleados",
    description:
      "Gafete o credencial de PVC rígido tamaño CR80 (8.6 × 5.4 cm), impreso a color con nombre, puesto, número de empleado, fotografía y código QR. Personalizado por empleado a partir de un archivo de Excel.",
    category: "Gafetes y credenciales de identificación",
    image: urlAbsoluta("/marca/og-image.png"),
    brand: { "@type": "Brand", name: site.nombre },
    material: "PVC",
    size: "CR80 (8.6 × 5.4 cm)",
    url: urlAbsoluta("/precios"),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: site.moneda,
      lowPrice: precioMinimo,
      highPrice: precioMaximo + extraDosCaras,
      offerCount: tramos.length * 2,
      availability: "https://schema.org/InStock",
      seller: { "@id": ORG_ID },
      areaServed: { "@type": "Country", name: "México" },
    },
  };
}

export function paginaFaq(faqs: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.pregunta,
      acceptedAnswer: { "@type": "Answer", text: f.respuesta },
    })),
  };
}

export type Miga = { nombre: string; ruta: string };

export function migas(items: Miga[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ nombre: "Inicio", ruta: "/" }, ...items].map((m, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: m.nombre,
      item: urlAbsoluta(m.ruta),
    })),
  };
}

/** Servicio dirigido a un giro o a una ciudad (páginas /gafetes-para y /gafetes-en). */
export function servicio(opts: {
  nombre: string;
  descripcion: string;
  ruta: string;
  audiencia?: string;
  ciudad?: { nombre: string; estado: string };
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: opts.nombre,
    description: opts.descripcion,
    serviceType: "Impresión de gafetes y credenciales para empleados",
    url: urlAbsoluta(opts.ruta),
    provider: { "@id": ORG_ID },
    areaServed: opts.ciudad
      ? {
          "@type": "City",
          name: opts.ciudad.nombre,
          containedInPlace: { "@type": "AdministrativeArea", name: opts.ciudad.estado },
        }
      : { "@type": "Country", name: "México" },
    ...(opts.audiencia
      ? { audience: { "@type": "BusinessAudience", name: opts.audiencia } }
      : {}),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: site.moneda,
      lowPrice: precioMinimo,
      highPrice: precioMaximo + extraDosCaras,
    },
  };
}

export function comoHacerlo(pasos: { titulo: string; texto: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Cómo pedir gafetes y credenciales para empleados en GafeteLab",
    inLanguage: site.idioma,
    step: pasos.map((p, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: p.titulo,
      text: p.texto,
    })),
  };
}
