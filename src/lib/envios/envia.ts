/**
 * Envia.com sin SDK: cotizar con varias paqueterías, comprar la guía y leer el
 * rastreo. Solo en el servidor. Documentación: https://docs.envia.com
 *
 * Variables:
 * - ENVIA_API_KEY: llave de API de producción (Desarrolladores → Acceso de API).
 * - ENVIA_ORIGEN: de dónde salen los paquetes, en JSON:
 *   {"nombre":"…","empresa":"LaGafetería","telefono":"…","correo":"…","calle":"…","numero":"…","colonia":"…","ciudad":"…","cp":"85000"}
 * - ENVIA_PAQUETERIAS (opcional): paqueterías a cotizar, separadas por coma
 *   (por ejemplo "estafeta,fedex,paquetexpress"). Sin ella se cotiza con todas
 *   las que Envia tiene en México.
 * - ENVIA_API_URL y ENVIA_QUERIES_URL solo existen para apuntar al sandbox.
 */

import type { Sobre } from "./sobres";

const api = () => (process.env.ENVIA_API_URL ?? "https://api.envia.com").replace(/\/$/, "");
const consultas = () => (process.env.ENVIA_QUERIES_URL ?? "https://queries.envia.com").replace(/\/$/, "");
const geocodigos = "https://geocodes.envia.com";

/** ¿Está configurado Envia en este ambiente? */
export const enviaActivo = () => Boolean(process.env.ENVIA_API_KEY && origen());

export class ErrorEnvia extends Error {}

type Origen = {
  nombre: string;
  empresa?: string;
  telefono: string;
  correo?: string;
  calle: string;
  numero?: string;
  colonia?: string;
  ciudad: string;
  cp: string;
};

function origen(): Origen | null {
  try {
    const o = JSON.parse(process.env.ENVIA_ORIGEN ?? "") as Origen;
    return o?.nombre && o.telefono && o.calle && o.ciudad && /^\d{5}$/.test(o.cp) ? o : null;
  } catch {
    return null;
  }
}

async function llamar<T>(base: string, metodo: "GET" | "POST", ruta: string, cuerpo?: unknown): Promise<T> {
  const r = await fetch(`${base}${ruta}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${process.env.ENVIA_API_KEY}`, "Content-Type": "application/json" },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    cache: "no-store",
  });
  const texto = await r.text();
  let datos: unknown = null;
  try {
    datos = JSON.parse(texto);
  } catch {
    // Envia a veces responde texto plano en los errores.
  }
  const fallo = (datos as { meta?: string; error?: { message?: string; description?: string } } | null) ?? null;
  if (!r.ok || fallo?.meta === "error") {
    const mensaje = fallo?.error?.message ?? fallo?.error?.description ?? (texto.slice(0, 200) || `Envia respondió ${r.status}`);
    throw new ErrorEnvia(mensaje);
  }
  return datos as T;
}

// ---------------------------------------------------------------------------
// Direcciones
// ---------------------------------------------------------------------------

type Geocodigo = { state?: { code?: { "2digit"?: string | null } }; locality?: string };

/** Clave de dos letras del estado (SO, JA, CX…) a partir del código postal. */
async function estadoDe(cp: string): Promise<string> {
  const r = await fetch(`${geocodigos}/zipcode/MX/${encodeURIComponent(cp)}`, { cache: "force-cache" });
  const lista = r.ok ? ((await r.json()) as Geocodigo[]) : [];
  const clave = lista[0]?.state?.code?.["2digit"];
  if (!clave) throw new ErrorEnvia(`Envia no reconoce el código postal ${cp}.`);
  return clave;
}

