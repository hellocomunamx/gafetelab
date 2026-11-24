import type { Categoria } from "@/lib/eventos";
import { type CampoPlantilla, sobre } from "./plantillas";
import { type Cara, type Elemento, nuevoId, tamano } from "./tipos";

/**
 * Plantilla de evento, vertical: franja de color arriba con el nombre del
 * evento, el nombre de la persona en grande, su cargo e institución, y una
 * franja abajo con la categoría, del mismo color que su cordón. Atrás, el QR
 * de acceso con las fechas. Se crea una por categoría y después se puede
 * cambiar todo en el editor.
 */

const TINTA = "#1b1f3b";
const GRIS = "#5c6178";
const S = 2; // margen de corte

const caja = (x: number, y: number, w: number, h: number) => ({ id: nuevoId(), x, y, w, h });

function texto(
  x: number,
  y: number,
  w: number,
  h: number,
  o: { campo?: string; texto?: string; tam: number; negrita?: boolean; color?: string; mayusculas?: boolean },
): Elemento {
  return {
    ...caja(x, y, w, h),
    tipo: "texto",
    ...(o.campo ? { campo: o.campo } : { texto: o.texto ?? "" }),
    fuente: o.negrita ? "bricolage" : "inter",
    tam: o.tam,
    negrita: o.negrita ?? false,
    mayusculas: o.mayusculas ?? false,
    color: o.color ?? TINTA,
    alinear: "centro",
  };
}

const forma = (x: number, y: number, w: number, h: number, color: string, radio = 0): Elemento => ({
  ...caja(x, y, w, h),
  tipo: "forma",
  color,
  radio,
});

export function disenoDeEvento(opciones: {
  evento: string;
  /** "12 al 14 de marzo de 2027". */
  fechas: string;
  sede: string | null;
  categoria: Categoria;
  campos: CampoPlantilla[];
}): { frente: Cara; vuelta: Cara | null } {
  const { evento, fechas, sede, categoria, campos } = opciones;
  const { w: W, h: H } = tamano("vertical");
  const color = categoria.color;
  const tinta = sobre(color);
  const enGafete = campos.filter((c) => c.en_gafete).sort((a, b) => a.orden - b.orden);
  const conFoto = enGafete.some((c) => c.tipo === "foto");
  const conQr = enGafete.some((c) => c.tipo === "qr");
  const conNombre = enGafete.some((c) => c.clave === "nombre");
  // La categoría va en su franja; el resto de los datos, debajo del nombre.
  const renglones = enGafete
    .filter((c) => (c.tipo === "texto" || c.tipo === "fecha") && c.clave !== "nombre" && c.clave !== "categoria")
    .slice(0, conFoto ? 1 : 3);

  const e: Elemento[] = [];
  e.push(forma(-S, -S, W + S * 2, 19, color));
  e.push(texto(4, 4.5, W - 8, 10, { texto: evento, tam: 3.8, negrita: true, color: tinta }));
  if (conFoto) e.push({ ...caja((W - 22) / 2, 21, 22, 29.3), tipo: "foto", radio: 2 });
  const y = conFoto ? 53 : 27;
  if (conNombre) e.push(texto(4, y, W - 8, 12, { campo: "nombre", tam: 5, negrita: true }));
  renglones.forEach((c, i) =>
    e.push(texto(4, y + 13 + i * 5, W - 8, 4.4, { campo: c.clave, tam: i === 0 ? 3.4 : 3.1, color: i === 0 ? TINTA : GRIS })),
  );
  e.push(forma(-S, H - 13, W + S * 2, 13 + S, color));
  e.push(texto(4, H - 10.6, W - 8, 7, { texto: categoria.nombre, tam: 4.6, negrita: true, mayusculas: true, color: tinta }));

  if (!conQr) return { frente: { fondo: "#ffffff", elementos: e }, vuelta: null };

  const v: Elemento[] = [];
  v.push(forma(-S, -S, W + S * 2, 5.4, color));
  v.push(texto(4, 7, W - 8, 9, { texto: evento, tam: 3.4, negrita: true }));
  v.push(texto(4, 16.5, W - 8, 4, { texto: fechas, tam: 2.8, color: GRIS }));
  if (sede) v.push(texto(4, 20.5, W - 8, 4, { texto: sede, tam: 2.6, color: GRIS }));
  const lado = 30;
  v.push({ ...caja((W - lado) / 2, 28, lado, lado), tipo: "qr" });
  v.push(texto(4, 61, W - 8, 4.4, { texto: "Acceso personal", tam: 3.4, negrita: true }));
  v.push(texto(5, 66.5, W - 10, 7, { texto: "Preséntalo en la entrada. Es personal e intransferible.", tam: 2.4, color: GRIS }));
  v.push(forma(-S, H - 5, W + S * 2, 5 + S, color));
  return { frente: { fondo: "#ffffff", elementos: e }, vuelta: { fondo: "#ffffff", elementos: v } };
}
