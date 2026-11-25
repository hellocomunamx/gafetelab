"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { palabrasSensibles, textosDeDiseno } from "@/lib/admin/alertas";
import { constanciaDe, puedePedir } from "@/lib/cuenta/constancia";
import { miAceptacion, requerirEmpresa } from "@/lib/cuenta/sesion";
import { type MaterialId, materiales } from "@/lib/materiales";
import { revisarAviso } from "@/lib/pedidos/abierto";
import { esRazon, motivoDe } from "@/lib/pedidos/predeterminados";
import { FUENTE_LISTOS, cuantosConVuelta, prepararPedido } from "@/lib/pedidos/preparar";
import {
  type AprobacionPedido,
  type DireccionCopiada,
  type FacturacionCopiada,
  pedidoMaximoPiezas,
  pedidosAbiertosMaximo,
  sigueEnGracia,
  soloTransferencia,
} from "@/lib/pedidos/reglas";
import { abrirCobro, anotar, cancelarAutorizado, cerrarCobro, liberarSaldo, marcarPagado, saldoDe } from "@/lib/pedidos/servidor";
import { cotizarPedido, esModalidad, llevaDigital, llevaImpreso } from "@/lib/pedidos/digital";
import { stripeActivo } from "@/lib/stripe";
import { clienteServicio } from "@/lib/supabase/publico";
import type { Json } from "@/lib/supabase/tipos";
import { categoriasDe, cordonesDe } from "@/lib/eventos";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SIN_ACTIVAR = "Los pedidos en línea todavía no están activos. Escríbenos y lo resolvemos.";
const SOLO_ADMIN = "Solo quien es dueño o administrador de la empresa puede hacer pedidos.";

export type EntradaPedido = {
  /** Id de un diseño o "listos". */
  fuente: string;
  /** Impreso, digital o los dos. Si no llega, impreso. */
  modalidad?: string;
  personas: string[];
  material: string;
  direccion: string;
  /** Id de los datos de facturación, o null si no necesita factura. */
  facturacion: string | null;
  /** La casilla "revisé la vista previa y apruebo que se imprima así". */
  aprobado: boolean;
  /** Eventos: un cordón por gafete impreso, del color de la categoría de cada persona. */
  cordon?: boolean;
  /** Por persona, por qué se pide: se perdió, se dañó o cambiaron sus datos. Quien no aparece es alta o reposición según su historial. */
  razones?: Record<string, string>;
};

/**
 * Crea el pedido con una copia de todo lo que se va a imprimir y devuelve la
 * liga de Stripe para pagarlo. Nada de lo que manda el navegador se da por
 * bueno: personas, precio y permisos se vuelven a calcular aquí.
 */
