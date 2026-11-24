import type { Json } from "@/lib/supabase/tipos";
import { type MetodoPago, esMetodoPago, metodosPago } from "@/lib/pedidos/reglas";

/**
 * Números del panel financiero. Todo sale de los pedidos: lo cobrado es lo que
 * pagó cada cliente (con IVA y envío), sin descontar la comisión de Stripe.
 * Los meses y los periodos se cortan con la hora de Sonora (UTC-7 todo el año).
 */

const DESFASE_MS = 7 * 60 * 60 * 1000;
const DIA_MS = 24 * 60 * 60 * 1000;

export const periodos = [
  { id: "mes", nombre: "Este mes", frase: "de este mes" },
  { id: "mes_pasado", nombre: "Mes pasado", frase: "del mes pasado" },
  { id: "90", nombre: "Últimos 90 días", frase: "de los últimos 90 días" },
  { id: "anio", nombre: "Este año", frase: "de este año" },
  { id: "todo", nombre: "Todo", frase: "de todo el historial" },
] as const;
export type Periodo = (typeof periodos)[number]["id"];
export const esPeriodo = (v: unknown): v is Periodo => periodos.some((p) => p.id === v);

export type Rango = { desde: number | null; hasta: number | null };

/** Primer instante del mes (hora de Sonora), en milisegundos UTC. */
const inicioDeMes = (anio: number, mes: number) => Date.UTC(anio, mes, 1) + DESFASE_MS;

export function rangoDe(periodo: Periodo, ahora = Date.now()): Rango {
  const local = new Date(ahora - DESFASE_MS);
  const anio = local.getUTCFullYear();
  const mes = local.getUTCMonth();
  switch (periodo) {
    case "mes":
      return { desde: inicioDeMes(anio, mes), hasta: null };
    case "mes_pasado":
      return { desde: inicioDeMes(anio, mes - 1), hasta: inicioDeMes(anio, mes) };
    case "90":
      return { desde: ahora - 90 * DIA_MS, hasta: null };
    case "anio":
      return { desde: inicioDeMes(anio, 0), hasta: null };
    default:
      return { desde: null, hasta: null };
  }
}

const dentro = (iso: string | null, r: Rango) => {
  if (!iso) return false;
  const ms = new Date(iso).getTime();
  return (r.desde === null || ms >= r.desde) && (r.hasta === null || ms < r.hasta);
};

