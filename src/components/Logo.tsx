import Image from "next/image";
import { site } from "@/lib/site";

/** Logo horizontal de la marca. `inverso` es la versión para fondos oscuros. */
export function Logo({ inverso = false, className }: { inverso?: boolean; className?: string }) {
  return (
    <Image
      src={`/marca/lagafeteria-horizontal-${inverso ? "inverse" : "color"}.svg`}
      alt={site.nombre}
      width={159}
      height={44}
      priority={!inverso}
      unoptimized
      className={className}
    />
  );
}