export async function crearPedido(entrada: EntradaPedido): Promise<{ url?: string; pedido?: string; pagado?: boolean; error?: string }> {
  const { supabase, usuario, empresa, administra } = await requerirEmpresa();
  if (!administra) return { error: SOLO_ADMIN };
  const servicio = clienteServicio();
  if (!servicio || !stripeActivo()) return { error: SIN_ACTIVAR };
  if (!puedePedir(await constanciaDe(supabase, empresa.id))) {
    return { error: "Para hacer tu primer pedido necesitamos verificar tu empresa. Hazlo en Verificación: con RFC o sin RFC." };
  }
  if (entrada?.aprobado !== true) return { error: "Confirma que revisaste la vista previa de tus gafetes." };

  const ids = [...new Set(Array.isArray(entrada.personas) ? entrada.personas.filter((p) => typeof p === "string" && UUID.test(p)) : [])];
  if (!ids.length) return { error: "Elige al menos a una persona." };
  if (ids.length > pedidoMaximoPiezas) return { error: `Un pedido lleva hasta ${pedidoMaximoPiezas.toLocaleString("es-MX")} gafetes.` };

  const modalidad = esModalidad(entrada.modalidad) ? entrada.modalidad : "impreso";
  const impreso = llevaImpreso(modalidad);
  const digital = llevaDigital(modalidad);
  // Lo digital no lleva material: el precio se calcula como estándar y no se guarda.
  const material = impreso ? materiales.find((m) => m.id === entrada.material && m.disponible) : materiales[0];
  if (!material) return { error: "Elige el material de tus gafetes." };

  const { fuentes } = await prepararPedido(supabase, empresa);
  const fuente = fuentes.find((f) => f.id === entrada.fuente);
  if (!fuente) return { error: "Ese diseño ya no existe. Vuelve a cargar la página." };
  const copias = ids.map((id) => ({ id, gafete: fuente.gafetes.get(id) }));
  if (copias.some((c) => !c.gafete)) return { error: "Alguna de las personas ya no está activa. Vuelve a cargar la página." };
  if (copias.some((c) => c.gafete!.faltan.length)) {
    return { error: "A alguno de los gafetes elegidos le faltan datos. Complétalos o quita a esa persona del pedido." };
  }

  const [{ data: direccion }, { data: fiscales }, { count: abiertos }, { count: pagados }, aceptacion] = await Promise.all([
    impreso && UUID.test(entrada.direccion ?? "")
      ? supabase.from("direcciones").select("*").eq("id", entrada.direccion).eq("empresa_id", empresa.id).maybeSingle()
      : Promise.resolve({ data: null }),
    entrada.facturacion && UUID.test(entrada.facturacion)
      ? supabase.from("datos_fiscales").select("*").eq("id", entrada.facturacion).eq("empresa_id", empresa.id).maybeSingle()
      : Promise.resolve({ data: null }),
    servicio.from("pedidos").select("id", { count: "exact", head: true }).eq("empresa_id", empresa.id).eq("estado", "por_pagar"),
    servicio.from("pedidos").select("id", { count: "exact", head: true }).eq("empresa_id", empresa.id).eq("tipo", "impresion").not("pagado_en", "is", null),
    miAceptacion(),
  ]);
  if (impreso && !direccion) return { error: "Elige a dónde enviamos tu pedido." };
  if (entrada.facturacion && !fiscales) return { error: "Esos datos de facturación ya no existen. Vuelve a cargar la página." };
  if ((abiertos ?? 0) >= pedidosAbiertosMaximo) {
    return { error: "Tienes varios pedidos sin pagar. Paga o cancela alguno antes de hacer otro." };
  }

  // Quien ya tiene su gafete digital no lo vuelve a pagar: sigue sirviendo aunque cambien sus datos.
  if (digital) {
    const yaTienen = await conDigital(servicio, empresa.id, ids);
    if (yaTienen.size) {
      return {
        error: `${yaTienen.size === 1 ? "Una persona ya tiene" : `${yaTienen.size} personas ya tienen`} su gafete digital. Quítalas del pedido o pide solo impreso.`,
      };
    }
  }

  // La vuelta solo se cobra a los gafetes que la llevan.
  const conVuelta = impreso ? cuantosConVuelta(fuente, ids) : 0;
  // Primero se usa el saldo prepagado de la empresa; solo se cobra lo que falte.
  // El cordón solo se ofrece en eventos y va con el gafete impreso.
  const cordon = empresa.tipo === "evento" && impreso && entrada.cordon === true;
  const c = cotizarPedido(ids.length, { modalidad, conVuelta, material: material.id as MaterialId, cordon }, await saldoDe(servicio, empresa.id));
  const cordones = cordon
    ? cordonesDe(
        copias.map((x) => x.gafete!.copia.valores?.categoria),
        categoriasDe(empresa.categorias),
      )
    : null;
  const h = await headers();
  const aprobacion: AprobacionPedido = {
    vista_previa: true,
    terminos_version: aceptacion.aceptacion?.terminos_version ?? null,
    aviso_version: aceptacion.aceptacion?.aviso_version ?? null,
    correo: usuario.email ?? null,
    ip: h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    navegador: h.get("user-agent")?.slice(0, 300) ?? null,
    en: new Date().toISOString(),
  };
  const copiaDireccion: DireccionCopiada | null = direccion && {
    destinatario: direccion.destinatario,
    telefono: direccion.telefono,
    calle: direccion.calle,
    colonia: direccion.colonia,
    ciudad: direccion.ciudad,
    estado: direccion.estado,
    cp: direccion.cp,
    referencias: direccion.referencias,
  };
  const copiaFiscal: FacturacionCopiada | null = fiscales
    ? {
        rfc: fiscales.rfc,
        razon_social: fiscales.razon_social,
        regimen_fiscal: fiscales.regimen_fiscal,
        cp_fiscal: fiscales.cp_fiscal,
        uso_cfdi: fiscales.uso_cfdi,
        correo: fiscales.correo,
      }
    : null;
  const elegidas = copias.map((x) => x.gafete!.copia);
  // Con reglas se guarda una copia de cada diseño que sí se usa; cada gafete dice cuál lleva.
  const usados =
    fuente.tipo === "reglas" ? [...new Set(copias.map((x) => x.gafete!.disenoId!))].map((id) => fuente.disenos!.get(id)!.fila) : [];
  const alertas = palabrasSensibles([
    empresa.nombre,
    ...(fuente.fila ? textosDeDiseno(fuente.fila) : []),
    ...usados.flatMap((f) => textosDeDiseno(f)),
    ...elegidas.flatMap((g) => [g.valores?.puesto, g.valores?.departamento]),
  ]);

  const { data: pedido, error } = await servicio
    .from("pedidos")
    .insert({
      empresa_id: empresa.id,
      creado_por: usuario.id,
      modalidad,
      material: impreso ? material.id : null,
      dos_caras: c.conVuelta > 0,
      piezas: c.piezas,
      fuente: fuente.tipo === "reglas" ? "diseno" : fuente.tipo,
      diseno_id: fuente.fila?.id ?? null,
      diseno: fuente.fila
        ? ({ nombre: fuente.fila.nombre, orientacion: fuente.fila.orientacion, frente: fuente.fila.frente, vuelta: fuente.fila.vuelta } as Json)
        : usados.length
          ? ({
              nombre: "Por reglas",
              reglas: Object.fromEntries(usados.map((f) => [f.id, { nombre: f.nombre, orientacion: f.orientacion, frente: f.frente, vuelta: f.vuelta }])),
            } as Json)
          : null,
      por_pieza: c.porPieza,
      conceptos: c.conceptos as unknown as Json,
      gafetes_de_saldo: c.deSaldo,
      envio_de_saldo: c.envioDeSaldo,
      subtotal: c.subtotal,
      envio: c.envio,
      iva: c.iva,
      total: c.total,
      direccion: copiaDireccion as unknown as Json,
      facturacion: copiaFiscal as unknown as Json,
      aprobacion: aprobacion as unknown as NonNullable<Json>,
      primer_pedido: (pagados ?? 0) === 0,
      alertas,
      solo_transferencia: soloTransferencia(c.piezas, c.total),
      cordones: cordones as unknown as Json,
    })
    .select("*")
    .single();
  if (error || !pedido) {
    return {
      error: usados.length > 3 && error?.message.includes("diseno")
        ? "Tu pedido junta demasiados diseños distintos. Divídelo en dos pedidos."
        : "No pudimos guardar tu pedido. Intenta de nuevo.",
    };
  }

  // Se aparta el saldo, todo o nada. Si otro pedido lo usó al mismo tiempo, se deshace.
  if (c.plan.length) {
    const { error: sinSaldo } = await servicio.rpc("usar_saldo", { p_pedido: pedido.id, p_plan: c.plan as unknown as Json });
    if (sinSaldo) {
      await servicio.from("pedidos").delete().eq("id", pedido.id);
      return { error: "Tu saldo cambió mientras hacías el pedido. Vuelve a cargar la página." };
    }
  }

  // Los gafetes del pedido, con la copia de cada persona: uno impreso, uno digital o los dos.
  // Quien ya tuvo un gafete del mismo tipo lleva una reposición.
  const { data: previos } = await servicio
    .from("gafetes")
    .select("empleado_id, tipo")
    .eq("empresa_id", empresa.id)
    .neq("estado", "cancelado")
    .limit(20000);
  const conGafete = new Set((previos ?? []).map((g) => `${g.tipo}:${g.empleado_id}`));
  const razones = entrada.razones && typeof entrada.razones === "object" ? entrada.razones : {};
  const tipos = [...(impreso ? ["impreso"] : []), ...(digital ? ["digital"] : [])];
  const renglones = tipos.flatMap((tipo) =>
    copias.map((x) => {
      // La razón de una reposición (se perdió, se dañó, cambiaron sus datos) habla del gafete impreso.
      const pedida = tipo === "impreso" ? razones[x.id] : null;
      const razon = esRazon(pedida) ? pedida : null;
      const motivo = motivoDe(razon, conGafete.has(`${tipo}:${x.id}`));
      return {
        empresa_id: empresa.id,
        empleado_id: x.id,
        tipo,
        motivo,
        razon: motivo === "alta" ? "alta" : razon,
        estado: "en_pedido",
        datos: x.gafete!.copia as unknown as NonNullable<Json>,
        diseno_id: fuente.fila?.id ?? x.gafete!.disenoId ?? null,
        pedido_id: pedido.id,
      };
    }),
  );
  for (let i = 0; i < renglones.length; i += 500) {
    const { error: falla } = await servicio.from("gafetes").insert(renglones.slice(i, i + 500));
    if (falla) {
      await servicio.from("pedidos").delete().eq("id", pedido.id);
      return { error: "No pudimos guardar tu pedido. Intenta de nuevo." };
    }
  }
  await anotar(
    servicio,
    pedido.id,
    "creado",
    { piezas: c.piezas, modalidad, total: c.total, de_saldo: c.deSaldo, digitales_de_saldo: c.digitalesDeSaldo, envio_de_saldo: c.envioDeSaldo, fuente: fuente.id === FUENTE_LISTOS ? "listos" : fuente.nombre },
    usuario.id,
  );
  // Lo que estaba apartado en el pedido abierto ya va en este pedido.
  for (let i = 0; i < ids.length; i += 500) {
    await servicio.from("pedido_abierto").delete().eq("empresa_id", empresa.id).in("empleado_id", ids.slice(i, i + 500));
  }
  await revisarAviso(empresa.id);
  revalidatePath("/cuenta", "layout");

  // Cubierto completo con saldo: no hay nada que cobrar.
  if (c.total === 0) {
    await marcarPagado(servicio, pedido, { metodo: "saldo", pago: null });
    return { pedido: pedido.id, pagado: true };
  }

  try {
    return { url: await abrirCobro(servicio, pedido, empresa, usuario.email ?? null) };
  } catch {
    // El pedido quedó guardado: se puede pagar desde su página.
    return { pedido: pedido.id };
  }
}

