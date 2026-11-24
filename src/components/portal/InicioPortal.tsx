import Link from "next/link";
import type { ReactNode } from "react";
import { cancelarSolicitud, salir } from "@/app/e/acciones";
import { GafeteDigitalVista } from "@/components/GafeteDigitalVista";
import type { GafeteDigital } from "@/lib/cuenta/gafete-digital";
import { rutaPortal } from "@/lib/portal/reglas";
import { ESTADOS_VISIBLES, pasosDe, type SolicitudPortal, TIPOS_SOLICITUD } from "@/lib/portal/solicitudes";
import { site } from "@/lib/site";

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Hermosillo" });

/** Encabezado de todas las pantallas del portal con sesión. */
export function BarraPortal({ handle, empresa }: { handle: string; empresa: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-linea pb-3">
      <Link href={rutaPortal(handle)} className="min-w-0">
        <p className="truncate text-sm font-semibold text-gris">{empresa}</p>
        <p className="font-titulos text-lg leading-tight font-extrabold">Mi gafete</p>
      </Link>
      <form action={salir}>
        <input type="hidden" name="empresa" value={handle} />
        <button type="submit" className="text-sm font-semibold underline underline-offset-4">Salir</button>
      </form>
    </div>
  );
}

function Pasos({ s }: { s: SolicitudPortal }) {
  if (s.estado === "rechazada" || s.estado === "cancelada") return null;
  const pasos = pasosDe(s.conImpresion);
  const actual = ESTADOS_VISIBLES[s.estado].paso;
  return (
    <ol className="mt-3 flex items-center gap-1" aria-label="Avance">
      {pasos.map((p, i) => {
        const hecho = ESTADOS_VISIBLES[p].paso <= actual;
        return (
          <li key={p} className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
            <span className={`h-1.5 w-full rounded-full ${hecho ? "bg-[#0a7d4f]" : "bg-linea"}`} />
            <span className={`text-[11px] leading-tight ${p === s.estado ? "font-semibold text-tinta" : "text-gris"} ${i > 0 && i < pasos.length - 1 && pasos.length > 3 ? "hidden sm:block" : ""}`}>
              {ESTADOS_VISIBLES[p].nombre}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function ListaSolicitudes({ handle, solicitudes }: { handle: string; solicitudes: SolicitudPortal[] }) {
  if (!solicitudes.length) {
    return <p className="text-sm text-gris">Aún no has hecho solicitudes. Cuando hagas una, aquí ves en qué va.</p>;
  }
  return (
    <ul className="space-y-3">
      {solicitudes.map((s) => {
        const estado = ESTADOS_VISIBLES[s.estado];
        return (
          <li key={`${s.tipo}-${s.id}`} className="rounded-tarjeta-chica border border-linea bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{TIPOS_SOLICITUD[s.tipo].nombre}</p>
                <p className="truncate text-sm text-gris">{s.detalle}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${estado.clase}`}>{estado.nombre}</span>
            </div>
            <Pasos s={s} />
            {s.estado === "rechazada" && s.motivo ? (
              <p className="mt-3 rounded-tarjeta-chica bg-rojo/10 p-3 text-sm"><strong>Motivo:</strong> {s.motivo}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gris">
              <span>Enviada el {fecha(s.creada)}{s.resuelta && s.estado !== "enviada" ? ` · resuelta el ${fecha(s.resuelta)}` : ""}</span>
              {s.estado === "enviada" && s.tipo !== "foto" ? (
                <form action={cancelarSolicitud}>
                  <input type="hidden" name="empresa" value={handle} />
                  <input type="hidden" name="id" value={s.id} />
                  <button type="submit" className="font-semibold text-tinta underline underline-offset-4">Cancelar</button>
                </form>
              ) : s.estado === "enviada" && s.tipo === "foto" ? (
                <Link href={`${rutaPortal(handle)}/solicitar/foto`} className="font-semibold text-tinta underline underline-offset-4">Ver o cambiar</Link>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Opcion({ href, titulo, texto, icono }: { href: string; titulo: string; texto: string; icono: ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-4 rounded-tarjeta-chica border border-linea bg-white p-4 transition-colors hover:border-tinta">
      <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-papel text-xl">{icono}</span>
      <span className="min-w-0">
        <span className="block font-semibold">{titulo}</span>
        <span className="block text-sm text-gris">{texto}</span>
      </span>
      <span aria-hidden className="ml-auto text-gris">›</span>
    </Link>
  );
}

/** Pantalla principal del portal, ya con sesión. */
export function InicioPortal({
  handle,
  empresa,
  nombre,
  conNip,
  digital,
  sello,
  solicitudes,
  aviso,
  pendientes,
}: {
  handle: string;
  empresa: string;
  nombre: string;
  conNip: boolean;
  digital: GafeteDigital | null;
  sello: "vigente" | "expirado" | "baja" | "pendiente" | null;
  solicitudes: SolicitudPortal[];
  aviso?: string | null;
  /** Tipos que ya tienen una solicitud en revisión (no se ofrece otra igual). */
  pendientes: { datos: boolean; reposicion: boolean; foto: boolean };
}) {
  const primerNombre = nombre.trim().split(/\s+/)[0];
  const base = rutaPortal(handle);
  return (
    <div className="mx-auto max-w-md">
      <BarraPortal handle={handle} empresa={empresa} />
      <h1 className="mt-6 text-3xl font-extrabold">{primerNombre ? `Hola, ${primerNombre}` : "¡Hola!"}</h1>
      {aviso ? (
        <div role="status" className="mt-4 rounded-tarjeta border border-[#0a7d4f] bg-[#dff3ea] p-4 text-sm font-medium">{aviso}</div>
      ) : null}

      {digital ? (
        <section className="mt-5" aria-label="Mi gafete digital">
          <GafeteDigitalVista gafete={digital} estado={sello} />
        </section>
      ) : (
        <p className="mt-2 text-gris">Aquí pides cambios a tu gafete y ves en qué van, sin vueltas a {empresa}.</p>
      )}

      <section className="mt-7" aria-labelledby="necesitas">
        <h2 id="necesitas" className="font-titulos text-xl font-extrabold">¿Qué necesitas?</h2>
        <div className="mt-3 space-y-2">
          <Opcion href={`${base}/solicitar/foto`} titulo={pendientes.foto ? "Tu foto nueva está en revisión" : "Cambiar mi foto"} texto={pendientes.foto ? "Puedes mandar otra o cancelar el cambio." : `Tómala con tu celular; ${empresa} la aprueba.`} icono="📷" />
          {pendientes.datos ? null : (
            <Opcion href={`${base}/solicitar/datos`} titulo="Corregir mis datos" texto="Nombre mal escrito, puesto nuevo, área…" icono="✏️" />
          )}
          {pendientes.reposicion ? null : (
            <Opcion href={`${base}/solicitar/reposicion`} titulo="Reponer mi gafete" texto="Si lo perdiste, te lo robaron o se dañó." icono="🪪" />
          )}
        </div>
      </section>

      <section className="mt-7" aria-labelledby="mis-solicitudes">
        <h2 id="mis-solicitudes" className="font-titulos text-xl font-extrabold">Mis solicitudes</h2>
        <p className="mt-1 text-sm text-gris">Te avisamos por correo cuando cambien{conNip ? ", si tu empresa tiene tu correo" : ""}.</p>
        <div className="mt-3">
          <ListaSolicitudes handle={handle} solicitudes={solicitudes} />
        </div>
      </section>

      <div className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
        {conNip ? <Link href={`${base}/nip`} className="font-semibold underline underline-offset-4">Cambiar mi NIP</Link> : null}
        <Link href="/aviso-de-privacidad" className="underline underline-offset-4">Aviso de privacidad</Link>
      </div>
      <p className="mt-4 text-center text-xs text-gris">
        Lo que mandes lo recibe {empresa}, que lo revisa. {site.nombre} lo guarda por encargo de {empresa}.
      </p>
    </div>
  );
}
