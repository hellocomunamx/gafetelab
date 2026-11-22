import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/tipos";
import { todas } from "./paginas";

type Servicio = SupabaseClient<Database>;

export type Persona = { id: string; correo: string; ultimoAcceso: string | null };

/** Correo y último acceso de cada cuenta. Solo con la llave secreta. */
export async function cuentas(servicio: Servicio): Promise<Map<string, Persona>> {
  const mapa = new Map<string, Persona>();
  const porPagina = 1000;
  for (let pagina = 1; pagina <= 20; pagina++) {
    const { data, error } = await servicio.auth.admin.listUsers({ page: pagina, perPage: porPagina });
    if (error || !data) break;
    for (const u of data.users) mapa.set(u.id, { id: u.id, correo: u.email ?? "", ultimoAcceso: u.last_sign_in_at ?? null });
    if (data.users.length < porPagina) break;
  }
  return mapa;
}

const constancias = { aprobada: "Aprobada", pendiente: "Por revisar", rechazada: "Rechazada" } as const;
export const nombreConstancia = (estado: string | null | undefined) =>
  estado && estado in constancias ? constancias[estado as keyof typeof constancias] : "Sin subir";

/** Pedidos que ya se cobraron (aunque después se hayan devuelto). */
export const cobrado = (p: { pagado_en: string | null }) => Boolean(p.pagado_en);

export type Cliente = {
  id: string;
  nombre: string;
  giro: string | null;
  alta: string;
  contacto: { nombre: string | null; correo: string; telefono: string | null } | null;
  usuarios: number;
  rfc: string | null;
  razonSocial: string | null;
  ciudad: string | null;
  constancia: string;
  activos: number;
  pedidos: number;
  pagados: number;
  gafetes: number;
  total: number;
  ultimoPedido: string | null;
};

/**
 * La base de clientes: una fila por empresa, con su contacto y lo que ha comprado.
 * `sesion` es el cliente de la administradora (cuenta a las personas activas con
 * `admin_empresas`); `servicio`, el de la llave secreta.
 */
export async function cargarClientes(servicio: Servicio, sesion: Servicio): Promise<Cliente[]> {
  const [empresas, miembros, perfiles, fiscales, direcciones, docs, conteos, pedidos, personas] = await Promise.all([
    servicio.from("empresas").select("id, nombre, giro, creado_en").order("creado_en", { ascending: false }).limit(5000),
    servicio.from("miembros").select("empresa_id, usuario_id, rol, creado_en").order("creado_en").limit(20000),
    servicio.from("perfiles").select("id, nombre, telefono").limit(20000),
    servicio.from("datos_fiscales").select("empresa_id, rfc, razon_social").order("predeterminado", { ascending: false }).limit(5000),
    servicio.from("direcciones").select("empresa_id, ciudad, estado").order("predeterminada", { ascending: false }).limit(5000),
    servicio.from("constancias").select("empresa_id, estado").order("creado_en", { ascending: false }).limit(5000),
    sesion.rpc("admin_empresas"),
    todas((desde, hasta) =>
      servicio
        .from("pedidos")
        .select("empresa_id, piezas, total, pagado_en, creado_en")
        .order("creado_en", { ascending: false })
        .order("id")
        .range(desde, hasta),
    ),
    cuentas(servicio),
  ]);

  const primero = <T extends { empresa_id: string }>(filas: T[] | null) => {
    const mapa = new Map<string, T>();
    for (const f of filas ?? []) if (!mapa.has(f.empresa_id)) mapa.set(f.empresa_id, f);
    return mapa;
  };
  const perfilDe = new Map((perfiles.data ?? []).map((p) => [p.id, p]));
  const fiscalDe = primero(fiscales.data);
  const direccionDe = primero(direcciones.data);
  const constanciaDe = primero(docs.data);

  const activos = new Map((conteos.data ?? []).map((c) => [c.id, Number(c.activos)]));

  const miembrosDe = new Map<string, NonNullable<typeof miembros.data>>();
  for (const m of miembros.data ?? []) miembrosDe.set(m.empresa_id, [...(miembrosDe.get(m.empresa_id) ?? []), m]);

  const compras = new Map<string, { pedidos: number; pagados: number; gafetes: number; total: number; ultimo: string | null }>();
  for (const p of pedidos) {
    const c = compras.get(p.empresa_id) ?? { pedidos: 0, pagados: 0, gafetes: 0, total: 0, ultimo: null };
    c.pedidos += 1;
    c.ultimo ??= p.creado_en;
    if (cobrado(p)) {
      c.pagados += 1;
      c.gafetes += p.piezas;
      c.total += Number(p.total);
    }
    compras.set(p.empresa_id, c);
  }

  return (empresas.data ?? []).map((e) => {
    const equipo = miembrosDe.get(e.id) ?? [];
    // El contacto es quien es dueño de la cuenta; si no hay, la primera persona.
    const principal = equipo.find((m) => m.rol === "propietario") ?? equipo[0];
    const cuenta = principal ? personas.get(principal.usuario_id) : undefined;
    const perfil = principal ? perfilDe.get(principal.usuario_id) : undefined;
    const direccion = direccionDe.get(e.id);
    const c = compras.get(e.id);
    return {
      id: e.id,
      nombre: e.nombre,
      giro: e.giro,
      alta: e.creado_en,
      contacto: principal
        ? { nombre: perfil?.nombre ?? null, correo: cuenta?.correo ?? "", telefono: perfil?.telefono ?? null }
        : null,
      usuarios: equipo.length,
      rfc: fiscalDe.get(e.id)?.rfc ?? null,
      razonSocial: fiscalDe.get(e.id)?.razon_social ?? null,
      ciudad: direccion ? `${direccion.ciudad}, ${direccion.estado}` : null,
      constancia: nombreConstancia(constanciaDe.get(e.id)?.estado),
      activos: activos.get(e.id) ?? 0,
      pedidos: c?.pedidos ?? 0,
      pagados: c?.pagados ?? 0,
      gafetes: c?.gafetes ?? 0,
      total: Math.round((c?.total ?? 0) * 100) / 100,
      ultimoPedido: c?.ultimo ?? null,
    };
  });
}

export const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Hermosillo" });
