import { crearClienteNavegador } from "@/lib/supabase/client";

/**
 * Sube una imagen del diseño (fondo, logo) al almacenamiento privado, ya
 * reducida para que pese poco y siga viéndose bien impresa a 300 dpi.
 * Devuelve su ruta y una liga temporal para mostrarla.
 */
export async function subirImagenDiseno(
  archivo: File,
  empresaId: string,
  ladoMaximo: number,
): Promise<{ ruta: string; url: string; ancho: number; alto: number }> {
  const imagen = await createImageBitmap(archivo, { imageOrientation: "from-image" });
  const escala = Math.min(1, ladoMaximo / Math.max(imagen.width, imagen.height));
  const ancho = Math.round(imagen.width * escala);
  const alto = Math.round(imagen.height * escala);
  const lienzo = document.createElement("canvas");
  lienzo.width = ancho;
  lienzo.height = alto;
  const ctx = lienzo.getContext("2d");
  if (!ctx) throw new Error("No se pudo preparar la imagen.");
  // PNG y WebP pueden traer transparencia (logos): se conservan como PNG.
  const conTransparencia = archivo.type === "image/png" || archivo.type === "image/webp";
  if (!conTransparencia) {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, ancho, alto);
  }
  ctx.drawImage(imagen, 0, 0, ancho, alto);
  imagen.close();
  const tipo = conTransparencia ? "image/png" : "image/jpeg";
  const contenido = await new Promise<Blob>((resolver, rechazar) =>
    lienzo.toBlob((b) => (b ? resolver(b) : rechazar(new Error("No se pudo preparar la imagen."))), tipo, 0.9),
  );
  if (contenido.size > 5 * 1024 * 1024) throw new Error("La imagen pesa demasiado. Prueba con una más chica.");

  const supabase = crearClienteNavegador();
  const ruta = `${empresaId}/${crypto.randomUUID()}.${conTransparencia ? "png" : "jpg"}`;
  const { error } = await supabase.storage.from("disenos").upload(ruta, contenido, { contentType: tipo });
  if (error) throw new Error("No pudimos subir la imagen. Intenta de nuevo.");
  const { data } = await supabase.storage.from("disenos").createSignedUrl(ruta, 3600);
  if (!data?.signedUrl) throw new Error("No pudimos subir la imagen. Intenta de nuevo.");
  return { ruta, url: data.signedUrl, ancho, alto };
}
