/** Tamaño al que se guarda cada foto: vertical 3:4, suficiente para imprimir a 300 dpi. */
export const FOTO = { ancho: 600, alto: 800 };

/** Acercamiento máximo sobre la foto ya ajustada al recuadro. */
export const ZOOM_MAXIMO = 4;

/**
 * Cómo se acomoda la foto dentro del recuadro del gafete, en pixeles de la foto
 * final (600 × 800): `x` y `y` son la esquina superior izquierda de la imagen y
 * `zoom` va de 1 (la imagen apenas cubre el recuadro) a ZOOM_MAXIMO. Como no
 * depende de la resolución de la imagen, sirve igual para una copia reducida
 * (la del editor) que para el archivo original.
 */
export type Encuadre = { x: number; y: number; zoom: number };

type Medidas = { width: number; height: number };

/** Tamaño de la imagen dentro de la foto final con ese zoom. */
export function medidaEnFoto(imagen: Medidas, zoom: number) {
  const base = Math.max(FOTO.ancho / imagen.width, FOTO.alto / imagen.height);
  return { ancho: imagen.width * base * zoom, alto: imagen.height * base * zoom };
}

/** Mantiene el zoom en rango y evita que quede un hueco blanco en el recuadro. */
export function limitarEncuadre(imagen: Medidas, encuadre: Encuadre): Encuadre {
  const zoom = Math.min(ZOOM_MAXIMO, Math.max(1, encuadre.zoom));
  const { ancho, alto } = medidaEnFoto(imagen, zoom);
  return {
    zoom,
    x: Math.min(0, Math.max(FOTO.ancho - ancho, encuadre.x)),
    y: Math.min(0, Math.max(FOTO.alto - alto, encuadre.y)),
  };
}

/** Centrada a lo ancho y un poco arriba: en un retrato la cara suele quedar en el tercio superior. */
export function encuadreInicial(imagen: Medidas): Encuadre {
  const { ancho, alto } = medidaEnFoto(imagen, 1);
  return { zoom: 1, x: (FOTO.ancho - ancho) / 2, y: (FOTO.alto - alto) * 0.35 };
}

/** Cambia el zoom dejando fijo el punto (de la foto final) que está bajo el dedo o el cursor. */
export function acercar(imagen: Medidas, encuadre: Encuadre, zoom: number, punto = { x: FOTO.ancho / 2, y: FOTO.alto / 2 }): Encuadre {
  const nuevo = Math.min(ZOOM_MAXIMO, Math.max(1, zoom));
  const factor = nuevo / encuadre.zoom;
  return limitarEncuadre(imagen, {
    zoom: nuevo,
    x: punto.x - (punto.x - encuadre.x) * factor,
    y: punto.y - (punto.y - encuadre.y) * factor,
  });
}

/**
 * Dibuja la imagen con su encuadre. `origen` y `escala` pasan de pixeles de la
 * foto final a pixeles del lienzo: así el editor y la foto final usan el mismo
 * dibujo. El espejo voltea la imagen sin mover el encuadre.
 */
export function pintarFoto(
  ctx: CanvasRenderingContext2D,
  imagen: CanvasImageSource & Medidas,
  encuadre: Encuadre,
  { espejo = false, origen = { x: 0, y: 0 }, escala = 1 }: { espejo?: boolean; origen?: { x: number; y: number }; escala?: number } = {},
) {
  const { ancho, alto } = medidaEnFoto(imagen, encuadre.zoom);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.translate(origen.x + (encuadre.x + ancho / 2) * escala, origen.y + (encuadre.y + alto / 2) * escala);
  if (espejo) ctx.scale(-1, 1);
  ctx.drawImage(imagen, (-ancho / 2) * escala, (-alto / 2) * escala, ancho * escala, alto * escala);
  ctx.restore();
}

/** Abre la imagen respetando la orientación con la que se tomó. */
export async function abrirImagen(archivo: Blob | ImageBitmap): Promise<ImageBitmap> {
  return archivo instanceof Blob ? createImageBitmap(archivo, { imageOrientation: "from-image" }) : archivo;
}

/**
 * Copia reducida para el editor: mover una foto de 48 megapixeles en cada
 * cuadro sería lento en un celular. Con 2,400 px del lado mayor alcanza para
 * el zoom máximo sin perder calidad en la foto final.
 */
export async function copiaParaEditar(archivo: Blob | ImageBitmap): Promise<ImageBitmap> {
  const imagen = await abrirImagen(archivo);
  const lado = 2400;
  const factor = Math.min(1, lado / Math.max(imagen.width, imagen.height));
  if (factor === 1) return imagen;
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.round(imagen.width * factor);
  lienzo.height = Math.round(imagen.height * factor);
  const ctx = lienzo.getContext("2d");
  if (!ctx) throw new Error("No se pudo abrir la foto.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
  if (archivo instanceof Blob) imagen.close();
  return createImageBitmap(lienzo);
}

/**
 * Recorta la imagen a 3:4 con el encuadre elegido (o centrada, si no hay), la
 * reduce y la convierte a JPEG, en el navegador.
 */
export async function prepararFoto(
  archivo: Blob | ImageBitmap,
  opciones: { espejo?: boolean; encuadre?: Encuadre } = {},
): Promise<Blob> {
  const imagen = await abrirImagen(archivo);
  const encuadre = limitarEncuadre(imagen, opciones.encuadre ?? encuadreInicial(imagen));
  const lienzo = document.createElement("canvas");
  lienzo.width = FOTO.ancho;
  lienzo.height = FOTO.alto;
  const ctx = lienzo.getContext("2d");
  if (!ctx) throw new Error("No se pudo preparar la foto.");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, FOTO.ancho, FOTO.alto);
  // Voltear: algunas cámaras frontales guardan la selfie en espejo.
  pintarFoto(ctx, imagen, encuadre, { espejo: opciones.espejo });
  // Solo se cierra la imagen que se abrió aquí; la de la cámara se puede volver a usar.
  if (archivo instanceof Blob) imagen.close();
  return new Promise((resolver, rechazar) =>
    lienzo.toBlob((b) => (b ? resolver(b) : rechazar(new Error("No se pudo preparar la foto."))), "image/jpeg", 0.86),
  );
}

export const rutaFoto = (empresaId: string, empleadoId: string) => `${empresaId}/${empleadoId}.jpg`;
