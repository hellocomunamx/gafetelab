"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { type Conversion, googleAds, pideNoRastreo, registrarConversion, rutaConEtiqueta } from "@/lib/anuncios";

type ConCapa = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };

/**
 * Carga la etiqueta de Google Ads (gtag.js) para medir cotizaciones y pedidos que
 * llegan por anuncios. No se carga si falta el identificador, si la persona pide no
 * ser rastreada, ni en el panel interno o las páginas personales de los empleados.
 * Una vez cargada, se queda para el resto de la visita.
 */
export function EtiquetaAnuncios() {
  const ruta = usePathname();

  useEffect(() => {
    const w = window as ConCapa;
    if (w.gtag || !googleAds.id || !rutaConEtiqueta(ruta) || pideNoRastreo()) return;
    w.dataLayer = w.dataLayer ?? [];
    // gtag.js espera el objeto `arguments` tal cual, no un arreglo.
    // eslint-disable-next-line prefer-rest-params
    w.gtag = function gtag() { w.dataLayer?.push(arguments); };
    w.gtag("js", new Date());
    w.gtag("config", googleAds.id);
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${googleAds.id}`;
    document.head.appendChild(script);
  }, [ruta]);

  return null;
}

/** Registra una conversión al mostrarse, una sola vez (por ejemplo, un pedido pagado). */
export function ConversionAlMostrar({ tipo, valor, id }: { tipo: Conversion; valor?: number; id?: string }) {
  useEffect(() => {
    // La etiqueta se prepara en el mismo ciclo; gtag guarda el evento hasta que termine de cargar.
    const reloj = setTimeout(() => registrarConversion(tipo, { valor, id }), 0);
    return () => clearTimeout(reloj);
  }, [tipo, valor, id]);
  return null;
}
