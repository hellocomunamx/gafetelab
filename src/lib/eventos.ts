/**
 * Eventos: catálogos y reglas que comparten el navegador y el servidor.
 * Un evento es un proyecto dentro de la organización (ver la migración
 * `eventos`): usa los mismos datos, diseños y pedidos que el equipo de
 * trabajo, más fechas, categorías con color, cordón y datos que se borran al
 * terminar.
 */

import { normalizar } from "@/lib/diseno/reglas";

export type TipoEvento = "congreso" | "conferencia" | "corporativo" | "expo" | "escolar" | "otro";

export const tiposEvento: { id: TipoEvento; nombre: string; ayuda: string }[] = [
  { id: "congreso", nombre: "Congreso o convención", ayuda: "Médico, profesional o de ventas, de uno o varios días." },
  { id: "conferencia", nombre: "Conferencia, foro o seminario", ayuda: "Ponentes y asistentes con nombre, por lo general de un día." },
  { id: "corporativo", nombre: "Capacitación o evento corporativo", ayuda: "Convención anual, capacitación o reunión de tu empresa." },
  { id: "expo", nombre: "Expo o feria", ayuda: "Gafetes para expositores y staff con su nombre." },
  { id: "escolar", nombre: "Graduación o evento escolar", ayuda: "Graduaciones, olimpiadas, torneos y visitas escolares." },
  { id: "otro", nombre: "Otro", ayuda: "Cualquier evento con lista de personas." },
];

export const esTipoEvento = (v: unknown): v is TipoEvento => tiposEvento.some((t) => t.id === v);
export const nombreTipoEvento = (v: string | null | undefined) => tiposEvento.find((t) => t.id === v)?.nombre ?? "Evento";

export type Categoria = { nombre: string; color: string };

/** Categorías de gafete con las que empieza un evento. Se pueden quitar, cambiar de color o agregar otras. */
export const categoriasBase: Categoria[] = [
  { nombre: "Asistente", color: "#1f6feb" },
  { nombre: "Ponente", color: "#e63946" },
  { nombre: "Staff", color: "#1b1f3b" },
  { nombre: "Prensa", color: "#f4a100" },
  { nombre: "Expositor", color: "#0a7d4f" },
  { nombre: "Organizador", color: "#7b2cbf" },
];

/** Colores para elegir: los de cordón que se consiguen en México sin pedido especial. */
export const coloresCategoria: { color: string; nombre: string }[] = [
  { color: "#1f6feb", nombre: "Azul" },
  { color: "#0b2e6f", nombre: "Azul marino" },
  { color: "#e63946", nombre: "Rojo" },
  { color: "#1b1f3b", nombre: "Negro" },
  { color: "#f4a100", nombre: "Amarillo" },
  { color: "#0a7d4f", nombre: "Verde" },
  { color: "#7b2cbf", nombre: "Morado" },
  { color: "#ff6b9a", nombre: "Rosa" },
  { color: "#f26b1d", nombre: "Naranja" },
  { color: "#7a7f93", nombre: "Gris" },
  { color: "#5bc0eb", nombre: "Azul cielo" },
  { color: "#8b5a2b", nombre: "Café" },
];

export const nombreColor = (color: string) =>
  coloresCategoria.find((c) => c.color.toLowerCase() === color.toLowerCase())?.nombre ?? color;

export const MAX_CATEGORIAS = 12;
const COLOR = /^#[0-9a-f]{6}$/i;

