/**
 * Datos estructurados schema.org (JSON-LD). Cada función devuelve un nodo listo
 * para <JsonLd />. Los nodos se enlazan entre sí por @id para que buscadores y
 * asistentes de IA entiendan que todo habla de la misma organización.
 */
import type { Faq } from "./faqs";
import {
  envio,
  extraDosCarasMaximo,
  precioDigital,
  precioMaximo,
  precioMinimo,
  tramos,
} from "./precios";
import { funcionesEvento } from "./eventos-publico";
import { funcionesPlataforma } from "./plataforma";
import { figalo, site, urlAbsoluta } from "./site";

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
      addressRegion: site.estadoBase,
      addressCountry: site.pais,
    },
    areaServed: { "@type": "Country", name: "México" },
    parentOrganization: { "@type": "Organization", name: figalo.nombre, url: figalo.url },
    knowsAbout: [
      "gafetes para empleados",
      "credenciales para empleados",
      "credenciales de PVC",
      "gafetes digitales con código QR",
      "identificación de personal",
      "gafetes para eventos y congresos",
      "gafetes para expos, conferencias y graduaciones",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "ventas",
      email: site.correo,
      url: urlAbsoluta("/contacto"),
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
      highPrice: precioMaximo + extraDosCarasMaximo,
      offerCount: tramos.length * 2,
      availability: "https://schema.org/InStock",
      seller: { "@id": ORG_ID },
      areaServed: { "@type": "Country", name: "México" },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: { "@type": "MonetaryAmount", value: envio.tarifa, currency: site.moneda },
        shippingDestination: { "@type": "DefinedRegion", addressCountry: site.pais },
      },
    },
  };
}

export function productoDigital() {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${site.url}/#producto-digital`,
    name: "Gafetes y credenciales digitales para empleados",
    description:
      "Gafete o credencial digital para el celular de cada empleado, con el mismo código QR de verificación que el impreso: al escanearlo se ve si el gafete está vigente. La empresa decide qué información muestra. Se paga una sola vez por gafete, sin cobros recurrentes.",
    category: "Gafetes y credenciales de identificación",
    image: urlAbsoluta("/marca/og-image.png"),
    brand: { "@type": "Brand", name: site.nombre },
    url: urlAbsoluta("/precios"),
    offers: {
      "@type": "Offer",
      priceCurrency: site.moneda,
      price: precioDigital,
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
  /** Sin esto, el servicio es de gafetes para empleados. */
  tipoServicio?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: opts.nombre,
    description: opts.descripcion,
    serviceType: opts.tipoServicio ?? "Impresión de gafetes y credenciales para empleados",
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
      highPrice: precioMaximo + extraDosCarasMaximo,
    },
  };
}

export function comoHacerlo(pasos: { titulo: string; texto: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Cómo pedir gafetes y credenciales para empleados en LaGafetería",
    inLanguage: site.idioma,
    step: pasos.map((p, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: p.titulo,
      text: p.texto,
    })),
  };
}

/** La plataforma como aplicación web gratuita (página /plataforma). Solo anuncia lo ya disponible. */
export function plataforma() {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: `Plataforma de ${site.nombre}`,
    url: urlAbsoluta("/plataforma"),
    description:
      "Plataforma en línea para administrar los gafetes y credenciales de los empleados de una empresa. Incluida con la cuenta, sin costo extra.",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: site.idioma,
    provider: { "@id": ORG_ID },
    offers: { "@type": "Offer", price: 0, priceCurrency: site.moneda },
    featureList: [
      ...funcionesPlataforma.flatMap((g) => g.funciones.filter((f) => !f.pronto).map((f) => f.titulo)),
      ...funcionesEvento.map((f) => `Eventos: ${f.titulo.charAt(0).toLowerCase()}${f.titulo.slice(1)}`),
    ],
  };
}

/** La calculadora «¿Cuánto te cuesta imprimirlo tú mismo?» como herramienta web gratuita. */
export function calculadora(opts: { nombre: string; descripcion: string; ruta: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: opts.nombre,
    url: urlAbsoluta(opts.ruta),
    description: opts.descripcion,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: site.idioma,
    isAccessibleForFree: true,
    provider: { "@id": ORG_ID },
    offers: { "@type": "Offer", price: 0, priceCurrency: site.moneda },
  };
}

