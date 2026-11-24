import { site, urlAbsoluta } from "@/lib/site";
import { escapar } from "@/lib/solicitudes";

/**
 * Correos que recibe quien hizo el pedido en cada cambio de estado: recibido,
 * en producción, listo para enviarse, enviado y entregado. Solo arman el
 * correo; quien lo manda es `avisarCliente` en `servidor.ts`.
 */

export type EtapaCorreo = "recibido" | "en_produccion" | "listo" | "enviado" | "entregado";

/** Lo mínimo del pedido que necesitan los correos. */
export type PedidoCorreo = {
  id: string;
  folio: string;
  piezas: number;
  tipo: string;
  modalidad: string;
  paqueteria?: string | null;
  guia?: string | null;
};

export type ExtrasCorreo = {
  /** Liga de rastreo de la paquetería (correo de enviado). */
  rastreo?: string | null;
  /** En pedidos con gafetes digitales: si ya quedaron activos al confirmarse el pago. */
  digitalesActivos?: boolean;
};

/** Los pasos que se pintan en el correo, en orden. */
const PASOS: { etapa: EtapaCorreo; nombre: string }[] = [
  { etapa: "recibido", nombre: "Recibido" },
  { etapa: "en_produccion", nombre: "En producción" },
  { etapa: "listo", nombre: "Listo" },
  { etapa: "enviado", nombre: "Enviado" },
  { etapa: "entregado", nombre: "Entregado" },
];

const ROJO = "#E63B2E";
const TINTA = "#1B1F3B";
const GRIS = "#5C6178";
const PAPEL = "#EEF0F5";
const LINEA = "#DCDFEA";
const RESALTADOR = "#FFD23F";

const gafetes = (n: number, digitales = false) =>
  n === 1 ? `1 gafete${digitales ? " digital" : ""}` : `${n.toLocaleString("es-MX")} gafetes y credenciales${digitales ? " digitales" : ""}`;
/** «tus 25 gafetes y credenciales» o «tu gafete». */
const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const tus = (n: number) => (n === 1 ? "tu gafete" : `tus ${gafetes(n)}`);

type Contenido = {
  asunto: string;
  titulo: string;
  parrafos: string[];
  boton?: { texto: string; liga: string };
  /** Pinta la barra de avance. No va en compras de saldo ni en pedidos solo digitales. */
  avance: boolean;
};

