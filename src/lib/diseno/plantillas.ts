import {
  type Alineacion,
  type Cara,
  type Elemento,
  type FuenteId,
  nuevoId,
  type Orientacion,
  tamano,
} from "./tipos";

/**
 * Plantillas para empezar un diseño. Cada una acomoda los datos que se eligieron
 * como «impresos» al crear el diseño, en la cara elegida, y después todo se
 * puede mover en el editor.
 */

export type CampoPlantilla = {
  clave: string;
  etiqueta: string;
  tipo: string;
  en_gafete: boolean;
  cara: string;
  orden: number;
};

/** Dónde va impreso un dato en un diseño nuevo. */
export type Impreso = "frente" | "vuelta" | "no";

/** Aplica a los campos lo que se eligió para un diseño: qué va impreso y en qué cara. */
export function conImpresos<T extends CampoPlantilla>(campos: T[], elegidos: Record<string, Impreso>): T[] {
  return campos.map((c) => {
    const v = elegidos[c.clave];
    if (!v) return c;
    return { ...c, en_gafete: v !== "no", cara: v === "no" ? c.cara : v };
  });
}

/** Lo que una empresa tiene elegido de entrada para cada dato. */
export const impresoDe = (c: CampoPlantilla): Impreso => (c.en_gafete ? (c.cara === "vuelta" ? "vuelta" : "frente") : "no");

export const plantillas = [
  { id: "clasica", nombre: "Clásica", descripcion: "Franja de color arriba, foto y datos." },
  { id: "lateral", nombre: "Con color", descripcion: "Bloque de color con la foto encima." },
  { id: "limpia", nombre: "Limpia", descripcion: "Fondo blanco y un acento de color." },
  { id: "blanco", nombre: "En blanco", descripcion: "Empieza de cero o sube tu propio fondo." },
] as const;
export type PlantillaId = (typeof plantillas)[number]["id"];
export const esPlantilla = (v: string): v is PlantillaId => plantillas.some((p) => p.id === v);

const TINTA = "#1b1f3b";
const GRIS = "#5c6178";
const S = 2; // sangrado

/** Blanco o tinta, lo que se lea mejor sobre el color dado. */
export function sobre(color: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6 ? TINTA : "#ffffff";
}

type OpcionesTexto = {
  tam: number;
  negrita?: boolean;
  color?: string;
  alinear?: Alineacion;
  fuente?: FuenteId;
  conEtiqueta?: boolean;
};
const caja = (x: number, y: number, w: number, h: number) => ({ id: nuevoId(), x, y, w, h });
const campo = (clave: string, x: number, y: number, w: number, h: number, o: OpcionesTexto): Elemento => ({
  ...caja(x, y, w, h),
  tipo: "texto",
  campo: clave,
  conEtiqueta: o.conEtiqueta ?? false,
  fuente: o.fuente ?? "inter",
  tam: o.tam,
  negrita: o.negrita ?? false,
  color: o.color ?? TINTA,
  alinear: o.alinear ?? "izquierda",
});
const fijo = (texto: string, x: number, y: number, w: number, h: number, o: OpcionesTexto): Elemento => ({
  ...caja(x, y, w, h),
  tipo: "texto",
  texto,
  fuente: o.fuente ?? "inter",
  tam: o.tam,
  negrita: o.negrita ?? false,
  color: o.color ?? TINTA,
  alinear: o.alinear ?? "izquierda",
});
const forma = (x: number, y: number, w: number, h: number, color: string, radio = 0): Elemento => ({
  ...caja(x, y, w, h),
  tipo: "forma",
  color,
  radio,
});
const foto = (x: number, y: number, w: number, h: number, radio = 2): Elemento => ({ ...caja(x, y, w, h), tipo: "foto", radio });
const qr = (x: number, y: number, lado: number): Elemento => ({ ...caja(x, y, lado, lado), tipo: "qr" });

