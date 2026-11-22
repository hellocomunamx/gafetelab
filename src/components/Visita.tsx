"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Avisa al servidor de cada página vista, para el conteo de visitas del panel.
 * No usa cookies ni guarda nada en el navegador, y respeta a quien pide no ser
 * rastreado (Do Not Track o Global Privacy Control).
 */
export function Visita() {
  const ruta = usePathname();
  const anterior = useRef<string | null>(null);

  useEffect(() => {
    if (anterior.current === ruta) return;
    const primera = anterior.current === null;
    anterior.current = ruta;

    const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
    if (nav.doNotTrack === "1" || nav.globalPrivacyControl === true) return;

    // Una visita empieza cuando la persona llega de fuera o entra directo; recargar no cuenta.
    let entrada = false;
    if (primera) {
      const carga = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      let deFuera = true;
      try {
        deFuera = !document.referrer || new URL(document.referrer).host !== location.host;
      } catch {
        deFuera = true;
      }
      entrada = deFuera && (!carga || carga.type === "navigate");
    }
    const cuerpo = JSON.stringify({
      ruta,
      entrada,
      ref: entrada ? document.referrer : "",
      utm: entrada ? (new URLSearchParams(location.search).get("utm_source") ?? "") : "",
    });
    try {
      navigator.sendBeacon("/api/visita", new Blob([cuerpo], { type: "application/json" }));
    } catch {
      // Si el navegador no deja mandar el aviso, la visita no se cuenta y ya.
    }
  }, [ruta]);

  return null;
}