/** Página de contacto: enlaza el formulario con la organización. */
/** El video de presentación de la página de inicio. */
export type VideoSitio = {
  src: string;
  portada: string;
  titulo: string;
  descripcion: string;
  /** Texto corto, por ejemplo "50 segundos". */
  duracion: string;
  duracionIso: string;
  /** Fecha y hora de publicación, con zona horaria (Sonora, UTC-7): Google la pide completa. */
  publicado: string;
};

export const videoPitch: VideoSitio = {
  src: "/video/pitch-lagafeteria.mp4",
  portada: "/video/pitch-lagafeteria-portada.jpg",
  titulo: `${site.nombre} en 50 segundos`,
  descripcion:
    "Cómo pasar de fotos por chat y un Excel a los gafetes y credenciales de todo tu equipo: eliges una plantilla, subes a tu equipo, cada quien manda su foto y cotizas en línea al momento.",
  duracion: "50 segundos",
  duracionIso: "PT50S",
  publicado: "2026-11-22T12:00:00-07:00",
};

export const videoEventos: VideoSitio = {
  src: "/video/pitch-eventos.mp4",
  portada: "/video/pitch-eventos-portada.jpg",
  titulo: `${site.nombre} para eventos en 55 segundos`,
  descripcion:
    "Gafetes y credenciales para congresos, expos y capacitaciones: creas tu evento con una categoría y un color para cada quien, subes tu lista de registro, cada persona lleva su QR de acceso y cotizas en línea al momento, con tu fecha límite para pedir a tiempo.",
  duracion: "55 segundos",
  duracionIso: "PT55S",
  publicado: "2026-11-24T12:00:00-07:00",
};

export function video(v: VideoSitio = videoPitch) {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: v.titulo,
    description: v.descripcion,
    thumbnailUrl: urlAbsoluta(v.portada),
    contentUrl: urlAbsoluta(v.src),
    uploadDate: v.publicado,
    duration: v.duracionIso,
    inLanguage: "es-MX",
    publisher: { "@id": ORG_ID },
  };
}

export function paginaContacto() {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: `Contacto de ${site.nombre}`,
    url: urlAbsoluta("/contacto"),
    inLanguage: site.idioma,
    mainEntity: { "@id": ORG_ID },
  };
}

/** Glosario como DefinedTermSet: cada término con su ancla en la página. */
export function glosarioSchema(opts: {
  nombre: string;
  ruta: string;
  terminos: { id: string; termino: string; alias?: string[]; definicion: string }[];
}) {
  const url = urlAbsoluta(opts.ruta);
  return {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    "@id": `${url}#glosario`,
    name: opts.nombre,
    url: `${url}#glosario`,
    inLanguage: site.idioma,
    publisher: { "@id": ORG_ID },
    hasDefinedTerm: opts.terminos.map((t) => ({
      "@type": "DefinedTerm",
      "@id": `${url}#${t.id}`,
      name: t.termino,
      ...(t.alias?.length ? { alternateName: t.alias } : {}),
      description: t.definicion,
      url: `${url}#${t.id}`,
      inDefinedTermSet: `${url}#glosario`,
    })),
  };
}

/** Página de guía o artículo de referencia. */
export function articulo(opts: { titulo: string; descripcion: string; ruta: string; publicado: string; actualizado: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.titulo,
    description: opts.descripcion,
    url: urlAbsoluta(opts.ruta),
    mainEntityOfPage: urlAbsoluta(opts.ruta),
    image: urlAbsoluta("/marca/og-image.png"),
    datePublished: opts.publicado,
    dateModified: opts.actualizado,
    inLanguage: site.idioma,
    author: { "@id": ORG_ID },
    publisher: { "@id": ORG_ID },
    about: [
      { "@type": "Thing", name: "Tamaño de gafetes y credenciales" },
      { "@type": "Thing", name: "CR80", sameAs: "https://en.wikipedia.org/wiki/ISO/IEC_7810" },
    ],
  };
}