function contenido(etapa: EtapaCorreo, p: PedidoCorreo, extras: ExtrasCorreo): Contenido {
  const uno = p.piezas === 1;
  const pedido = urlAbsoluta(`/cuenta/pedidos/${p.id}`);
  const verPedido = { texto: "Ver mi pedido", liga: pedido };

  switch (etapa) {
    case "recibido": {
      if (p.tipo === "prepago") {
        return {
          asunto: `Compra ${p.folio} recibida`,
          titulo: "¡Listo! Tus gafetes ya están en tu saldo",
          parrafos: [
            `Recibimos tu pago: ${p.piezas === 1 ? "el gafete" : `los ${gafetes(p.piezas)}`} de tu compra ${p.folio} ya ${p.piezas === 1 ? "está" : "están"} en el saldo de tu empresa.`,
            "Úsalos cuando quieras: sube a tu equipo, elige o crea tu diseño y haz tu pedido. Los gafetes salen de tu saldo, sin volver a pagar.",
          ],
          boton: { texto: "Hacer mi pedido", liga: urlAbsoluta("/cuenta/pedidos/nuevo") },
          avance: false,
        };
      }
      if (p.modalidad === "digital") {
        return {
          asunto: `Pedido ${p.folio} recibido`,
          titulo: "¡Recibimos tu pedido!",
          parrafos: [
            `¡Gracias! Tu pedido ${p.folio} de ${gafetes(p.piezas, true)} quedó confirmado.`,
            extras.digitalesActivos
              ? uno
                ? "El gafete ya quedó activo: si la persona tiene correo, ya recibió su liga; si no, la encuentras en tu cuenta para mandarla por WhatsApp."
                : "Los gafetes ya quedaron activos: cada persona con correo recibió la liga de su gafete, y las demás ligas las encuentras en tu cuenta para mandarlas por WhatsApp."
              : uno
                ? "Le damos una revisada rápida y, en cuanto lo activemos, la persona recibe la liga de su gafete si tiene correo. Si no, la encuentras en tu cuenta."
                : "Le damos una revisada rápida y, en cuanto los activemos, cada persona con correo recibe la liga de su gafete. Las demás ligas las encuentras en tu cuenta.",
          ],
          boton: verPedido,
          avance: false,
        };
      }
      return {
        asunto: `Pedido ${p.folio} recibido`,
        titulo: "¡Recibimos tu pedido!",
        parrafos: [
          `¡Gracias! Tu pedido ${p.folio} de ${gafetes(p.piezas)} quedó confirmado y ya está con nosotros. Lo revisamos con cuidado antes de imprimirlo.`,
          ...(p.modalidad === "ambos"
            ? [
                extras.digitalesActivos
                  ? uno
                    ? "El gafete digital ya quedó activo: si la persona tiene correo, ya recibió su liga."
                    : "Los gafetes digitales ya quedaron activos: cada persona con correo recibió su liga."
                  : uno
                    ? "El gafete digital se activa en cuanto terminemos la revisión, y si la persona tiene correo, recibe su liga."
                    : "Los gafetes digitales se activan en cuanto terminemos la revisión, y cada persona con correo recibe su liga.",
              ]
            : []),
          `Te avisamos por correo en cada paso. La entrega es en ${site.entrega}, contados desde hoy.`,
        ],
        boton: verPedido,
        avance: true,
      };
    }
    case "en_produccion":
      return {
        asunto: `Pedido ${p.folio} en producción`,
        titulo: "¡Manos a la obra!",
        parrafos: [
          `Tu pedido ${p.folio} ya entró a producción: estamos imprimiendo ${tus(p.piezas)}.`,
          `Revisamos cada detalle para que nombres, fotos y colores queden tal como los aprobaste. Te escribimos en cuanto ${uno ? "esté listo" : "estén listos"}.`,
        ],
        boton: verPedido,
        avance: true,
      };
    case "listo":
      return {
        asunto: `Pedido ${p.folio} listo para enviarse`,
        titulo: uno ? "Tu gafete ya está listo" : "Tus gafetes ya están listos",
        parrafos: [
          `${mayuscula(tus(p.piezas))} del pedido ${p.folio} ya ${p.piezas === 1 ? "está impreso, revisado y empacado" : "están impresos, revisados y empacados"}.`,
          uno
            ? "Estamos por entregarlo a la paquetería. En cuanto salga, te mandamos la guía con la liga para rastrearlo."
            : "Estamos por entregarlos a la paquetería. En cuanto salgan, te mandamos la guía con la liga para rastrearlos.",
        ],
        boton: verPedido,
        avance: true,
      };
    case "enviado": {
      const por = [p.paqueteria ? `por ${p.paqueteria}` : null, p.guia ? `con la guía ${p.guia}` : null].filter(Boolean).join(" ");
      return {
        asunto: `Pedido ${p.folio} enviado`,
        titulo: "¡Tu pedido va en camino!",
        parrafos: [
          `${mayuscula(tus(p.piezas))} del pedido ${p.folio} ya ${p.piezas === 1 ? "salió" : "salieron"}${por ? ` ${por}` : ""}.`,
          extras.rastreo
            ? "Puedes seguir el paquete en todo momento con el botón de rastreo."
            : p.guia
              ? "Puedes ver su avance desde tu cuenta, o con el número de guía en la página de la paquetería."
              : "Puedes ver su avance desde tu cuenta.",
        ],
        boton: extras.rastreo ? { texto: "Rastrear mi envío", liga: extras.rastreo } : verPedido,
        avance: true,
      };
    }
    case "entregado":
      return {
        asunto: `Pedido ${p.folio} entregado`,
        titulo: uno ? "¡Llegó tu gafete!" : "¡Llegaron tus gafetes!",
        parrafos: [
          `Tu pedido ${p.folio} ya se entregó. ${uno ? "Esperamos que se luzca con él." : "Esperamos que tu equipo los luzca con orgullo."}`,
          "Si algo no quedó como esperabas, escríbenos y lo resolvemos. Y cuando llegue alguien nuevo o se pierda un gafete, lo vuelves a pedir desde tu cuenta en un par de clics.",
        ],
        boton: verPedido,
        avance: true,
      };
  }
}

