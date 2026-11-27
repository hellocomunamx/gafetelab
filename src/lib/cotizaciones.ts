import { materialPara } from "@/lib/materiales";
import { type Cotizacion, cotizar, type Modalidad, modalidades } from "@/lib/precios";
import { clienteServicio } from "@/lib/supabase/publico";
import { dispositivoDe } from "@/lib/visitas";

/** Folio como lo genera `nuevoFolio`, por ejemplo "LG-261127-4F7K". */
export const FOLIO_VALIDO = /^LG-\d{6}-[A-Z0-9]{4}$/;

/**
 * Vuelve a calcular la cotización con lo que manda el navegador: solo se
 * aceptan la cantidad y las opciones, nunca precios.
 */
export function cotizacionDe(cuerpo: Record<string, unknown>): Cotizacion {
  const modalidad = modalidades.some((m) => m.id === cuerpo.modalidad) ? (cuerpo.modalidad as Modalidad) : "impreso";
  return cotizar(Number(cuerpo.cantidad), {
    modalidad,
    dosCaras: cuerpo.dosCaras === true,
    material: materialPara(cuerpo.material).id,
    paquete: Number(cuerpo.paquete) || undefined,
  });
}

const texto = (valor: unknown, largo: number) => {
  if (typeof valor !== "string") return null;
  const limpio = valor.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, largo);
  return limpio || null;
};

/**
 * Guarda la cotización para el panel. Nunca hace fallar la respuesta: si la base
 * no está configurada o algo sale mal, solo se anota en el registro del servidor.
 */
export async function guardarCotizacion(datos: {
  folio: string;
  canal: "pdf" | "correo";
  cotizacion: Cotizacion;
  correo?: string;
  empresa?: string;
  origen: unknown;
  navegador: string;
}) {
  const servicio = clienteServicio();
  if (!servicio || !FOLIO_VALIDO.test(datos.folio)) return;
  const o = datos.origen && typeof datos.origen === "object" ? (datos.origen as Record<string, unknown>) : {};
  const c = datos.cotizacion;
  const { error } = await servicio.from("cotizaciones").upsert(
    {
      folio: datos.folio,
      canal: datos.canal,
      correo: datos.correo ?? null,
      empresa: texto(datos.empresa, 80),
      piezas: c.piezas,
      modalidad: c.modalidad,
      dos_caras: c.dosCaras,
      material: c.material?.id ?? null,
      paquete: c.paquete?.piezas ?? null,
      subtotal: c.subtotal,
      total: c.total,
      origen: texto(o.origen, 100),
      medio: texto(o.medio, 100),
      campana: texto(o.campana, 100),
      termino: texto(o.termino, 100),
      contenido: texto(o.contenido, 100),
      entrada: texto(o.entrada, 200),
      dispositivo: dispositivoDe(datos.navegador),
    },
    { onConflict: "folio", ignoreDuplicates: true },
  );
  if (error) console.error("No se pudo guardar la cotización:", error.message);
}
