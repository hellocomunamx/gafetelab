import type { MetadataRoute } from "next";
import { site, urlAbsoluta } from "@/lib/site";

/**
 * Rastreadores de buscadores con IA y asistentes. Ya quedan cubiertos por "*",
 * pero se listan para dejar explícito que LaGafetería sí quiere aparecer en sus respuestas.
 */
const rastreadoresIA = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Amazonbot",
  "Meta-ExternalAgent",
  "CCBot",
];

/** Rutas que no deben rastrearse: la API y todo lo que requiere sesión. */
const privadas = ["/api/", "/auth/", "/cuenta", "/admin", "/entrar", "/aceptar", "/salir", "/v/"];

export default function robots(): MetadataRoute.Robots {
  if (!site.indexable) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: privadas },
      { userAgent: rastreadoresIA, allow: "/", disallow: privadas },
    ],
    sitemap: urlAbsoluta("/sitemap.xml"),
  };
}
