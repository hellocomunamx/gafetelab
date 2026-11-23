const ES_IMAGEN = /\.(jpe?g|png|webp)$/i;
const TIPOS: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

export type ImagenSuelta = { archivo: string; contenido: Blob };

/** Saca las imágenes de lo que la persona soltó: archivos sueltos o un ZIP con ellos. */
export async function extraerImagenes(archivos: File[]): Promise<ImagenSuelta[]> {
  const imagenes: ImagenSuelta[] = [];
  for (const a of archivos) {
    if (/\.zip$/i.test(a.name)) {
      const { unzipSync } = await import("fflate");
      const contenido = unzipSync(new Uint8Array(await a.arrayBuffer()), {
        filter: (f) => ES_IMAGEN.test(f.name) && !/(^|\/)(__MACOSX|\.)/.test(f.name),
      });
      for (const [ruta, bytes] of Object.entries(contenido)) {
        const nombre = ruta.split("/").pop()!;
        const tipo = TIPOS[nombre.split(".").pop()!.toLowerCase()];
        imagenes.push({ archivo: nombre, contenido: new Blob([bytes as BlobPart], { type: tipo }) });
      }
    } else if (ES_IMAGEN.test(a.name)) {
      imagenes.push({ archivo: a.name, contenido: a });
    }
  }
  return imagenes;
}