/** Separa «Av. Juárez 123 Int. 4» en calle y número; si no hay número, «S/N». */
export function separarNumero(calle: string): { street: string; number: string } {
  const m = calle.trim().match(/^(.*?\D)\s*(?:#|No\.?\s*|Núm\.?\s*)?(\d+[\w\s\-/.]*)$/i);
  return m && m[1].trim() ? { street: m[1].trim().replace(/[,#]$/, "").trim(), number: m[2].trim() } : { street: calle.trim(), number: "S/N" };
}

export type Destino = {
  destinatario: string;
  telefono: string;
  calle: string;
  colonia: string;
  ciudad: string;
  cp: string;
  referencias: string | null;
  correo?: string | null;
  empresa?: string | null;
};

const soloDigitos = (t: string) => t.replace(/\D/g, "").slice(-10);

async function direcciones(destino: Destino) {
  const o = origen();
  if (!o) throw new ErrorEnvia("Falta configurar ENVIA_ORIGEN.");
  const [estadoOrigen, estadoDestino] = await Promise.all([estadoDe(o.cp), estadoDe(destino.cp)]);
  const calleOrigen = o.numero ? { street: o.calle, number: o.numero } : separarNumero(o.calle);
  return {
    origin: {
      name: o.nombre,
      company: o.empresa ?? "LaGafetería",
      email: o.correo ?? undefined,
      phone: soloDigitos(o.telefono),
      ...calleOrigen,
      district: o.colonia ?? "",
      city: o.ciudad,
      state: estadoOrigen,
      country: "MX",
      postalCode: o.cp,
    },
    destination: {
      name: destino.destinatario,
      company: destino.empresa ?? undefined,
      email: destino.correo ?? undefined,
      phone: soloDigitos(destino.telefono),
      ...separarNumero(destino.calle),
      district: destino.colonia,
      city: destino.ciudad,
      state: estadoDestino,
      country: "MX",
      postalCode: destino.cp,
      reference: destino.referencias ?? undefined,
    },
  };
}

function paquetes(sobres: Sobre[], valorDeclarado: number) {
  const valor = Math.max(1, Math.round(valorDeclarado / Math.max(1, sobres.length)));
  return sobres.map((s) => ({
    type: "envelope",
    content: "Gafetes y credenciales de PVC",
    amount: 1,
    declaredValue: valor,
    lengthUnit: "CM",
    weightUnit: "KG",
    weight: s.pesoKg,
    dimensions: { length: s.largo, width: s.ancho, height: s.alto },
  }));
}

// ---------------------------------------------------------------------------
// Cotizar
// ---------------------------------------------------------------------------

export type Tarifa = {
  paqueteria: string;
  nombrePaqueteria: string;
  servicio: string;
  descripcion: string;
  entrega: string | null;
  dias: number | null;
  precio: number;
  moneda: string;
};

type TarifaEnvia = {
  carrier?: string;
  carrierDescription?: string;
  service?: string;
  serviceDescription?: string;
  deliveryEstimate?: string;
  deliveryDate?: { dateDifference?: number | string | null } | null;
  totalPrice?: number | string;
  currency?: string;
};

/** Las paqueterías que se cotizan: las de ENVIA_PAQUETERIAS o todas las de México. */
async function paqueterias(): Promise<string[]> {
  const fijas = (process.env.ENVIA_PAQUETERIAS ?? "")
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  if (fijas.length) return fijas;
  const r = await llamar<{ data?: { name?: string }[] }>(consultas(), "GET", "/carrier?country_code=MX");
  return [...new Set((r.data ?? []).map((c) => c.name?.toLowerCase()).filter((n): n is string => Boolean(n)))];
}

/**
 * Cotiza el envío con todas las paqueterías a la vez y devuelve las tarifas de
 * la más barata a la más cara. Las paqueterías que fallan o no cubren la ruta
 * simplemente no aparecen.
 */
export async function cotizarEnvio(destino: Destino, sobres: Sobre[], valorDeclarado: number): Promise<Tarifa[]> {
  if (!sobres.length) return [];
  const [lista, dirs] = await Promise.all([paqueterias(), direcciones(destino)]);
  const cuerpo = (carrier: string) => ({
    ...dirs,
    packages: paquetes(sobres, valorDeclarado),
    shipment: { type: 1, carrier },
    settings: { currency: "MXN" },
  });
  const respuestas = await Promise.allSettled(lista.map((c) => llamar<{ data?: TarifaEnvia[] }>(api(), "POST", "/ship/rate/", cuerpo(c))));
  const tarifas: Tarifa[] = [];
  for (const r of respuestas) {
    if (r.status !== "fulfilled") continue;
    for (const t of r.value.data ?? []) {
      const precio = Number(t.totalPrice);
      if (!t.carrier || !t.service || !Number.isFinite(precio) || precio <= 0) continue;
      const dias = Number(t.deliveryDate?.dateDifference);
      tarifas.push({
        paqueteria: t.carrier,
        nombrePaqueteria: t.carrierDescription ?? t.carrier,
        servicio: t.service,
        descripcion: t.serviceDescription ?? t.service,
        entrega: t.deliveryEstimate ?? null,
        dias: Number.isFinite(dias) && dias > 0 ? dias : null,
        precio,
        moneda: t.currency ?? "MXN",
      });
    }
  }
  if (!tarifas.length && respuestas.every((r) => r.status === "rejected")) {
    const primera = respuestas[0];
    throw new ErrorEnvia(primera?.status === "rejected" ? String((primera.reason as Error)?.message ?? primera.reason) : "Envia no respondió.");
  }
  return tarifas.sort((a, b) => a.precio - b.precio);
}

/** La más barata y la más rápida (si es otra). */
export function destacadas(tarifas: Tarifa[]): { barata: Tarifa | null; rapida: Tarifa | null } {
  const barata = tarifas[0] ?? null;
  const conDias = tarifas.filter((t) => t.dias !== null);
  const rapida = conDias.length ? conDias.reduce((a, b) => (b.dias! < a.dias! || (b.dias === a.dias && b.precio < a.precio) ? b : a)) : null;
  return { barata, rapida: rapida && rapida !== barata ? rapida : null };
}

// ---------------------------------------------------------------------------
// Guía
// ---------------------------------------------------------------------------

export type Guia = {
  paqueteria: string;
  servicio: string;
  guias: string[];
  etiqueta: string | null;
  rastreo: string | null;
  costo: number;
  envioId: string | null;
};

type GuiaEnvia = {
  carrier?: string;
  service?: string;
  shipmentId?: number | string;
  trackingNumber?: string;
  trackingNumbers?: string[];
  trackUrl?: string;
  label?: string;
  totalPrice?: number | string;
};

/** Compra la guía con la paquetería y el servicio elegidos. Se cobra del saldo de Envia. */
export async function generarGuia(
  destino: Destino,
  sobres: Sobre[],
  valorDeclarado: number,
  paqueteria: string,
  servicio: string,
  referencia: string,
): Promise<Guia> {
  const dirs = await direcciones(destino);
  const r = await llamar<{ data?: GuiaEnvia[] }>(api(), "POST", "/ship/generate/", {
    ...dirs,
    packages: paquetes(sobres, valorDeclarado),
    shipment: { type: 1, carrier: paqueteria, service: servicio, reference: referencia },
    settings: { currency: "MXN", printFormat: "PDF", printSize: "STOCK_4X6", comments: referencia },
  });
  const g = r.data?.[0];
  const numeros = [...new Set([...(g?.trackingNumbers ?? []), g?.trackingNumber].filter((n): n is string => Boolean(n)))];
  if (!g || !numeros.length) throw new ErrorEnvia("Envia no devolvió número de guía.");
  return {
    paqueteria: g.carrier ?? paqueteria,
    servicio: g.service ?? servicio,
    guias: numeros,
    etiqueta: g.label ?? null,
    rastreo: g.trackUrl ?? `https://envia.com/es-MX/tracking?label=${encodeURIComponent(numeros[0])}`,
    costo: Number(g.totalPrice) || 0,
    envioId: g.shipmentId === undefined ? null : String(g.shipmentId),
  };
}