/** "2026-11" para una fecha, con la hora de Sonora. */
const claveDeMes = (ms: number) => new Date(ms - DESFASE_MS).toISOString().slice(0, 7);
const nombreDeMes = (clave: string) => {
  const texto = new Date(`${clave}-15T12:00:00Z`).toLocaleDateString("es-MX", { month: "long", year: "numeric", timeZone: "UTC" });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

export type PedidoFinanzas = {
  id: string;
  folio: string;
  empresa_id: string;
  estado: string;
  metodo: string | null;
  piezas: number;
  subtotal: number;
  envio: number;
  iva: number;
  total: number;
  disputa: string | null;
  creado_en: string;
  pagado_en: string | null;
  cancelado_en: string | null;
};

export type EventoFinanzas = { pedido_id: string; tipo: string; detalle: Json; creado_en: string };

export type Devolucion = { monto: number; en: string };

const objeto = (j: Json): Record<string, Json | undefined> => (j && typeof j === "object" && !Array.isArray(j) ? j : {});

/**
 * Lo devuelto de cada pedido. Stripe avisa el acumulado del cargo (en
 * centavos), así que de cada pedido cuenta el aviso con el monto más alto.
 */
export function devoluciones(eventos: EventoFinanzas[]): Map<string, Devolucion> {
  const mapa = new Map<string, Devolucion>();
  for (const e of eventos) {
    if (e.tipo !== "reembolsado" && e.tipo !== "reembolso_parcial") continue;
    const monto = (Number(objeto(e.detalle).devuelto) || 0) / 100;
    const previo = mapa.get(e.pedido_id);
    if (!previo || monto >= previo.monto) mapa.set(e.pedido_id, { monto, en: e.creado_en });
  }
  return mapa;
}

/** Pedidos que el cliente canceló (o que cancelamos) dentro de los minutos de gracia. */
export function canceladosEnGracia(eventos: EventoFinanzas[]): Set<string> {
  const ids = new Set<string>();
  for (const e of eventos) if (e.tipo === "cancelado" && objeto(e.detalle).en_gracia === true) ids.add(e.pedido_id);
  return ids;
}

type Cuenta = { pedidos: number; total: number };
const cuenta = (): Cuenta => ({ pedidos: 0, total: 0 });
const sumar = (c: Cuenta, monto: number) => {
  c.pedidos += 1;
  c.total += monto;
};
const centavos = (n: number) => Math.round(n * 100) / 100;

export type FilaMes = { clave: string; nombre: string; pedidos: number; piezas: number; cobrado: number; devuelto: number; cancelados: number };
export type FilaMetodo = { id: MetodoPago | "otro"; nombre: string; pedidos: number; total: number; parte: number };

export function resumir(pedidos: PedidoFinanzas[], eventos: EventoFinanzas[], rango: Rango, ahora = Date.now()) {
  const devuelto = devoluciones(eventos);
  const enGracia = canceladosEnGracia(eventos);

  const cobrado = { ...cuenta(), antesDeIva: 0, iva: 0, envio: 0, piezas: 0 };
  const devueltoEnPeriodo = cuenta();
  const cancelados = { ...cuenta(), enGracia: 0 };
  const porMetodo = new Map<FilaMetodo["id"], Cuenta>();
  const porEmpresa = new Map<string, Cuenta>();

  // Estado de hoy: no depende del periodo.
  const porCobrar = { autorizado: cuenta(), enProceso: cuenta(), sinPagar: cuenta() };
  const disputas = { abiertas: cuenta(), ganadas: cuenta(), perdidas: cuenta() };

  // Los últimos 12 meses, del más reciente al más antiguo.
  const meses = new Map<string, FilaMes>();
  const local = new Date(ahora - DESFASE_MS);
  for (let i = 0; i < 12; i++) {
    const clave = claveDeMes(inicioDeMes(local.getUTCFullYear(), local.getUTCMonth() - i));
    meses.set(clave, { clave, nombre: nombreDeMes(clave), pedidos: 0, piezas: 0, cobrado: 0, devuelto: 0, cancelados: 0 });
  }

  for (const p of pedidos) {
    if (p.pagado_en) {
      const mes = meses.get(claveDeMes(new Date(p.pagado_en).getTime()));
      if (mes) {
        mes.pedidos += 1;
        mes.piezas += p.piezas;
        mes.cobrado += p.total;
      }
      if (dentro(p.pagado_en, rango)) {
        sumar(cobrado, p.total);
        cobrado.antesDeIva += p.subtotal + p.envio;
        cobrado.iva += p.iva;
        cobrado.envio += p.envio;
        cobrado.piezas += p.piezas;
        const metodo = esMetodoPago(p.metodo) ? p.metodo : "otro";
        sumar(porMetodo.get(metodo) ?? porMetodo.set(metodo, cuenta()).get(metodo)!, p.total);
        sumar(porEmpresa.get(p.empresa_id) ?? porEmpresa.set(p.empresa_id, cuenta()).get(p.empresa_id)!, p.total);
      }
    }

    const d = devuelto.get(p.id);
    if (d && d.monto > 0) {
      const mes = meses.get(claveDeMes(new Date(d.en).getTime()));
      if (mes) mes.devuelto += d.monto;
      if (dentro(d.en, rango)) sumar(devueltoEnPeriodo, d.monto);
    }

    if (p.estado === "cancelado" && p.cancelado_en) {
      const mes = meses.get(claveDeMes(new Date(p.cancelado_en).getTime()));
      if (mes) mes.cancelados += 1;
      if (dentro(p.cancelado_en, rango)) {
        sumar(cancelados, p.total);
        if (enGracia.has(p.id)) cancelados.enGracia += 1;
      }
    }

    if (p.estado === "autorizado") sumar(porCobrar.autorizado, p.total);
    else if (p.estado === "pago_en_proceso") sumar(porCobrar.enProceso, p.total);
    else if (p.estado === "por_pagar") sumar(porCobrar.sinPagar, p.total);

    if (p.disputa === "abierta") sumar(disputas.abiertas, p.total);
    else if (p.disputa === "ganada") sumar(disputas.ganadas, p.total);
    else if (p.disputa === "perdida") sumar(disputas.perdidas, p.total);
  }

  const metodos: FilaMetodo[] = (["tarjeta", "oxxo", "spei", "otro"] as const)
    .filter((id) => porMetodo.has(id))
    .map((id) => {
      const c = porMetodo.get(id)!;
      return {
        id,
        nombre: id === "otro" ? "Sin registrar" : metodosPago[id],
        pedidos: c.pedidos,
        total: centavos(c.total),
        parte: cobrado.total > 0 ? c.total / cobrado.total : 0,
      };
    });

  const mejores = [...porEmpresa.entries()]
    .map(([empresa_id, c]) => ({ empresa_id, pedidos: c.pedidos, total: centavos(c.total) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return {
    cobrado: {
      pedidos: cobrado.pedidos,
      total: centavos(cobrado.total),
      antesDeIva: centavos(cobrado.antesDeIva),
      iva: centavos(cobrado.iva),
      envio: centavos(cobrado.envio),
      piezas: cobrado.piezas,
    },
    devuelto: { pedidos: devueltoEnPeriodo.pedidos, total: centavos(devueltoEnPeriodo.total) },
    neto: centavos(cobrado.total - devueltoEnPeriodo.total),
    ticket: cobrado.pedidos ? centavos(cobrado.total / cobrado.pedidos) : 0,
    cancelados: { pedidos: cancelados.pedidos, total: centavos(cancelados.total), enGracia: cancelados.enGracia },
    metodos,
    mejores,
    porCobrar,
    disputas,
    meses: [...meses.values()].map((m) => ({ ...m, cobrado: centavos(m.cobrado), devuelto: centavos(m.devuelto) })),
    devueltoPorPedido: devuelto,
  };
}

export type Resumen = ReturnType<typeof resumir>;

/** Columnas de `pedidos` que usa el panel financiero. */
export const COLUMNAS_FINANZAS =
  "id, folio, empresa_id, estado, metodo, piezas, subtotal, envio, iva, total, disputa, creado_en, pagado_en, cancelado_en";

/** Los importes llegan de la base como texto o número; aquí quedan como número. */
export const aPedidoFinanzas = (p: {
  id: string;
  folio: string;
  empresa_id: string;
  estado: string;
  metodo: string | null;
  piezas: number;
  subtotal: number | string;
  envio: number | string;
  iva: number | string;
  total: number | string;
  disputa: string | null;
  creado_en: string;
  pagado_en: string | null;
  cancelado_en: string | null;
}): PedidoFinanzas => ({
  ...p,
  subtotal: Number(p.subtotal),
  envio: Number(p.envio),
  iva: Number(p.iva),
  total: Number(p.total),
});
