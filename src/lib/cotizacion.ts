/**
 * Datos comunes de una cotización: lo que muestran el cotizador, el PDF y el
 * correo sale de aquí, para que los tres digan exactamente lo mismo.
 */
import { grosorTexto } from "./materiales";
import {
  type Cotizacion,
  envio,
  nombreModalidad,
  paqueteVigenciaMeses,
  pesos,
  tasaIva,
} from "./precios";
import { entregaTexto, site } from "./site";

export type DatosCotizacion = {
  cotizacion: Cotizacion;
  folio: string;
  /** Fecha de emisión en ISO (AAAA-MM-DD). */
  fecha: string;
  empresa?: string;
};

/** Folio corto para citar la cotización, por ejemplo "LG-261121-4F7K". */
export function nuevoFolio(ahora = new Date()): string {
  const d = ahora.toISOString().slice(2, 10).replace(/-/g, "");
  const letras = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let azar = "";
  for (let i = 0; i < 4; i++) azar += letras[Math.floor(Math.random() * letras.length)];
  return `LG-${d}-${azar}`;
}

export function fechaLarga(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function vigenciaHasta(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + site.vigenciaCotizacionDias);
  return d.toISOString().slice(0, 10);
}

/** Renglones del desglose: concepto, cantidad, precio por pieza e importe. */
export function renglones(c: Cotizacion) {
  return c.conceptos.map((x) => ({
    concepto: x.nombre,
    cantidad: c.piezas,
    porPieza: pesos(x.porPieza),
    importe: pesos(x.porPieza * c.piezas),
  }));
}

/** Totales en orden: subtotal, envío, IVA y total. */
export function totales(c: Cotizacion) {
  const filas = [{ etiqueta: "Subtotal", valor: pesos(c.subtotal), fuerte: false }];
  if (c.paquete) {
    filas.push({ etiqueta: `${c.paquete.envios} envíos a todo México`, valor: "Incluidos", fuerte: false });
  } else if (c.llevaEnvio) {
    filas.push({
      etiqueta: "Envío a todo México",
      valor: c.envioGratis ? "Gratis" : pesos(c.envio),
      fuerte: false,
    });
  }
  filas.push({ etiqueta: `IVA (${tasaIva * 100}%)`, valor: pesos(c.iva), fuerte: false });
  filas.push({ etiqueta: "Total", valor: pesos(c.total), fuerte: true });
  return filas;
}

/** Condiciones que acompañan a toda cotización. */
export function condiciones(d: DatosCotizacion): string[] {
  const c = d.cotizacion;
  const lista = [
    `Modalidad: ${nombreModalidad(c.modalidad)}${c.llevaEnvio ? (c.dosCaras ? ", impresión por frente y vuelta" : ", impresión a una cara") : ""}.`,
  ];
  if (c.material) lista.push(`Material: ${c.material.nombre}, ${grosorTexto(c.material)}, tamaño CR80.`);
  if (c.paquete) {
    lista.push(
      `Paquete prepagado: pagas hoy los ${c.paquete.piezas} gafetes y los pides cuando quieras, en uno o varios pedidos, durante ${paqueteVigenciaMeses} meses. Incluye ${c.paquete.envios} envíos a todo México.`,
    );
    lista.push(`Cada pedido se entrega en ${entregaTexto} a partir de que apruebas la vista previa de tus gafetes.`);
    lista.push("Los paquetes no son reembolsables y se pueden transferir a la cuenta de otra empresa.");
  } else if (c.llevaEnvio) {
    lista.push(
      `Entrega estándar: ${entregaTexto} a partir de que confirmas el pago y apruebas la vista previa de tus gafetes.`,
    );
    lista.push(
      envio.gratisDesde > 0
        ? `Envíos a todo México con tarifa única de ${pesos(envio.tarifa)}; gratis en pedidos desde ${pesos(envio.gratisDesde)} antes de IVA.`
        : "Envíos a todo México sin costo.",
    );
  } else {
    lista.push("Los gafetes digitales se activan en tu plataforma; no llevan envío.");
  }
  lista.push("Pago único por gafete, impreso o digital: no hay suscripción, mensualidades ni cobros recurrentes.");
  lista.push(
    `Precios en pesos mexicanos. La factura (CFDI) se pide ${site.plazoFactura} y no se puede modificar una vez emitida.`,
  );
  lista.push(
    `Cotización vigente hasta el ${fechaLarga(vigenciaHasta(d.fecha))}.`,
  );
  return lista;
}

export function nombreArchivo(d: DatosCotizacion): string {
  return `cotizacion-lagafeteria-${d.folio}.pdf`;
}
