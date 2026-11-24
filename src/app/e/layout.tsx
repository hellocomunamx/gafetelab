import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Contenedor } from "@/components/ui";

export const metadata: Metadata = {
  title: "Mi gafete",
  description: "Portal de empleados: tu gafete, tus solicitudes y en qué van.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function LayoutPortal({ children }: { children: ReactNode }) {
  return <Contenedor className="py-8 sm:py-12">{children}</Contenedor>;
}
