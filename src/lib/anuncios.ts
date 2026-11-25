/**
 * Medición de Google Ads: solo para saber qué anuncios traen cotizaciones y pedidos.
 *
 * Cuenta de Google Ads 190-580-7239. Si `id` se deja vacío no se carga nada. Las etiquetas salen de Google Ads,
 * en Objetivos > Conversiones > Resumen, al abrir cada acción de conversión
 * ("send_to": "AW-XXXXXXXXX/etiqueta").
 */
export const googleAds = {
  id: "AW-18595884359",
  etiquetas: {
    cotizacion: "92RpCIfvwL8dEMfamqNF",
    registro: "VEizCIrvwL8dEMfamqNF",
    compra: "5DDxCLGovL8dEMfamqNF",
  },
} as const;

export type Conversion = keyof typeof googleAds.etiquetas;

type Gtag = (...args: unknown[]) => void;

/** Rutas donde la etiqueta no se carga: el panel interno y las páginas personales de cada empleado. */
const SIN_ETIQUETA = [/^\/8admins(\/|$)/, /^\/e\//, /^\/mi-gafete(\/|$)/, /^\/v\//, /^\/invitacion(\/|$)/];

export function rutaConEtiqueta(ruta: string): boolean {
  return !SIN_ETIQUETA.some((patron) => patron.test(ruta));
}

/** Quien pide no ser rastreado (Do Not Track o Global Privacy Control) no se mide. */
export function pideNoRastreo(): boolean {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.doNotTrack === "1" || nav.globalPrivacyControl === true;
}

/**
 * Registra una conversión. No hace nada si la etiqueta no está configurada o no se cargó.
 * `id` evita contar dos veces el mismo pedido si la página se recarga.
 */
export function registrarConversion(tipo: Conversion, datos: { valor?: number; id?: string } = {}) {
  const etiqueta = googleAds.etiquetas[tipo];
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  if (!googleAds.id || !etiqueta || !gtag) return;
  gtag("event", "conversion", {
    send_to: `${googleAds.id}/${etiqueta}`,
    ...(datos.valor !== undefined ? { value: datos.valor, currency: "MXN" } : {}),
    ...(datos.id ? { transaction_id: datos.id } : {}),
  });
}
