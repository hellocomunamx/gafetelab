import { FORMATO_LIGA, RUTA_LIGA } from "@/lib/cuenta/ligas";

/**
 * Manifiesto de la liga de cada persona: al guardar su gafete en la pantalla
 * de inicio, abre directo su liga, como una app. No consulta la base de datos
 * ni dice de quién es: solo repite la liga que ya está en la dirección.
 */
export async function GET(_: Request, { params }: { params: Promise<{ liga: string }> }) {
  const { liga } = await params;
  if (!FORMATO_LIGA.test(liga)) return new Response("No encontrado", { status: 404 });
  const inicio = `${RUTA_LIGA}/${liga}`;
  return Response.json(
    {
      name: "Mi gafete",
      short_name: "Mi gafete",
      id: inicio,
      start_url: inicio,
      scope: inicio,
      display: "standalone",
      background_color: "#EEF0F5",
      theme_color: "#E63B2E",
      lang: "es-MX",
      icons: [
        { src: "/marca/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/marca/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
    },
    {
      headers: {
        "Content-Type": "application/manifest+json",
        "Cache-Control": "private, max-age=3600",
        "Referrer-Policy": "no-referrer",
      },
    },
  );
}
