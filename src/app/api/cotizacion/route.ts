import { correoActivo, enviarCorreo } from "@/lib/correo";
import { condiciones, fechaLarga, nuevoFolio, renglones, totales } from "@/lib/cotizacion";
import { materialPara } from "@/lib/materiales";
import { cotizar, type Modalidad, modalidades } from "@/lib/precios";
import { site, urlAbsoluta } from "@/lib/site";
import { CORREO_VALIDO, error, esBot, escapar, leerCuerpo, mismoOrigen } from "@/lib/solicitudes";

/**
 * Envía la cotización al correo de quien la pide, con copia oculta a ventas.
 * El importe se vuelve a calcular aquí: del navegador solo se aceptan la
 * cantidad y las opciones, nunca precios.
 */
export async function POST(solicitud: Request) {
  if (!mismoOrigen(solicitud)) return error("Origen no permitido.", 403);

  const cuerpo = await leerCuerpo(solicitud);
  if (!cuerpo) return error("Solicitud inválida.", 400);
  if (esBot(cuerpo)) return Response.json({ ok: true });

  const correo = String(cuerpo.correo ?? "").trim().toLowerCase();
  if (correo.length > 254 || !CORREO_VALIDO.test(correo)) {
    return error("Escribe un correo válido.", 400);
  }

  const modalidad = modalidades.some((m) => m.id === cuerpo.modalidad)
    ? (cuerpo.modalidad as Modalidad)
    : "impreso";
  const empresa = String(cuerpo.empresa ?? "").trim().slice(0, 80);
  const cotizacion = cotizar(Number(cuerpo.cantidad), {
    modalidad,
    dosCaras: cuerpo.dosCaras === true,
    material: materialPara(cuerpo.material).id,
    paquete: Number(cuerpo.paquete) || undefined,
  });

  if (!correoActivo()) {
    return error(
      "El envío por correo todavía no está activo. Mientras tanto, descarga el PDF.",
      503,
    );
  }

  const datos = {
    cotizacion,
    folio: nuevoFolio(),
    fecha: new Date().toISOString().slice(0, 10),
    empresa: empresa || undefined,
  };
  const filas = renglones(cotizacion);
  const sumas = totales(cotizacion);
  const notas = condiciones(datos);
  const celda = "padding:10px 12px;border-bottom:1px solid #DCDFEA;font-size:14px;";

  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#EEF0F5;font-family:Arial,Helvetica,sans-serif;color:#1B1F3B;">
<div style="max-width:600px;margin:0 auto;padding:24px;">
<div style="background:#fff;border-radius:14px;overflow:hidden;">
<div style="background:#E63B2E;color:#fff;padding:20px 24px;">
<p style="margin:0;font-size:20px;font-weight:bold;">${escapar(site.nombre)}</p>
<p style="margin:4px 0 0;font-size:14px;">Cotización ${datos.folio} · ${fechaLarga(datos.fecha)}</p>
</div>
<div style="padding:24px;">
${empresa ? `<p style="margin:0 0 16px;font-size:14px;color:#5C6178;">Preparada para <strong style="color:#1B1F3B;">${escapar(empresa)}</strong></p>` : ""}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
<tr style="background:#EEF0F5;"><th align="left" style="${celda}">Concepto</th><th align="right" style="${celda}">Cantidad</th><th align="right" style="${celda}">Por pieza</th><th align="right" style="${celda}">Importe</th></tr>
${filas.map((f) => `<tr><td style="${celda}">${escapar(f.concepto)}</td><td align="right" style="${celda}">${f.cantidad}</td><td align="right" style="${celda}">${f.porPieza}</td><td align="right" style="${celda}">${f.importe}</td></tr>`).join("")}
${sumas.map((s) => `<tr><td colspan="3" align="right" style="padding:8px 12px;font-size:${s.fuerte ? 18 : 14}px;${s.fuerte ? "font-weight:bold;" : "color:#5C6178;"}">${s.etiqueta}</td><td align="right" style="padding:8px 12px;font-size:${s.fuerte ? 18 : 14}px;${s.fuerte ? "font-weight:bold;" : ""}">${s.valor}</td></tr>`).join("")}
</table>
<ul style="margin:20px 0 0;padding-left:18px;font-size:13px;line-height:1.5;color:#5C6178;">
${notas.map((n) => `<li>${escapar(n)}</li>`).join("")}
</ul>
<p style="margin:24px 0 0;"><a href="${urlAbsoluta("/cotizar")}" style="display:inline-block;background:#E63B2E;color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px;font-size:14px;">Ajustar mi cotización</a></p>
</div></div>
<p style="font-size:12px;color:#5C6178;text-align:center;margin:16px 0 0;">Recibes este correo porque pediste tu cotización en ${site.dominio}. Si tienes dudas, responde a este mensaje.</p>
</div></body></html>`;

  const texto = [
    `${site.nombre}: cotización ${datos.folio} (${fechaLarga(datos.fecha)})`,
    empresa ? `Preparada para ${empresa}` : "",
    "",
    ...filas.map((f) => `${f.concepto}: ${f.cantidad} × ${f.porPieza} = ${f.importe}`),
    ...sumas.map((s) => `${s.etiqueta}: ${s.valor}`),
    "",
    ...notas.map((n) => `- ${n}`),
    "",
    urlAbsoluta("/cotizar"),
  ]
    .filter((l, i, todas) => l !== "" || todas[i - 1] !== "")
    .join("\n");

  const resultado = await enviarCorreo({
    para: correo,
    copiaOculta: site.correo,
    asunto: cotizacion.paquete
      ? `Tu cotización del paquete de ${cotizacion.piezas} gafetes en ${site.nombre}`
      : `Tu cotización de ${cotizacion.piezas} gafetes en ${site.nombre}`,
    html,
    texto,
  });

  if (resultado.error) {
    console.error("No se pudo enviar la cotización:", resultado.error);
    return error("No pudimos enviar el correo. Intenta de nuevo o descarga el PDF.", 502);
  }
  return Response.json({ ok: true, folio: datos.folio });
}
