"use client";

import { type PointerEvent, type ReactNode, type Ref, type SVGProps, useId, useSyncExternalStore } from "react";
import { acomodar, INTERLINEA, medidor } from "@/lib/diseno/texto";
import { type Cara, type Elemento, type ElementoTexto, fuenteCss, type Orientacion, tamano } from "@/lib/diseno/tipos";
import { medidas } from "@/lib/materiales";
import { codigoQr } from "@/lib/qr";

/** Patrón fijo que imita un código QR, para cuando todavía no hay nada que codificar. */
const QR = ["1110111", "1010101", "1110011", "0011010", "1101110", "1010001", "1110111"];

/** El texto que imprime un elemento con los datos de una persona. */
export function textoDe(e: ElementoTexto, datos: Record<string, string>, etiquetas: Record<string, string>): string {
  let texto = e.campo ? (datos[e.campo] ?? "") : (e.texto ?? "");
  if (e.campo && e.conEtiqueta && texto) texto = `${etiquetas[e.campo] ?? e.campo}: ${texto}`;
  return e.mayusculas ? texto.toLocaleUpperCase("es-MX") : texto;
}

export function useMedidor() {
  return useSyncExternalStore(medidor.suscribir, medidor.actual, medidor.servidor);
}

function Pieza({
  e,
  datos,
  etiquetas,
  foto,
  qr,
  imagenes,
  id,
  enEdicion,
}: {
  e: Elemento;
  datos: Record<string, string>;
  etiquetas: Record<string, string>;
  foto?: string | null;
  qr?: string;
  imagenes: Record<string, string>;
  id: string;
  enEdicion: boolean;
}) {
  const medir = useMedidor();
  if (e.tipo === "forma") {
    return <rect x={e.x} y={e.y} width={e.w} height={e.h} rx={Math.min(e.radio, e.w / 2, e.h / 2)} fill={e.color} />;
  }
  if (e.tipo === "imagen") {
    const url = imagenes[e.ruta];
    return url ? (
      <image
        href={url}
        x={e.x}
        y={e.y}
        width={e.w}
        height={e.h}
        preserveAspectRatio={e.ajuste === "cubrir" ? "xMidYMid slice" : "xMidYMid meet"}
      />
    ) : (
      <rect x={e.x} y={e.y} width={e.w} height={e.h} fill="#eef0f5" />
    );
  }
  if (e.tipo === "qr") {
    const real = qr ? codigoQr(qr) : null;
    if (real) {
      const escala = e.w / real.lado;
      return (
        <g>
          <rect x={e.x} y={e.y} width={e.w} height={e.w} fill="#fff" />
          <path d={real.trazo} fill="#000" transform={`translate(${e.x} ${e.y}) scale(${escala})`} shapeRendering="crispEdges" />
        </g>
      );
    }
    const celda = e.w / QR.length;
    return (
      <g>
        <rect x={e.x} y={e.y} width={e.w} height={e.w} fill="#fff" />
        <g fill="#1b1f3b">
          {QR.flatMap((fila, f) =>
            [...fila].map((v, c) =>
              v === "1" ? (
                <rect key={`${f}-${c}`} x={e.x + c * celda} y={e.y + f * celda} width={celda + 0.02} height={celda + 0.02} />
              ) : null,
            ),
          )}
        </g>
      </g>
    );
  }
  if (e.tipo === "foto") {
    const radio = Math.min(e.radio, e.w / 2, e.h / 2);
    const recorte = `${id}-${e.id}`;
    return (
      <g>
        <clipPath id={recorte}>
          <rect x={e.x} y={e.y} width={e.w} height={e.h} rx={radio} />
        </clipPath>
        <g clipPath={`url(#${recorte})`}>
          <rect x={e.x} y={e.y} width={e.w} height={e.h} fill="#eef0f5" />
          {foto ? (
            <image href={foto} x={e.x} y={e.y} width={e.w} height={e.h} preserveAspectRatio="xMidYMin slice" />
          ) : (
            <g fill="#c5c9d8">
              <circle cx={e.x + e.w / 2} cy={e.y + e.h * 0.4} r={Math.min(e.w, e.h) * 0.2} />
              <ellipse cx={e.x + e.w / 2} cy={e.y + e.h * 1.02} rx={e.w * 0.42} ry={e.h * 0.36} />
            </g>
          )}
        </g>
      </g>
    );
  }
  const texto = textoDe(e, datos, etiquetas);
  if (!texto.trim()) {
    // En el editor se deja ver dónde va el campo aunque la persona de muestra no lo tenga.
    return enEdicion ? (
      <text x={e.x} y={e.y + e.tam * 0.88} fontSize={e.tam} fill="#9aa0b5" style={{ fontFamily: fuenteCss(e.fuente) }}>
        {e.campo ? `[${etiquetas[e.campo] ?? e.campo}]` : ""}
      </text>
    ) : null;
  }
  const { lineas, tam } = acomodar(texto, e, e.tam, e.fuente, e.negrita, medir);
  const x = e.alinear === "centro" ? e.x + e.w / 2 : e.alinear === "derecha" ? e.x + e.w : e.x;
  return (
    <text
      fontSize={tam}
      fill={e.color}
      fontWeight={e.negrita ? 700 : 400}
      textAnchor={e.alinear === "centro" ? "middle" : e.alinear === "derecha" ? "end" : "start"}
      style={{ fontFamily: fuenteCss(e.fuente) }}
    >
      {lineas.map((linea, i) => (
        <tspan key={i} x={x} y={e.y + tam * 0.88 + i * tam * INTERLINEA}>
          {linea}
        </tspan>
      ))}
    </text>
  );
}

