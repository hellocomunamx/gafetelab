import { medidas } from "@/lib/materiales";

/** "Ya tengo mis gafetes listos": gafetes terminados que la empresa sube, una imagen por cara. */

export type CaraLista = "frente" | "vuelta";
export const carasListas: { id: CaraLista; nombre: string }[] = [
  { id: "frente", nombre: "Frente" },
  { id: "vuelta", nombre: "Vuelta" },
];

const PULGADA = 25.4;
const corte = { largo: medidas.ancho, corto: medidas.alto };
const conMargen = { largo: medidas.ancho + medidas.sangrado * 2, corto: medidas.alto + medidas.sangrado * 2 };
const aPixeles = (mm: number) => Math.round((mm / PULGADA) * medidas.resolucionDpi);

/** Medidas que se le piden al archivo, para mostrarlas en pantalla. */
export const medidaIdeal = {
  mm: `${conMargen.largo} × ${conMargen.corto} mm`,
  px: `${aPixeles(conMargen.largo)} × ${aPixeles(conMargen.corto)} px`,
  corteMm: `${corte.largo} × ${corte.corto} mm`,
  margenMm: medidas.sangrado,
  dpi: medidas.resolucionDpi,
};

/** Por debajo de esto la imagen no alcanza para imprimirse. */
export const DPI_MINIMO = 150;
const DPI_JUSTO = 200;
/** Un poco menos de 300 para no marcar archivos exportados con un pixel de diferencia. */
const DPI_BUENO = 290;

export type Revision = {
  orientacion: "horizontal" | "vertical";
  /** con_margen: trae margen de corte. al_corte: mide justo el gafete. ajuste: casi. distinta: no es un gafete. */
  medida: "con_margen" | "al_corte" | "ajuste" | "distinta";
  dpi: number;
  /** Lo que conviene saber antes de imprimir. Vacío si todo está bien. */
  avisos: string[];
  /** No se puede usar: ni se sube ni se guarda. */
  bloquea: boolean;
};

const cerca = (valor: number, meta: number, tolerancia: number) => Math.abs(valor - meta) / meta <= tolerancia;

/** Revisa la medida y la calidad de un gafete terminado a partir de sus pixeles. */
export function revisarGafete(ancho: number, alto: number): Revision {
  const largo = Math.max(ancho, alto);
  const corto = Math.min(ancho, alto);
  const proporcion = largo / corto;
  const medida: Revision["medida"] = cerca(proporcion, conMargen.largo / conMargen.corto, 0.012)
    ? "con_margen"
    : cerca(proporcion, corte.largo / corte.corto, 0.012)
      ? "al_corte"
      : proporcion >= 1.45 && proporcion <= 1.68
        ? "ajuste"
        : "distinta";
  const referencia = medida === "con_margen" ? conMargen : corte;
  // Con proporción distinta manda el lado que menos pixeles trae para su medida.
  const dpi = Math.round(Math.min(largo / (referencia.largo / PULGADA), corto / (referencia.corto / PULGADA)));

  const avisos: string[] = [];
  if (medida === "distinta") {
    avisos.push(`No tiene la proporción de un gafete (${medidaIdeal.corteMm}).`);
  } else if (medida === "ajuste") {
    avisos.push("La proporción no es exacta: se ajustará recortando un poco las orillas.");
  } else if (medida === "al_corte") {
    avisos.push("No trae margen de corte: al cortar puede quedar un filo blanco en la orilla.");
  }
  if (dpi < DPI_MINIMO) {
    avisos.push(`Resolución muy baja (${dpi} dpi): no alcanza para imprimir.`);
  } else if (dpi < DPI_JUSTO) {
    avisos.push(`Resolución baja (${dpi} dpi): los textos pequeños pueden verse borrosos.`);
  } else if (dpi < DPI_BUENO) {
    avisos.push(`Resolución justa (${dpi} dpi): lo ideal son ${medidas.resolucionDpi}.`);
  }
  return {
    orientacion: ancho >= alto ? "horizontal" : "vertical",
    medida,
    dpi,
    avisos,
    bloquea: medida === "distinta" || dpi < DPI_MINIMO,
  };
}

const SUFIJOS: Record<string, CaraLista> = {
  frente: "frente",
  frontal: "frente",
  front: "frente",
  anverso: "frente",
  f: "frente",
  a: "frente",
  "1": "frente",
  vuelta: "vuelta",
  reverso: "vuelta",
  atras: "vuelta",
  back: "vuelta",
  v: "vuelta",
  r: "vuelta",
  b: "vuelta",
  "2": "vuelta",
};

const sinExtension = (archivo: string) => archivo.replace(/^.*[\\/]/, "").replace(/\.[a-z0-9]{2,5}$/i, "");

/**
 * Separa el nombre de un archivo en la persona y la cara: "0042-vuelta.png"
 * es la vuelta de "0042". Devuelve null si el nombre no termina en una cara.
 */
export function caraDeArchivo(archivo: string): { base: string; cara: CaraLista } | null {
  const partes = sinExtension(archivo).match(/^(.+?)[\s._-]+([a-záé]+|[12])$/i);
  if (!partes) return null;
  const sufijo = partes[2].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const cara = SUFIJOS[sufijo];
  return cara ? { base: partes[1], cara } : null;
}

export const EXTENSIONES_LISTAS = { "image/jpeg": "jpg", "image/png": "png" } as const;
export type TipoListo = keyof typeof EXTENSIONES_LISTAS;

export const rutaGafeteListo = (empresaId: string, empleadoId: string, cara: CaraLista, extension: "jpg" | "png") =>
  `${empresaId}/${empleadoId}-${cara}.${extension}`;

/** Lo que guarda la base de datos de cada cara. */
export type CaraGuardada = { ruta: string; ancho: number; alto: number };

/** Avisos de un gafete completo: los de cada cara y los de las dos juntas. */
export function avisosDeGafete(frente: CaraGuardada | null, vuelta: CaraGuardada | null): string[] {
  const avisos: string[] = [];
  const rf = frente ? revisarGafete(frente.ancho, frente.alto) : null;
  const rv = vuelta ? revisarGafete(vuelta.ancho, vuelta.alto) : null;
  if (!frente) avisos.push("Falta el frente.");
  for (const a of rf?.avisos ?? []) avisos.push(vuelta ? `Frente: ${a}` : a);
  for (const a of rv?.avisos ?? []) avisos.push(`Vuelta: ${a}`);
  if (rf && rv && rf.orientacion !== rv.orientacion) {
    avisos.push("El frente y la vuelta no tienen la misma orientación.");
  }
  return avisos;
}
