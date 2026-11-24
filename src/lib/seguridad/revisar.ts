import { after } from "next/server";
import { clienteServicio } from "@/lib/supabase/publico";
import { esImagen, pdfPeligroso, quitarMetadatosJpeg, TIPOS_POR_ALMACEN, tipoReal } from "./archivos";
import { moderacion, moderacionActiva, moderarImagen, type Origen, type ResultadoModeracion } from "./moderacion";

export type Archivo = { bucket: string; ruta: string; origen: Origen };

/** De qué parte del sitio viene un archivo, por su almacén y su ruta. */
export function origenDe(bucket: string, ruta: string): Origen {
  if (bucket === "fotos") return ruta.includes("/pendientes/") ? "liga" : "foto";
  if (bucket === "disenos") return "diseno";
  if (bucket === "gafetes") return "gafete";
  return "verificacion";
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const empresaDe = (ruta: string) => {
  const primera = ruta.split("/")[0];
  return UUID.test(primera) ? primera : null;
};

type Servicio = NonNullable<ReturnType<typeof clienteServicio>>;

/** ¿Cuántas imágenes se han mandado al modelo este mes? */
async function revisadasEsteMes(servicio: Servicio): Promise<number> {
  const inicio = new Date();
  inicio.setUTCDate(1);
  inicio.setUTCHours(0, 0, 0, 0);
  const { count } = await servicio
    .from("revision_archivos")
    .select("id", { count: "exact", head: true })
    .not("modelo", "is", null)
    .gte("revisado_en", inicio.toISOString());
  return count ?? 0;
}

/**
 * Revisa un archivo ya subido:
 * 1. Que su contenido real sea del tipo que acepta su almacén; si no, se borra.
 * 2. Que un PDF no traiga código ni archivos incrustados; si los trae, se borra.
 * 3. A un JPEG se le quitan los metadatos (ubicación GPS, celular).
 * 4. Una imagen pasa por la moderación automática: si duda o la marca, queda retenida.
 */
async function revisarUno(servicio: Servicio, a: Archivo, quedanEnTope: { n: number }) {
  const guardar = (cambios: Record<string, unknown>) =>
    servicio.from("revision_archivos").upsert(
      {
        bucket: a.bucket,
        ruta: a.ruta,
        empresa_id: empresaDe(a.ruta),
        origen: a.origen,
        revisado_en: new Date().toISOString(),
        resuelto_en: null,
        resuelto_por: null,
        ...cambios,
      } as never,
      { onConflict: "bucket,ruta" },
    );

  const { data: blob } = await servicio.storage.from(a.bucket).download(a.ruta);
  if (!blob) {
    await servicio.from("revision_archivos").delete().eq("bucket", a.bucket).eq("ruta", a.ruta);
    return;
  }
  let bytes: Uint8Array = new Uint8Array(await blob.arrayBuffer());
  const tipo = tipoReal(bytes);
  const base = { tipo_real: tipo, peso: bytes.length };

  const permitidos = TIPOS_POR_ALMACEN[a.bucket] ?? [];
  if (!permitidos.includes(tipo)) {
    await servicio.storage.from(a.bucket).remove([a.ruta]);
    await guardar({ ...base, estado: "rechazado", categorias: [], modelo: null, motivo: `Se borró: el contenido real es «${tipo}», no una imagen o PDF válido.` });
    return;
  }
  if (tipo === "pdf") {
    const peligro = pdfPeligroso(bytes);
    if (peligro) {
      await servicio.storage.from(a.bucket).remove([a.ruta]);
      await guardar({ ...base, estado: "rechazado", categorias: [], modelo: null, motivo: `Se borró: ${peligro}` });
      return;
    }
    await guardar({ ...base, estado: "aprobado", categorias: [], modelo: null, motivo: null });
    return;
  }

  if (tipo === "jpeg") {
    const limpio = quitarMetadatosJpeg(bytes);
    if (limpio) {
      const { error } = await servicio.storage.from(a.bucket).upload(a.ruta, limpio, { contentType: "image/jpeg", upsert: true });
      if (!error) bytes = limpio;
    }
  }

  if (!esImagen(tipo) || !moderacionActiva() || quedanEnTope.n <= 0) {
    await guardar({
      ...base,
      estado: "aprobado",
      categorias: [],
      modelo: null,
      motivo: moderacionActiva() ? "Sin revisión automática: se llegó al tope del mes." : null,
    });
    return;
  }
  quedanEnTope.n -= 1;
  const r = await moderarImagen(bytes, tipo as "jpeg" | "png" | "webp", a.origen);
  await guardar({ ...base, ...comoFila(r) });
}

const comoFila = (r: ResultadoModeracion) => ({
  estado: r.veredicto === "ok" ? "aprobado" : "retenido",
  categorias: r.categorias,
  motivo: r.motivo || null,
  modelo: r.modelo,
});

/** Revisa varios archivos, de tres en tres. No lanza errores: los anota en el registro. */
export async function revisarArchivos(archivos: Archivo[], { soloNuevos = false } = {}): Promise<void> {
  const servicio = clienteServicio();
  if (!servicio || !archivos.length) return;
  let lista = archivos.filter((a) => a.ruta && a.bucket in TIPOS_POR_ALMACEN);
  if (soloNuevos && lista.length) {
    // Rutas que no se reutilizan (diseños): lo que ya se revisó no se vuelve a mandar.
    const { data } = await servicio
      .from("revision_archivos")
      .select("bucket, ruta")
      .in("ruta", lista.map((a) => a.ruta));
    const vistos = new Set((data ?? []).map((r) => `${r.bucket}/${r.ruta}`));
    lista = lista.filter((a) => !vistos.has(`${a.bucket}/${a.ruta}`));
  }
  if (!lista.length) return;
  const tope = { n: moderacion.topeMensual - (await revisadasEsteMes(servicio)) };
  let i = 0;
  await Promise.all(
    Array.from({ length: 3 }, async () => {
      while (i < lista.length) {
        const a = lista[i++];
        try {
          await revisarUno(servicio, a, tope);
        } catch (e) {
          console.error("Revisión de archivo:", a.bucket, a.ruta, e);
        }
      }
    }),
  );
}

/**
 * Revisa después de responder, para que nadie espere: en Cloudflare corre con
 * waitUntil. Úsala justo después de guardar las rutas de lo que se subió.
 */
export function revisarDespues(archivos: Archivo[], opciones?: { soloNuevos?: boolean }): void {
  if (!archivos.length) return;
  after(() => revisarArchivos(archivos, opciones));
}

/** Revisa lo que se subió directo al almacenamiento y nunca pasó por el sitio. */
export async function revisarHuerfanos(limite = 30): Promise<number> {
  const servicio = clienteServicio();
  if (!servicio) return 0;
  const { data } = await servicio.rpc("archivos_por_revisar", { p_limite: limite });
  const lista = (data ?? []).map((f) => ({ bucket: f.bucket, ruta: f.ruta, origen: origenDe(f.bucket, f.ruta) }));
  await revisarArchivos(lista);
  return lista.length;
}

/**
 * Para la foto que llega por la liga pública: revisa en el momento, antes de
 * guardarla. Devuelve el veredicto para rechazarla si es claramente inapropiada.
 */
export async function moderarAlMomento(bytes: Uint8Array, origen: Origen): Promise<ResultadoModeracion | null> {
  const tipo = tipoReal(bytes);
  if (!esImagen(tipo) || !moderacionActiva()) return null;
  const servicio = clienteServicio();
  if (servicio && (await revisadasEsteMes(servicio)) >= moderacion.topeMensual) return null;
  return moderarImagen(bytes, tipo as "jpeg" | "png" | "webp", origen);
}

/** Anota el resultado de una revisión hecha al momento (para que no se repita). */
export async function anotarRevision(bucket: string, ruta: string, origen: Origen, bytes: Uint8Array, r: ResultadoModeracion | null) {
  const servicio = clienteServicio();
  if (!servicio) return;
  await servicio.from("revision_archivos").upsert(
    {
      bucket,
      ruta,
      origen,
      empresa_id: empresaDe(ruta),
      tipo_real: tipoReal(bytes),
      peso: bytes.length,
      revisado_en: new Date().toISOString(),
      resuelto_en: null,
      resuelto_por: null,
      ...(r ? comoFila(r) : { estado: "aprobado", categorias: [], motivo: null, modelo: null }),
    } as never,
    { onConflict: "bucket,ruta" },
  );
}

