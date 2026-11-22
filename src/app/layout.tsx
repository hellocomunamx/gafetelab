import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Encabezado } from "@/components/Encabezado";
import { JsonLd } from "@/components/JsonLd";
import { Pie } from "@/components/Pie";
import { organizacion, sitioWeb } from "@/lib/schema";
import { site } from "@/lib/site";
import "./globals.css";

const bricolage = localFont({
  src: "../fonts/BricolageGrotesque-Variable.woff2",
  variable: "--font-bricolage",
  weight: "600 800",
  display: "swap",
});

const inter = localFont({
  src: "../fonts/Inter-Variable.woff2",
  variable: "--font-inter",
  weight: "400 700",
  display: "swap",
});

const gochi = localFont({
  src: "../fonts/GochiHand-Regular.woff2",
  variable: "--font-gochi",
  weight: "400",
  display: "swap",
});

/**
 * Las letras de los diseños de gafete, con el tamaño óptico fijo. Las de arriba
 * cambian de forma según el tamaño al que se dibujan, y un gafete debe verse
 * idéntico en el editor, en la vista previa y en el PDF de impresión. Se
 * descargan solo donde se usan.
 */
const bricolageGafete = localFont({
  src: "../fonts/BricolageGrotesque-Gafete.woff2",
  variable: "--font-gafete-bricolage",
  weight: "600 800",
  display: "swap",
  preload: false,
});

const interGafete = localFont({
  src: "../fonts/Inter-Gafete.woff2",
  variable: "--font-gafete-inter",
  weight: "400 700",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.titulo} | ${site.nombre}`,
    template: `%s | ${site.nombre}`,
  },
  description: site.descripcion,
  applicationName: site.nombre,
  authors: [{ name: site.nombre, url: site.url }],
  creator: site.nombre,
  publisher: site.nombre,
  category: "business",
  formatDetection: { telephone: false },
  robots: site.indexable
    ? {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-snippet": -1,
          "max-image-preview": "large",
          "max-video-preview": -1,
        },
      }
    : { index: false, follow: false },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
      ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
      : undefined,
  },
};

export const viewport: Viewport = {
  themeColor: "#e63b2e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang={site.idioma}
      className={`${bricolage.variable} ${inter.variable} ${gochi.variable} ${bricolageGafete.variable} ${interGafete.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-30 focus:rounded-full focus:bg-tinta focus:px-4 focus:py-2 focus:text-white"
        >
          Saltar al contenido
        </a>
        <Encabezado />
        <main id="contenido" className="flex-1">
          {children}
        </main>
        <Pie />
        <JsonLd data={[organizacion(), sitioWeb()]} />
      </body>
    </html>
  );
}