export function crearDesdePlantilla(
  plantilla: PlantillaId,
  orientacion: Orientacion,
  campos: CampoPlantilla[],
  color: string,
  empresa: string,
): { frente: Cara; vuelta: Cara | null } {
  if (plantilla === "blanco") return { frente: { fondo: "#ffffff", elementos: [] }, vuelta: null };

  const { w: W, h: H } = tamano(orientacion);
  const vertical = orientacion === "vertical";
  const enGafete = campos.filter((c) => c.en_gafete).sort((a, b) => a.orden - b.orden);
  // El nombre es opcional: un diseño genérico (por ejemplo, «Visitante») no lo imprime.
  const conNombre = enGafete.some((c) => c.clave === "nombre");
  const textos = (cara: string) =>
    enGafete.filter((c) => c.cara === cara && (c.tipo === "texto" || c.tipo === "fecha") && c.clave !== "nombre");
  const conFoto = enGafete.some((c) => c.tipo === "foto");
  const caraQr = enGafete.find((c) => c.tipo === "qr")?.cara;
  const qrFrente = caraQr === "frente";
  const maximo = vertical ? (qrFrente ? 1 : 3) : 3;
  const secundarios = textos("frente").slice(0, maximo);
  const sobrantes = textos("frente").slice(maximo);
  const tinta = sobre(color);
  const e: Elemento[] = [];

  /** Renglones de datos debajo del nombre. */
  const renglones = (x: number, y: number, w: number, alinear: Alineacion, paso = 5) =>
    secundarios.forEach((c, i) =>
      e.push(campo(c.clave, x, y + i * paso, w, 4.2, { tam: i === 0 ? 3.4 : 3.1, color: i === 0 ? TINTA : GRIS, alinear })),
    );

  if (plantilla === "clasica") {
    if (vertical) {
      e.push(forma(-S, -S, W + S * 2, 18, color));
      e.push(fijo(empresa, 4, 5, W - 8, 9.5, { tam: 4, negrita: true, color: tinta, alinear: "centro", fuente: "bricolage" }));
      if (conFoto) e.push(foto((W - 26) / 2, 20, 26, 34.7));
      const y = conFoto ? 57.5 : 26;
      e.push(campo("nombre", 4, y, W - 8, 10.6, { tam: 4.4, negrita: true, alinear: "centro", fuente: "bricolage" }));
      renglones(4, y + 11.5, W - 8, "centro", 4.6);
      if (qrFrente) e.push(qr((W - 9) / 2, H - 3.5 - 9, 9));
    } else {
      e.push(forma(-S, -S, W + S * 2, 15, color));
      e.push(fijo(empresa, 5, 3.6, W - 10, 6, { tam: 4.6, negrita: true, color: tinta, fuente: "bricolage" }));
      e.push(forma(-S, H - 2.5, W + S * 2, 2.5 + S, TINTA));
      if (conFoto) e.push(foto(5, 16.5, 22, 29.3));
      const x = conFoto ? 31 : 5;
      const ancho = W - x - 5;
      e.push(campo("nombre", x, 17.5, ancho, 11, { tam: 4.6, negrita: true, fuente: "bricolage" }));
      renglones(x, 30.5, ancho - (qrFrente ? 14 : 0), "izquierda");
      if (qrFrente) e.push(qr(W - 5 - 12, H - 5.5 - 12, 12));
    }
  } else if (plantilla === "lateral") {
    if (vertical) {
      e.push(forma(-S, -S, W + S * 2, 38, color));
      e.push(fijo(empresa, 4, 4.5, W - 8, 8.5, { tam: 3.6, negrita: true, color: tinta, alinear: "centro", fuente: "bricolage" }));
      if (conFoto) e.push(foto((W - 30) / 2, 15, 30, 30, 15));
      const y = conFoto ? 49 : 42;
      e.push(campo("nombre", 4, y, W - 8, 10.6, { tam: 4.4, negrita: true, alinear: "centro", fuente: "bricolage" }));
      e.push(forma((W - 10) / 2, y + 11.6, 10, 0.9, color, 0.45));
      renglones(4, y + 14.5, W - 8, "centro", 4.6);
      if (qrFrente) e.push(qr((W - 9) / 2, H - 3.5 - 9, 9));
    } else {
      e.push(forma(-S, -S, 30 + S, H + S * 2, color));
      if (conFoto) e.push(foto(4, 7, 22, 29.3));
      e.push(fijo(empresa, 3.5, conFoto ? 39 : 8, 23, 11, { tam: 3, negrita: true, color: tinta, alinear: "centro", fuente: "bricolage" }));
      const ancho = W - 34 - 5;
      e.push(campo("nombre", 34, 9, ancho, 12.5, { tam: 5.2, negrita: true, fuente: "bricolage" }));
      e.push(forma(34, 23.5, 12, 0.9, color, 0.45));
      renglones(34, 27.5, ancho - (qrFrente ? 14 : 0), "izquierda");
      if (qrFrente) e.push(qr(W - 5 - 12, H - 5 - 12, 12));
    }
  } else {
    e.push(forma(-S, -S, W + S * 2, 3.4, color));
    if (vertical) {
      e.push(fijo(empresa, 4, 5, W - 8, 4.4, { tam: 3.2, negrita: true, color, alinear: "centro", fuente: "bricolage" }));
      if (conFoto) e.push(foto((W - 30) / 2, 12.5, 30, 40, 3));
      const y = conFoto ? 55.5 : 22;
      e.push(campo("nombre", 4, y, W - 8, 10.6, { tam: 4.4, negrita: true, alinear: "centro", fuente: "bricolage" }));
      renglones(4, y + 11.5, W - 8, "centro", 4.6);
      if (qrFrente) e.push(qr((W - 9) / 2, H - 3.5 - 9, 9));
    } else {
      e.push(fijo(empresa, 5, 5, W - 10, 4.4, { tam: 3.2, negrita: true, color, fuente: "bricolage" }));
      if (conFoto) e.push(foto(W - 5 - 22, 13, 22, 29.3, 3));
      const ancho = W - 10 - (conFoto ? 25 : 0);
      e.push(campo("nombre", 5, 14, ancho, 12, { tam: 5, negrita: true, fuente: "bricolage" }));
      renglones(5, 28.5, ancho, "izquierda");
      if (qrFrente) e.push(qr(5, H - 4 - 8, 8));
    }
  }

  if (!conNombre) {
    const sinNombre = e.filter((x) => !(x.tipo === "texto" && "campo" in x && x.campo === "nombre"));
    e.length = 0;
    e.push(...sinNombre);
  }

  const atras = [...sobrantes, ...textos("vuelta")];
  const qrVuelta = caraQr === "vuelta";
  if (!atras.length && !qrVuelta) return { frente: { fondo: "#ffffff", elementos: e }, vuelta: null };

  const v: Elemento[] = [];
  v.push(forma(-S, -S, W + S * 2, 3.4, color));
  v.push(fijo(empresa, 5, 5, W - 10, 4.6, { tam: 3.4, negrita: true, color, fuente: "bricolage" }));
  const ladoQr = vertical ? 18 : 16;
  const anchoTexto = W - 10 - (qrVuelta && !vertical ? ladoQr + 3 : 0);
  atras.slice(0, vertical ? 8 : 5).forEach((c, i) =>
    v.push(campo(c.clave, 5, 12.5 + i * 5, anchoTexto, 4.2, { tam: 3, conEtiqueta: true })),
  );
  if (qrVuelta) v.push(vertical ? qr((W - ladoQr) / 2, H - 16 - ladoQr, ladoQr) : qr(W - 5 - ladoQr, 12.5, ladoQr));
  v.push(
    fijo("Este gafete es personal e intransferible. Si lo encuentras, por favor devuélvelo.", 5, H - 11.5, W - 10, 7, {
      tam: 2.3,
      color: GRIS,
      alinear: vertical ? "centro" : "izquierda",
    }),
  );
  return { frente: { fondo: "#ffffff", elementos: e }, vuelta: { fondo: "#ffffff", elementos: v } };
}
