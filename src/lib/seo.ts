import type { Metadata } from "next";
import { site } from "./site";

type Pagina = {
  /** Título sin el nombre de la marca; el layout agrega " | LaGafetería". */
  titulo: string;
  descripcion: string;
  /** Ruta canónica, por ejemplo "/precios". */
  ruta: string;
  /** Usa el título tal cual, sin sufijo de marca. */
  tituloAbsoluto?: boolean;
  noindex?: boolean;
};

/** Metadatos completos y consistentes para una página: canónica, Open Graph y Twitter. */
export function metadatos({ titulo, descripcion, ruta, tituloAbsoluto, noindex }: Pagina): Metadata {
  const tituloSocial = tituloAbsoluto ? titulo : `${titulo} | ${site.nombre}`;
  return {
    title: tituloAbsoluto ? { absolute: titulo } : titulo,
    description: descripcion,
    alternates: { canonical: ruta },
    // Sin esta clave la página hereda las reglas de robots del layout.
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: "website",
      siteName: site.nombre,
      locale: site.locale,
      url: ruta,
      title: tituloSocial,
      description: descripcion,
      images: [
        {
          url: "/marca/og-image.png",
          width: 1200,
          height: 630,
          alt: "LaGafetería: gafetes y credenciales para empleados",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: tituloSocial,
      description: descripcion,
      images: ["/marca/og-image.png"],
    },
  };
}
