import Link from "next/link";
import { aprobarCambioFoto, rechazarCambioFoto } from "@/app/cuenta/equipo/cambios-foto/acciones";
import { aprobarSolicitud, rechazarSolicitud } from "@/app/cuenta/solicitudes/acciones";
import { Bloque, Chips, Entrada } from "@/components/cuenta/Entrada";
import { Formulario } from "@/components/cuenta/Formulario";
import { RUTA_AVISOS } from "@/lib/avisos/tipos";
import { pesos, REQUISITOS, type Requisito } from "@/lib/cuenta/reposicion";
import { RUTA_PORTAL_EMPRESA } from "@/lib/portal/reglas";
import { CAUSAS_REPOSICION, type CausaReposicion, ESTADOS_VISIBLES, type EstadoVisible, TIPOS_SOLICITUD, type TipoSolicitud } from "@/lib/portal/solicitudes";

/* eslint-disable @next/next/no-img-element -- ligas temporales de almacenamiento privado */

export type Pendiente = { id: string; empleadoId: string; persona: string; creada: string; conImpreso: boolean } & (
  | { tipo: "foto"; anterior?: string; nueva?: string; aceptoImpreso: boolean }
  | { tipo: "datos"; cambios: { etiqueta: string; antes: string; despues: string }[]; nota: string | null }
  | { tipo: "reposicion"; causa: CausaReposicion | null; requisitos: Requisito[]; costo: number; nota: string | null; comprobante?: string }
);

export type Seguimiento = { id: string; tipo: TipoSolicitud; empleadoId: string; persona: string; estado: EstadoVisible; fecha: string; motivo: string | null };

const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Hermosillo" });

function Foto({ src, etiqueta, nueva = false }: { src?: string; etiqueta: string; nueva?: boolean }) {
  return (
    <figure className="min-w-0 flex-1 text-center">
      {src ? (
        <img src={src} alt={etiqueta} width={150} height={200} className={`mx-auto aspect-[3/4] w-full max-w-32 rounded-tarjeta-chica object-cover ${nueva ? "ring-4 ring-resaltador" : ""}`} />
      ) : (
        <div className="mx-auto flex aspect-[3/4] w-full max-w-32 items-center justify-center rounded-tarjeta-chica bg-papel text-xs text-gris">Sin foto</div>
      )}
      <figcaption className="mt-1.5 text-xs font-semibold text-gris">{etiqueta}</figcaption>
    </figure>
  );
}

function Rechazar({ id, foto, ejemplo }: { id: string; foto: boolean; ejemplo: string }) {
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer font-semibold text-rojo-oscuro underline underline-offset-4">No aprobar</summary>
      <Formulario accion={foto ? rechazarCambioFoto : rechazarSolicitud} boton="No aprobar" className="mt-2 rounded-tarjeta-chica bg-papel p-3">
        <input type="hidden" name="id" value={id} />
        <Entrada etiqueta="¿Por qué?" name="motivo" required maxLength={300} placeholder={ejemplo} ayuda="Lo ve en su portal y le llega por correo." />
      </Formulario>
    </details>
  );
}

function Tarjeta({ p }: { p: Pendiente }) {
  return (
    <li className="rounded-tarjeta-chica border border-linea p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">
            <Link href={`/cuenta/equipo/${p.empleadoId}`} className="hover:underline">{p.persona}</Link>
          </p>
          <p className="text-xs text-gris">{fechaHora(p.creada)}</p>
        </div>
        <span className="shrink-0 rounded-full bg-papel px-2.5 py-1 text-xs font-semibold">{TIPOS_SOLICITUD[p.tipo].nombre}</span>
      </div>

      {p.tipo === "foto" ? (
        <>
          <div className="mt-3 flex items-start gap-3">
            <Foto src={p.anterior} etiqueta="Anterior" />
            <span aria-hidden className="mt-14 text-2xl text-gris">→</span>
            <Foto src={p.nueva} etiqueta="Nueva" nueva />
          </div>
          <Formulario accion={aprobarCambioFoto} boton="Aprobar foto" className="mt-4">
            <input type="hidden" name="id" value={p.id} />
            {p.conImpreso ? (
              <div className="rounded-tarjeta-chica bg-resaltador/20 p-3">
                <p className="mb-2 text-sm"><strong>Tiene gafete impreso.</strong> Con la foto nueva ya no coincide.{p.aceptoImpreso ? " Ya aceptó que necesita uno nuevo." : ""}</p>
                <Chips etiqueta="¿Su gafete impreso?" name="reponer" inicial="si" opciones={[{ valor: "si", texto: "Sumar reposición al pedido abierto" }, { valor: "no", texto: "Sin reimprimir por ahora" }]} />
              </div>
            ) : null}
          </Formulario>
          <Rechazar id={p.id} foto ejemplo="Por ejemplo: la foto está oscura o trae lentes oscuros." />
        </>
      ) : p.tipo === "datos" ? (
        <>
          <dl className="mt-3 space-y-2 text-sm">
            {p.cambios.map((c) => (
              <div key={c.etiqueta} className="rounded-tarjeta-chica bg-papel p-3">
                <dt className="text-xs font-semibold text-gris">{c.etiqueta}</dt>
                <dd className="mt-0.5">
                  <span className="text-gris line-through decoration-rojo/60">{c.antes || "(vacío)"}</span>
                  <span aria-hidden className="mx-2 text-gris">→</span>
                  <strong>{c.despues || "(vacío)"}</strong>
                </dd>
              </div>
            ))}
          </dl>
          {p.nota ? <p className="mt-2 text-sm"><span className="text-gris">Nota:</span> {p.nota}</p> : null}
          <Formulario accion={aprobarSolicitud} boton="Aprobar cambios" className="mt-4">
            <input type="hidden" name="id" value={p.id} />
            {p.conImpreso ? (
              <Chips etiqueta="¿Reimprimir su gafete?" name="reponer" inicial="si" opciones={[{ valor: "si", texto: "Sumar al pedido abierto" }, { valor: "no", texto: "Solo actualizar su ficha" }]} />
            ) : (
              <input type="hidden" name="reponer" value="no" />
            )}
          </Formulario>
          <Rechazar id={p.id} foto={false} ejemplo="Por ejemplo: tu puesto oficial sigue siendo Auxiliar." />
        </>
      ) : (
        <>
          <p className="mt-3 font-semibold">{p.causa ? CAUSAS_REPOSICION[p.causa] : "Reposición"}</p>
          <ul className="mt-2 space-y-1 text-sm">
            {p.requisitos.map((r) => <li key={r}>✓ {REQUISITOS[r]}</li>)}
            <li className="text-gris">{p.costo > 0 ? `Aceptó el costo de ${pesos(p.costo)} (lo cobras tú).` : "Sin costo para la persona."}</li>
          </ul>
          {p.nota ? <p className="mt-2 text-sm"><span className="text-gris">Nota:</span> {p.nota}</p> : null}
          {p.comprobante ? (
            <a href={p.comprobante} target="_blank" rel="noreferrer" className="mt-3 block">
              <img src={p.comprobante} alt="Documento que subió" className="max-h-40 rounded-tarjeta-chica border border-linea" />
              <span className="text-xs font-semibold underline">Ver documento</span>
            </a>
          ) : null}
          <Formulario accion={aprobarSolicitud} boton="Aprobar reposición" className="mt-4">
            <input type="hidden" name="id" value={p.id} />
            <Chips etiqueta="¿Su gafete nuevo?" name="reponer" inicial="si" opciones={[{ valor: "si", texto: "Sumar al pedido abierto" }, { valor: "no", texto: "Lo resuelvo por fuera" }]} />
          </Formulario>
          <Rechazar id={p.id} foto={false} ejemplo="Por ejemplo: primero entrega la carta firmada en RH." />
        </>
      )}
    </li>
  );
}

