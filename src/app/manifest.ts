import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${site.nombre}: gafetes y credenciales`,
    short_name: site.nombre,
    description: site.descripcionCorta,
    lang: site.idioma,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#e63b2e",
    icons: [
      { src: "/marca/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/marca/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
