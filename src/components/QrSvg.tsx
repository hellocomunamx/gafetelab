import { codigoQr } from "@/lib/qr";

/** Código QR como SVG, a partir de lo que lleva escrito. No dibuja nada si el texto está vacío. */
export function QrSvg({ texto, titulo, className = "" }: { texto: string; titulo: string; className?: string }) {
  const qr = codigoQr(texto);
  if (!qr) return null;
  return (
    <svg viewBox={`0 0 ${qr.lado} ${qr.lado}`} role="img" aria-label={titulo} className={className} shapeRendering="crispEdges">
      <rect width={qr.lado} height={qr.lado} fill="#fff" />
      <path d={qr.trazo} fill="#000" />
    </svg>
  );
}