/** Barra de avance con tablas, para que se vea igual en Gmail, Outlook y Apple Mail. */
function avanceHtml(etapa: EtapaCorreo) {
  const actual = PASOS.findIndex((x) => x.etapa === etapa);
  const celdas = PASOS.map((x, i) => {
    const hecho = i <= actual;
    const circulo = `<div style="width:26px;height:26px;line-height:26px;margin:0 auto 6px;border-radius:13px;font-size:13px;font-weight:bold;${
      hecho ? `background:${ROJO};color:#fff;` : `background:#fff;color:${GRIS};border:1px solid ${LINEA};line-height:24px;`
    }">${hecho ? "&#10003;" : i + 1}</div>`;
    return `<td align="center" valign="top" style="width:20%;padding:0 2px;font-size:11px;line-height:1.3;color:${
      i === actual ? TINTA : GRIS
    };${i === actual ? "font-weight:bold;" : ""}">${circulo}${escapar(x.nombre)}</td>`;
  }).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px;background:${PAPEL};border-radius:10px;"><tr><td style="padding:14px 8px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${celdas}</tr></table></td></tr></table>`;
}

/** Arma el correo de una etapa del pedido, en HTML y en texto. */
export function correoEstadoPedido(etapa: EtapaCorreo, pedido: PedidoCorreo, extras: ExtrasCorreo = {}) {
  const c = contenido(etapa, pedido, extras);
  const etiqueta = `Hola, soy tu ${pedido.tipo === "prepago" ? "compra" : "pedido"} ${pedido.folio}`;

  const html = `<!doctype html><html lang="es"><body style="margin:0;background:${PAPEL};font-family:Arial,Helvetica,sans-serif;color:${TINTA};">
<div style="max-width:520px;margin:0 auto;padding:24px;">
<div style="background:#fff;border-radius:14px;overflow:hidden;">
<div style="background:${ROJO};color:#fff;padding:20px 24px;">
<p style="margin:0;font-size:20px;font-weight:bold;">${escapar(site.nombre)}</p>
<p style="margin:6px 0 0;"><span style="display:inline-block;background:${RESALTADOR};color:${TINTA};font-size:13px;font-weight:bold;padding:3px 10px;border-radius:999px;">${escapar(etiqueta)}</span></p>
</div>
<div style="padding:24px;">
<p style="margin:0 0 16px;font-size:20px;font-weight:bold;line-height:1.3;">${escapar(c.titulo)}</p>
${c.avance && pedido.modalidad !== "digital" ? avanceHtml(etapa) : ""}
${c.parrafos.map((x) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;">${escapar(x)}</p>`).join("\n")}
${
  c.boton
    ? `<p style="margin:20px 0 16px;"><a href="${escapar(c.boton.liga)}" style="display:inline-block;background:${ROJO};color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px;font-size:15px;">${escapar(c.boton.texto)}</a></p>
<p style="margin:0;font-size:13px;line-height:1.5;color:${GRIS};">Si el botón no abre, copia esta liga en tu navegador:<br><span style="word-break:break-all;">${escapar(c.boton.liga)}</span></p>`
    : ""
}
<p style="margin:20px 0 0;font-size:15px;line-height:1.55;">Con cariño,<br>el equipo de ${escapar(site.nombre)}</p>
</div></div>
</div></body></html>`;

  const texto = [
    etiqueta,
    "",
    c.titulo,
    "",
    ...c.parrafos.flatMap((x) => [x, ""]),
    ...(c.boton ? [`${c.boton.texto}: ${c.boton.liga}`, ""] : []),
    `Con cariño,\nel equipo de ${site.nombre}`,
  ].join("\n");

  return { asunto: c.asunto, html, texto };
}