/** Manda a pagar un pedido que sigue por pagar. */
export async function pagarPedido(d: FormData) {
  const { usuario, empresa, administra } = await requerirEmpresa();
  const id = String(d.get("id") ?? "");
  const servicio = clienteServicio();
  if (!administra || !servicio || !stripeActivo() || !UUID.test(id)) redirect(`/cuenta/pedidos/${id}?pago=error`);
  const { data: pedido } = await servicio.from("pedidos").select("*").eq("id", id).eq("empresa_id", empresa.id).maybeSingle();
  if (!pedido || pedido.estado !== "por_pagar") redirect(`/cuenta/pedidos/${id}`);
  let url: string;
  try {
    url = await abrirCobro(servicio, pedido, empresa, usuario.email ?? null);
  } catch {
    redirect(`/cuenta/pedidos/${id}?pago=error`);
  }
  redirect(url);
}

/** Cancela un pedido que todavía no se paga, o uno con tarjeta autorizada dentro de sus minutos de gracia. */
export async function cancelarPedido(d: FormData) {
  const { usuario, empresa, administra } = await requerirEmpresa();
  const id = String(d.get("id") ?? "");
  const servicio = clienteServicio();
  if (!administra || !servicio || !UUID.test(id)) return;
  const { data: pedido } = await servicio.from("pedidos").select("*").eq("id", id).eq("empresa_id", empresa.id).maybeSingle();
  if (!pedido) return;
  if (pedido.estado === "autorizado") {
    if (sigueEnGracia(pedido.gracia_hasta)) {
      await cancelarAutorizado(servicio, pedido, usuario.id, "empresa");
    }
  } else if (pedido.estado === "por_pagar") {
    // Primero se cierra el cobro, para que no se pueda pagar un pedido cancelado.
    await cerrarCobro(pedido);
    const { data: movido } = await servicio
      .from("pedidos")
      .update({ estado: "cancelado", cancelado_en: new Date().toISOString(), stripe_sesion: null, stripe_url: null })
      .eq("id", id)
      .eq("estado", "por_pagar")
      .select("id");
    if (movido?.length) {
      await servicio.from("gafetes").update({ estado: "cancelado" }).eq("pedido_id", id);
      await liberarSaldo(servicio, id);
      await anotar(servicio, id, "cancelado", { por: "empresa" }, usuario.id);
    }
  }
  revalidatePath("/cuenta", "layout");
}

/** Personas que ya tienen un gafete digital pedido o activo. */
async function conDigital(servicio: NonNullable<ReturnType<typeof clienteServicio>>, empresaId: string, ids: string[]): Promise<Set<string>> {
  const encontradas = new Set<string>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await servicio
      .from("gafetes")
      .select("empleado_id")
      .eq("empresa_id", empresaId)
      .eq("tipo", "digital")
      .in("estado", ["en_pedido", "activo"])
      .in("empleado_id", ids.slice(i, i + 200));
    for (const g of data ?? []) encontradas.add(g.empleado_id);
  }
  return encontradas;
}
