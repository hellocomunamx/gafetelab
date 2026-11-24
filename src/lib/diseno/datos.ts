import type { Cara, Diseno, Orientacion } from "./tipos";
import { caraVacia } from "./tipos";

type CampoBasico = { clave: string; etiqueta: string; tipo: string };
type PersonaBasica = {
  nombre: string;
  numero_empleado: string | null;
  puesto: string | null;
  departamento: string | null;
  tipo_contrato: string | null;
  datos: unknown;
};

/** Persona de muestra para ver el diseño cuando todavía no hay equipo. */
export const MUESTRA: Record<string, string> = {
  nombre: "Ana Martínez López",
  puesto: "Ejecutiva de ventas",
  numero_empleado: "0042",
  departamento: "Comercial",
  tipo_contrato: "Planta",
};

const fechaLegible = (v: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : v;
};

/** Valores de una persona por clave de campo, listos para imprimirse. */
export function datosDePersona(p: PersonaBasica, campos: CampoBasico[]): Record<string, string> {
  const propios = (p.datos && typeof p.datos === "object" ? p.datos : {}) as Record<string, unknown>;
  const valores: Record<string, string> = {
    nombre: p.nombre,
    numero_empleado: p.numero_empleado ?? "",
    puesto: p.puesto ?? "",
    departamento: p.departamento ?? "",
    tipo_contrato: p.tipo_contrato ?? "",
  };
  for (const c of campos) {
    if (c.clave in valores || c.tipo === "foto" || c.tipo === "qr") continue;
    const v = propios[c.clave];
    valores[c.clave] = typeof v === "string" ? (c.tipo === "fecha" ? fechaLegible(v) : v) : "";
  }
  return valores;
}

/** Datos de muestra: los de siempre y, para los campos propios, su nombre entre corchetes. */
export function datosDeMuestra(campos: CampoBasico[]): Record<string, string> {
  const valores = { ...MUESTRA };
  for (const c of campos) {
    if (!(c.clave in valores) && c.tipo !== "foto" && c.tipo !== "qr") {
      valores[c.clave] = c.tipo === "fecha" ? "31/12/2027" : c.etiqueta;
    }
  }
  return valores;
}

/** Convierte una fila de `disenos` en el tipo del editor. */
export function disenoDeFila(fila: {
  id: string;
  nombre: string;
  orientacion: string;
  frente: unknown;
  vuelta: unknown;
}): Diseno {
  const cara = (v: unknown): Cara | null => {
    const c = v as Partial<Cara> | null;
    return c && Array.isArray(c.elementos) ? { fondo: c.fondo ?? "#ffffff", imagen: c.imagen, elementos: c.elementos } : null;
  };
  return {
    id: fila.id,
    nombre: fila.nombre,
    orientacion: (fila.orientacion === "vertical" ? "vertical" : "horizontal") as Orientacion,
    frente: cara(fila.frente) ?? caraVacia(),
    vuelta: cara(fila.vuelta),
  };
}

/** Qué le falta a una persona para que su gafete salga completo con este diseño. */
export function faltantes(
  diseno: Diseno,
  datos: Record<string, string>,
  tieneFoto: boolean,
  campos: CampoBasico[],
  /** Lo que lleva escrito su código QR; vacío si no hay nada que codificar. */
  qr = "sin revisar",
): string[] {
  const faltan = new Set<string>();
  for (const cara of [diseno.frente, diseno.vuelta]) {
    for (const e of cara?.elementos ?? []) {
      if (e.tipo === "foto" && !tieneFoto) faltan.add("Fotografía");
      if (e.tipo === "qr" && !qr) faltan.add("El dato de su código QR");
      // El nombre es opcional: sin él sale un gafete genérico, no falta nada.
      if (e.tipo === "texto" && e.campo && e.campo !== "nombre" && !datos[e.campo]?.trim()) {
        faltan.add(campos.find((c) => c.clave === e.campo)?.etiqueta ?? e.campo);
      }
    }
  }
  return [...faltan];
}