/**
 * Dibuja una cara del gafete a escala (1 unidad = 1 mm) con los datos de una
 * persona. `modo="corte"` muestra el gafete ya cortado; `modo="completo"`
 * muestra también el sangrado, para el editor.
 */
export function GafeteSvg({
  cara,
  orientacion,
  datos,
  etiquetas,
  foto,
  qr,
  imagenes,
  modo = "corte",
  titulo,
  className = "",
  children,
  alTocar,
  svgRef,
  eventos,
}: {
  cara: Cara;
  orientacion: Orientacion;
  datos: Record<string, string>;
  /** Nombre visible de cada campo, por clave. */
  etiquetas: Record<string, string>;
  foto?: string | null;
  /** Lo que lleva escrito el código QR de esta persona. Sin él se dibuja un patrón de relleno. */
  qr?: string;
  /** Liga temporal de cada archivo del diseño, por ruta. */
  imagenes: Record<string, string>;
  modo?: "corte" | "completo";
  titulo?: string;
  className?: string;
  /** Capas extra dentro del dibujo (guías y selección del editor). */
  children?: ReactNode;
  alTocar?: (id: string, evento: PointerEvent<SVGGElement>) => void;
  svgRef?: Ref<SVGSVGElement>;
  /** Eventos del lienzo completo (arrastrar, soltar), para el editor. */
  eventos?: SVGProps<SVGSVGElement>;
}) {
  const id = useId().replace(/:/g, "");
  const { w, h } = tamano(orientacion);
  const s = medidas.sangrado;
  const completo = modo === "completo";
  const aire = completo ? 5 : 0;
  const borde = completo ? s : 0;
  const fondoUrl = cara.imagen ? imagenes[cara.imagen] : undefined;

  return (
    <svg
      ref={svgRef}
      viewBox={`${-borde - aire} ${-borde - aire} ${w + (borde + aire) * 2} ${h + (borde + aire) * 2}`}
      role="img"
      aria-label={titulo ?? "Gafete"}
      className={className}
      {...eventos}
    >
      <defs>
        <clipPath id={`${id}-area`}>
          {completo ? (
            <rect x={-s} y={-s} width={w + s * 2} height={h + s * 2} />
          ) : (
            <rect x={0} y={0} width={w} height={h} rx={medidas.radioEsquina} />
          )}
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-area)`}>
        <rect x={-s} y={-s} width={w + s * 2} height={h + s * 2} fill={cara.fondo} />
        {fondoUrl ? (
          <image href={fondoUrl} x={-s} y={-s} width={w + s * 2} height={h + s * 2} preserveAspectRatio="xMidYMid slice" />
        ) : null}
        {cara.elementos.map((e) => (
          <g
            key={e.id}
            data-elemento={e.id}
            onPointerDown={alTocar ? (evento) => alTocar(e.id, evento) : undefined}
            style={alTocar ? { cursor: "move" } : undefined}
          >
            <Pieza e={e} datos={datos} etiquetas={etiquetas} foto={foto} qr={qr} imagenes={imagenes} id={id} enEdicion={Boolean(alTocar)} />
            {/* Zona de agarre: toda la caja, aunque el texto sea corto. */}
            {alTocar ? <rect x={e.x} y={e.y} width={e.w} height={e.h} fill="transparent" /> : null}
          </g>
        ))}
      </g>
      {completo ? null : (
        <rect x={0.1} y={0.1} width={w - 0.2} height={h - 0.2} rx={medidas.radioEsquina} fill="none" stroke="#1b1f3b" strokeOpacity={0.18} strokeWidth={0.2} />
      )}
      {children}
    </svg>
  );
}
