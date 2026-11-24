/**
 * Materiales de los gafetes impresos y medidas del archivo. Única fuente: el
 * cotizador, la página de materiales, la vista del diseño y llms.txt leen de aquí.
 * Todos son insumos de línea que se consiguen con distribuidores en México
 * (tarjetas CR80 para impresoras de credenciales).
 */

export type MaterialId = "estandar" | "rudo" | "adhesivo" | "proximidad";

export type Material = {
  id: MaterialId;
  nombre: string;
  /** Nombre técnico con el que se pide al proveedor. */
  tecnico: string;
  grosorMm: number;
  /** Grosor en milésimas de pulgada ("mil"), como lo manejan los proveedores. */
  grosorMil: number;
  /** Extra por pieza sobre el precio del gafete impreso, antes de IVA. */
  extra: number;
  disponible: boolean;
  resumen: string;
  detalle: string;
  ideal: string;
};

export const materiales: Material[] = [
  {
    id: "estandar",
    nombre: "PVC estándar",
    tecnico: "Tarjeta de PVC blanca CR80 de 30 mil",
    grosorMm: 0.76,
    grosorMil: 30,
    extra: 0,
    disponible: true,
    resumen: "El de siempre: rígido, con el grosor de una tarjeta bancaria.",
    detalle:
      "Tarjeta de PVC blanco rígido con acabado brillante. Es el material con el que se hacen la mayoría de los gafetes y credenciales, y el que cabe en cualquier portagafete.",
    ideal: "Oficinas, tiendas, restaurantes, escuelas y eventos.",
  },
  {
    id: "rudo",
    nombre: "PVC compuesto",
    tecnico: "Tarjeta compuesta CR80 de 30 mil (60% PVC, 40% poliéster)",
    grosorMm: 0.76,
    grosorMil: 30,
    extra: 6,
    disponible: true,
    resumen: "Para uso rudo: aguanta más calor y más dobleces sin deformarse.",
    detalle:
      "Mismo tamaño y grosor que el estándar, pero con un núcleo de poliéster que lo hace más resistente al calor, a doblarse y a quebrarse con el uso diario.",
    ideal: "Cocinas, plantas, bodegas, seguridad privada y trabajo en exteriores.",
  },
  {
    id: "adhesivo",
    nombre: "PVC adhesivo",
    tecnico: "Tarjeta de PVC adhesiva CR80 de 10 mil",
    grosorMm: 0.25,
    grosorMil: 10,
    extra: 5,
    disponible: true,
    resumen: "Delgado y con adhesivo: se pega sobre la tarjeta de acceso que ya tienes.",
    detalle:
      "Lámina delgada de PVC con respaldo adhesivo. Se imprime igual que un gafete y se pega sobre una tarjeta de proximidad o de checador, para no reemplazar las tarjetas que tu empresa ya usa.",
    ideal: "Empresas que ya tienen tarjetas de acceso o de reloj checador.",
  },
  {
    id: "proximidad",
    nombre: "Tarjeta de proximidad",
    tecnico: "Tarjeta de proximidad imprimible CR80 (RFID)",
    grosorMm: 0.8,
    grosorMil: 31,
    extra: 0,
    disponible: false,
    resumen: "El gafete que también abre puertas o registra asistencia.",
    detalle:
      "Tarjeta con chip y antena integrados, impresa como un gafete. Depende del sistema de acceso de cada empresa, así que todavía no se cotiza en línea.",
    ideal: "Empresas con control de acceso o reloj checador por tarjeta.",
  },
];

export const materialBase = materiales[0];

export function materialPara(id: unknown): Material {
  return materiales.find((m) => m.id === id && m.disponible) ?? materialBase;
}

export function grosorTexto(m: Material): string {
  return `${m.grosorMm} mm (${m.grosorMil} mil)`;
}

/** Medidas del gafete y del archivo de diseño, en milímetros. */
export const medidas = {
  /** Tamaño final de la tarjeta CR80. */
  ancho: 85.6,
  alto: 54,
  radioEsquina: 3,
  /** Lo que el diseño debe sobresalir por cada lado para que no queden filos blancos. */
  sangrado: 2,
  /** Distancia hacia adentro del corte donde ya es seguro poner textos y logos. */
  margenSeguro: 3,
  /** Ranura opcional para broche o cordón. */
  ranura: { ancho: 14, alto: 3, distanciaAlBorde: 5 },
  resolucionDpi: 300,
};

const mm = (n: number) => `${Number(n.toFixed(1))} mm`;
const px = (n: number) => Math.round((n / 25.4) * medidas.resolucionDpi);

/** Las tres zonas del diseño, de afuera hacia adentro. */
export const zonas = [
  {
    id: "sangrado",
    nombre: "Margen de corte",
    medida: `${mm(medidas.ancho + medidas.sangrado * 2)} × ${mm(medidas.alto + medidas.sangrado * 2)}`,
    pixeles: `${px(medidas.ancho + medidas.sangrado * 2)} × ${px(medidas.alto + medidas.sangrado * 2)} px`,
    texto: `El tamaño del archivo. El fondo debe llegar hasta aquí: son ${medidas.sangrado} mm extra por lado que se recortan. En imprenta se le llama sangrado.`,
  },
  {
    id: "corte",
    nombre: "Línea de corte",
    medida: `${mm(medidas.ancho)} × ${mm(medidas.alto)}`,
    pixeles: `${px(medidas.ancho)} × ${px(medidas.alto)} px`,
    texto: "El tamaño final del gafete (CR80), con esquinas redondeadas.",
  },
  {
    id: "segura",
    nombre: "Zona segura",
    medida: `${mm(medidas.ancho - medidas.margenSeguro * 2)} × ${mm(medidas.alto - medidas.margenSeguro * 2)}`,
    pixeles: `${px(medidas.ancho - medidas.margenSeguro * 2)} × ${px(medidas.alto - medidas.margenSeguro * 2)} px`,
    texto: `Nombres, fotos, logos y códigos QR van aquí adentro, a ${medidas.margenSeguro} mm o más del corte.`,
  },
] as const;
