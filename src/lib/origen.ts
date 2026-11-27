import { pideNoRastreo } from "@/lib/anuncios";

/**
 * De qué anuncio o liga llegó la visita, para saber qué búsquedas traen
 * cotizaciones. Se guarda solo durante la visita (sessionStorage, se borra al
 * cerrar la pestaña) y únicamente con los parámetros de campaña de la liga
 * (utm_*): nada que identifique a la persona. Quien pide no ser rastreado no
 * se registra.
 */
export type Origen = {
  origen?: string;
  medio?: string;
  campana?: string;
  termino?: string;
  contenido?: string;
  entrada?: string;
};

const LLAVE = "lg-origen";
const CAMPOS: [keyof Origen, string][] = [
  ["origen", "utm_source"],
  ["medio", "utm_medium"],
  ["campana", "utm_campaign"],
  ["termino", "utm_term"],
  ["contenido", "utm_content"],
];

/** Anota el origen la primera vez que la liga trae parámetros de campaña. */
export function anotarOrigen(ruta: string) {
  try {
    if (pideNoRastreo() || sessionStorage.getItem(LLAVE)) return;
    const parametros = new URLSearchParams(location.search);
    const origen: Origen = {};
    for (const [campo, parametro] of CAMPOS) {
      const valor = parametros.get(parametro)?.trim().slice(0, 100);
      if (valor) origen[campo] = valor;
    }
    if (!origen.origen) return;
    origen.entrada = ruta.slice(0, 200);
    sessionStorage.setItem(LLAVE, JSON.stringify(origen));
  } catch {
    // Sin almacenamiento disponible no se anota y ya.
  }
}

export function leerOrigen(): Origen | null {
  try {
    if (pideNoRastreo()) return null;
    const texto = sessionStorage.getItem(LLAVE);
    return texto ? (JSON.parse(texto) as Origen) : null;
  } catch {
    return null;
  }
}