/** Limpia la lista de categorías que manda el navegador: sin repetidas, sin vacías y con color válido. */
export function limpiarCategorias(entrada: unknown): Categoria[] {
  if (!Array.isArray(entrada)) return [];
  const vistas = new Set<string>();
  const limpias: Categoria[] = [];
  for (const c of entrada) {
    if (!c || typeof c !== "object") continue;
    const nombre = String((c as Categoria).nombre ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
    const color = String((c as Categoria).color ?? "").trim();
    if (!nombre || !COLOR.test(color) || vistas.has(normalizar(nombre))) continue;
    vistas.add(normalizar(nombre));
    limpias.push({ nombre, color: color.toLowerCase() });
    if (limpias.length >= MAX_CATEGORIAS) break;
  }
  return limpias;
}

/** Lee las categorías guardadas en la empresa. */
export const categoriasDe = (v: unknown): Categoria[] => limpiarCategorias(v);

/** La categoría de una persona según lo que trae su dato «Categoría», sin importar mayúsculas ni acentos. */
export function categoriaDe(valor: string | null | undefined, categorias: Categoria[]): Categoria | null {
  if (!valor?.trim()) return null;
  const buscada = normalizar(valor);
  return categorias.find((c) => normalizar(c.nombre) === buscada) ?? null;
}

// ---------------------------------------------------------------------------
// Fechas
// ---------------------------------------------------------------------------

/** Días naturales que tarda un pedido estándar en llegar, más un margen para no llegar el mismo día. */
export const diasEntregaEvento = 14;
export const diasMargenEvento = 3;
/** Días después del último día del evento en que se borran los datos de los asistentes. */
export const diasParaBorrarDatos = 30;

const ZONA = "America/Hermosillo";

/** Hoy, como AAAA-MM-DD, en la hora de Sonora. */
export const hoyIso = () => new Date().toLocaleDateString("en-CA", { timeZone: ZONA });

export function sumarDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function diasEntre(desde: string, hasta: string): number {
  return Math.round((Date.parse(`${hasta}T12:00:00Z`) - Date.parse(`${desde}T12:00:00Z`)) / 86_400_000);
}

/** La fecha límite sugerida para pedir: lo que tarda el envío y unos días de margen antes del evento. */
export const limiteSugerido = (inicio: string) => sumarDias(inicio, -(diasEntregaEvento + diasMargenEvento));

/** "12 de marzo de 2027". */
export const fechaEvento = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** "12 al 14 de marzo de 2027", "30 de abril al 2 de mayo de 2027" o "12 de marzo de 2027". */
export function rangoEvento(inicio: string, fin: string): string {
  if (inicio === fin) return fechaEvento(inicio);
  const [ai, mi] = inicio.split("-");
  const [af, mf] = fin.split("-");
  const dia = (iso: string) => Number(iso.slice(8, 10));
  const mes = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("es-MX", { month: "long", timeZone: "UTC" });
  if (ai === af && mi === mf) return `${dia(inicio)} al ${fechaEvento(fin)}`;
  if (ai === af) return `${dia(inicio)} de ${mes(inicio)} al ${fechaEvento(fin)}`;
  return `${fechaEvento(inicio)} al ${fechaEvento(fin)}`;
}

export type EventoBasico = {
  evento_inicio: string | null;
  evento_fin: string | null;
  evento_limite: string | null;
  datos_borrados_en?: string | null;
};

export type EstadoEvento =
  | { fase: "a_tiempo"; diasParaLimite: number }
  | { fase: "tarde"; diasParaEvento: number }
  | { fase: "en_curso" }
  | { fase: "terminado"; borradoEl: string }
  | { fase: "borrado" };

/** En qué punto está un evento respecto a hoy. */
export function estadoEvento(e: EventoBasico, hoy = hoyIso()): EstadoEvento {
  if (e.datos_borrados_en) return { fase: "borrado" };
  const inicio = e.evento_inicio ?? hoy;
  const fin = e.evento_fin ?? inicio;
  const limite = e.evento_limite ?? limiteSugerido(inicio);
  if (hoy > fin) return { fase: "terminado", borradoEl: sumarDias(fin, diasParaBorrarDatos) };
  if (hoy >= inicio) return { fase: "en_curso" };
  if (hoy <= limite) return { fase: "a_tiempo", diasParaLimite: diasEntre(hoy, limite) };
  return { fase: "tarde", diasParaEvento: diasEntre(hoy, inicio) };
}

// ---------------------------------------------------------------------------
// Cordón
// ---------------------------------------------------------------------------

export type CordonPorColor = { categoria: string; color: string; piezas: number };

/**
 * Cuántos cordones de cada color lleva un pedido: uno por persona, del color
 * de su categoría. Quien no tiene categoría válida lleva el del primer color.
 */
export function cordonesDe(categoriasDePersonas: (string | null | undefined)[], categorias: Categoria[]): CordonPorColor[] {
  const respaldo = categorias[0] ?? { nombre: "Sin categoría", color: "#1b1f3b" };
  const cuenta = new Map<string, CordonPorColor>();
  for (const valor of categoriasDePersonas) {
    const c = categoriaDe(valor, categorias) ?? respaldo;
    const previo = cuenta.get(c.nombre);
    if (previo) previo.piezas += 1;
    else cuenta.set(c.nombre, { categoria: c.nombre, color: c.color, piezas: 1 });
  }
  return [...cuenta.values()];
}