export function Bandeja({
  pendientes,
  enCurso,
  resueltas,
  filtro,
  conteo,
  portalActivo,
}: {
  pendientes: Pendiente[];
  enCurso: Seguimiento[];
  resueltas: Seguimiento[];
  filtro: TipoSolicitud | null;
  conteo: Record<TipoSolicitud, number>;
  portalActivo: boolean;
}) {
  const total = conteo.foto + conteo.datos + conteo.reposicion;
  const chip = (valor: TipoSolicitud | null, texto: string, n: number) => (
    <Link
      key={texto}
      href={valor ? `?tipo=${valor}` : "?"}
      aria-current={filtro === valor ? "page" : undefined}
      className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${filtro === valor ? "bg-tinta text-white" : "border border-linea bg-white hover:border-tinta"}`}
    >
      {texto}{n ? ` (${n.toLocaleString("es-MX")})` : ""}
    </Link>
  );
  const fila = (s: Seguimiento) => {
    const e = ESTADOS_VISIBLES[s.estado];
    return (
      <li key={`${s.tipo}-${s.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3 text-sm first:pt-0 last:pb-0">
        <Link href={`/cuenta/equipo/${s.empleadoId}`} className="font-semibold hover:underline">{s.persona}</Link>
        <span className="text-gris">{TIPOS_SOLICITUD[s.tipo].nombre}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${e.clase}`}>{e.nombre}</span>
        <span className="text-gris">{fechaHora(s.fecha)}{s.motivo ? ` · ${s.motivo}` : ""}</span>
      </li>
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold">Solicitudes</h1>
        <p className="mt-2 max-w-3xl text-gris">
          Lo que tu gente pide desde Mi gafete: cambios de foto, correcciones de datos y reposiciones. Al aprobar o no,
          le avisamos por correo y lo ve en su portal, con el avance de su gafete nuevo hasta que llega.
        </p>
        <p className="mt-2 text-sm">
          <Link href={RUTA_PORTAL_EMPRESA} className="font-semibold underline underline-offset-4">{portalActivo ? "Portal y accesos (NIP)" : "Abre tu portal Mi gafete"}</Link>
          <span className="text-gris"> · </span>
          <Link href={RUTA_AVISOS} className="underline underline-offset-4">Cómo te avisamos</Link>
        </p>
      </div>

      <Bloque titulo={`Por revisar${total ? ` (${total.toLocaleString("es-MX")})` : ""}`}>
        <div className="mb-4 flex flex-wrap gap-2">
          {chip(null, "Todas", 0)}
          {chip("foto", "Fotos", conteo.foto)}
          {chip("datos", "Datos", conteo.datos)}
          {chip("reposicion", "Reposiciones", conteo.reposicion)}
        </div>
        {pendientes.length ? (
          <ul className="grid gap-4 lg:grid-cols-2">{pendientes.map((p) => <Tarjeta key={`${p.tipo}-${p.id}`} p={p} />)}</ul>
        ) : (
          <p className="text-gris">No hay nada por revisar.</p>
        )}
      </Bloque>

      {enCurso.length ? (
        <Bloque titulo="Gafetes nuevos en camino">
          <ul className="divide-y divide-linea">{enCurso.map(fila)}</ul>
        </Bloque>
      ) : null}

      {resueltas.length ? (
        <Bloque titulo="Resueltas hace poco">
          <ul className="divide-y divide-linea">{resueltas.map(fila)}</ul>
        </Bloque>
      ) : null}
    </div>
  );
}
