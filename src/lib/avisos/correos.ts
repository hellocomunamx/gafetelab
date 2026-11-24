import { site, urlAbsoluta } from "@/lib/site";
import { escapar } from "@/lib/solicitudes";
import { RUTA_AVISOS } from "./tipos";

/** Marco común de los avisos a administradores: encabezado rojo, cuerpo y pie con dónde cambiar los avisos. */
function marco(opts: { titulo: string; cuerpoHtml: string; boton?: { texto: string; url: string } }) {
  const ajustes = urlAbsoluta(RUTA_AVISOS);
  return `<!doctype html><html lang="es"><body style="margin:0;background:#EEF0F5;font-family:Arial,Helvetica,sans-serif;color:#1B1F3B;">
<div style="max-width:520px;margin:0 auto;padding:24px;">
<div style="background:#fff;border-radius:14px;overflow:hidden;">
<div style="background:#E63B2E;color:#fff;padding:20px 24px;">
<p style="margin:0;font-size:20px;font-weight:bold;">${escapar(site.nombre)}</p>
</div>
<div style="padding:24px;">
<p style="margin:0 0 12px;font-size:18px;font-weight:bold;">${escapar(opts.titulo)}</p>
${opts.cuerpoHtml}
${
  opts.boton
    ? `<p style="margin:20px 0 0;"><a href="${escapar(opts.boton.url)}" style="display:inline-block;background:#E63B2E;color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px;font-size:15px;">${escapar(opts.boton.texto)}</a></p>`
    : ""
}
</div></div>
<p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#5C6178;text-align:center;">Te llega porque administras esta empresa en ${escapar(site.nombre)}. <a href="${escapar(ajustes)}" style="color:#5C6178;">Elige qué avisos recibir</a>.</p>
</div></body></html>`;
}

const parrafo = (t: string) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.55;">${escapar(t)}</p>`;
const pieTexto = () => `Te llega porque administras esta empresa en ${site.nombre}. Elige qué avisos recibir: ${urlAbsoluta(RUTA_AVISOS)}`;

/** Aviso al momento: una persona pidió cambiar su foto, o mandó datos desde su liga. */
export function correoAvisoInmediato(opts: {
  tipo: "cambio_foto" | "datos_liga";
  empresa: string;
  persona: string;
  conImpreso?: boolean;
  url: string;
}) {
  const quien = opts.persona.trim() || "Una persona de tu equipo";
  const titulo =
    opts.tipo === "cambio_foto" ? `${quien} pide cambiar su foto` : `${quien} mandó sus datos para su gafete`;
  const lineas =
    opts.tipo === "cambio_foto"
      ? [
          `En ${opts.empresa}, ${quien} quiere cambiar la foto de su gafete digital. Ve la foto anterior y la nueva lado a lado, y apruébala o pídele otra.`,
          ...(opts.conImpreso
            ? ["También tiene gafete impreso: si apruebas, puedes sumar su reposición a tu pedido abierto en el mismo clic."]
            : []),
        ]
      : [`En ${opts.empresa}, ${quien} mandó sus datos o su foto desde su liga. Revísalos y apruébalos para que queden en su ficha.`];
  const boton = { texto: opts.tipo === "cambio_foto" ? "Revisar el cambio" : "Revisar y aprobar", url: opts.url };
  return {
    asunto: `${titulo} · ${opts.empresa}`,
    html: marco({ titulo, cuerpoHtml: lineas.map(parrafo).join(""), boton }),
    texto: [titulo, "", ...lineas, "", `${boton.texto}: ${boton.url}`, "", "—", pieTexto()].join("\n"),
  };
}

export type RenglonResumen = {
  empresa: string;
  cambiosFoto?: { total: number; nombres: string[]; url: string };
  datosLiga?: { total: number; nombres: string[]; url: string };
};

const plural = (n: number, uno: string, varios: string) => `${n.toLocaleString("es-MX")} ${n === 1 ? uno : varios}`;
const conNombres = (nombres: string[], total: number) => {
  const lista = nombres.filter(Boolean).join(", ");
  if (!lista) return "";
  return total > nombres.length ? `: ${lista} y ${plural(total - nombres.length, "más", "más")}` : `: ${lista}`;
};

/** Resumen semanal: lo que tiene pendiente cada empresa que administra. Solo se manda si hay algo. */
export function correoResumenSemanal(opts: { nombre: string | null; renglones: RenglonResumen[] }) {
  const primerNombre = opts.nombre?.trim().split(/\s+/)[0];
  const saludo = primerNombre ? `Hola, ${primerNombre}.` : "Hola.";
  const titulo = "Tu resumen de la semana";
  const bloques = opts.renglones.map((r) => {
    const lineas: { texto: string; url: string; boton: string }[] = [];
    if (r.cambiosFoto?.total) {
      lineas.push({
        texto: `${plural(r.cambiosFoto.total, "cambio de foto por revisar", "cambios de foto por revisar")}${conNombres(r.cambiosFoto.nombres, r.cambiosFoto.total)}.`,
        url: r.cambiosFoto.url,
        boton: "Revisar cambios de foto",
      });
    }
    if (r.datosLiga?.total) {
      lineas.push({
        texto: `${plural(r.datosLiga.total, "persona mandó", "personas mandaron")} datos o foto desde su liga${conNombres(r.datosLiga.nombres, r.datosLiga.total)}.`,
        url: r.datosLiga.url,
        boton: "Revisar y aprobar",
      });
    }
    return { empresa: r.empresa, lineas };
  });

  const cuerpoHtml =
    parrafo(`${saludo} Esto quedó pendiente en tu equipo:`) +
    bloques
      .map(
        (b) =>
          `<div style="margin:16px 0 0;padding:14px 16px;border:1px solid #E2E4EC;border-radius:10px;">
<p style="margin:0 0 8px;font-size:16px;font-weight:bold;">${escapar(b.empresa)}</p>
${b.lineas
  .map(
    (l) =>
      `<p style="margin:0 0 6px;font-size:14px;line-height:1.5;">${escapar(l.texto)}</p><p style="margin:0 0 10px;font-size:14px;"><a href="${escapar(l.url)}" style="color:#E63B2E;font-weight:bold;">${escapar(l.boton)} →</a></p>`,
  )
  .join("")}
</div>`,
      )
      .join("");
  const texto = [
    titulo,
    "",
    `${saludo} Esto quedó pendiente en tu equipo:`,
    ...bloques.flatMap((b) => ["", b.empresa, ...b.lineas.flatMap((l) => [`- ${l.texto}`, `  ${l.boton}: ${l.url}`])]),
    "",
    "—",
    pieTexto(),
  ].join("\n");
  return {
    asunto: `Tu resumen de la semana en ${site.nombre}`,
    html: marco({ titulo, cuerpoHtml }),
    texto,
  };
}
