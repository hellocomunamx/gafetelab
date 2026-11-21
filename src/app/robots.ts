import type { MetadataRoute } from "next";
import { site, urlAbsoluta } from "@/lib/site";

/**
 * Rastreadores de buscadores con IA y asistentes. Ya quedan cubiertos por "*",
 * pero se listan para dejar explícito que GafeteLab sí quiere aparecer en sus respuestas.
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

export default function robots(): MetadataRoute.Robots {
  if (!site.indexable) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/"] },
      { userAgent: rastreadoresIA, allow: "/", disallow: ["/api/"] },
    ],
    sitemap: urlAbsoluta("/sitemap.xml"),
  };
}
