import type { MetadataRoute } from "next";
import { rutasCiudades, rutasGiros, rutasPrincipales } from "@/lib/rutas";
import { site, urlAbsoluta } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [...rutasPrincipales, ...rutasGiros, ...rutasCiudades].map((r) => ({
    url: urlAbsoluta(r.ruta),
    lastModified: site.actualizado,
    changeFrequency: "monthly",
    priority: r.prioridad,
  }));
}
