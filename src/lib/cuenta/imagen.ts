/** Tamaño al que se guarda cada foto: vertical 3:4, suficiente para imprimir a 300 dpi. */
export const FOTO = { ancho: 600, alto: 800 };

/**
 * Recorta la imagen centrada a 3:4, la reduce y la convierte a JPEG, en el
 * navegador. Respeta la orientación con la que se tomó la foto.
 */
export async function prepararFoto(archivo: Blob): Promise<Blob> {
  const imagen = await createImageBitmap(archivo, { imageOrientation: "from-image" });
  const escala = Math.max(FOTO.ancho / imagen.width, FOTO.alto / imagen.height);
  const ancho = imagen.width * escala;
  const alto = imagen.height * escala;
  const lienzo = document.createElement("canvas");
  lienzo.width = FOTO.ancho;
  lienzo.height = FOTO.alto;
  const ctx = lienzo.getContext("2d");
  if (!ctx) throw new Error("No se pudo preparar la foto.");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, FOTO.ancho, FOTO.alto);
  // Un poco arriba del centro: en un retrato la cara suele quedar en el tercio superior.
  ctx.drawImage(imagen, (FOTO.ancho - ancho) / 2, (FOTO.alto - alto) * 0.35, ancho, alto);
  imagen.close();
  return new Promise((resolver, rechazar) =>
    lienzo.toBlob((b) => (b ? resolver(b) : rechazar(new Error("No se pudo preparar la foto."))), "image/jpeg", 0.86),
  );
}

export const rutaFoto = (empresaId: string, empleadoId: string) => `${empresaId}/${empleadoId}.jpg`;
