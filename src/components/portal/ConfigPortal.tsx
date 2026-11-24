import Link from "next/link";
import { guardarPortal, quitarNip } from "@/app/cuenta/portal/acciones";
import { Bloque, Chips } from "@/components/cuenta/Entrada";
import { Formulario } from "@/components/cuenta/Formulario";
import { BotonNip, NipsATodos } from "@/components/portal/NipsEmpresa";
import { RUTA_SOLICITUDES } from "@/lib/avisos/tipos";

export type PersonaAcceso = {
  id: string;
  nombre: string;
  numero: string | null;
  correo: string | null;
  acceso: { idAcceso: string; temporal: boolean; bloqueado: "no" | "rato" | "empresa"; ultimoIngreso: string | null } | null;
};

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: "America/Hermosillo" });

function ComoEntra({ p }: { p: PersonaAcceso }) {
  const chips: { texto: string; clase: string }[] = [];
  if (p.correo) chips.push({ texto: "Correo", clase: "bg-[#dff3ea] text-[#0a5c3b]" });
  if (p.acceso) {
    if (p.acceso.bloqueado !== "no") chips.push({ texto: p.acceso.bloqueado === "empresa" ? "NIP bloqueado" : "NIP bloqueado un rato", clase: "bg-rojo/10 text-rojo-oscuro" });
    else if (p.acceso.temporal) chips.push({ texto: "NIP por estrenar", clase: "bg-resaltador/40 text-tinta" });
    else chips.push({ texto: "NIP", clase: "bg-[#dff3ea] text-[#0a5c3b]" });
  }
  if (!chips.length) chips.push({ texto: "Sin acceso", clase: "bg-linea text-gris" });
  return (
    <span className="flex flex-wrap gap-1">
      {chips.map((c) => (
        <span key={c.texto} className={`rounded-full px-2 py-0.5 text-xs font-semibold ${c.clase}`}>{c.texto}</span>
      ))}
    </span>
  );
}

export function ConfigPortal({
  empresa,
  handle,
  sugerido,
  activo,
  administra,
  url,
  personas,
  total,
}: {
  empresa: string;
  handle: string | null;
  sugerido: string;
  activo: boolean;
  administra: boolean;
  url: string | null;
  personas: PersonaAcceso[];
  total: number;
}) {
  const conCorreo = personas.filter((p) => p.correo).length;
  const conNip = personas.filter((p) => p.acceso).length;
  const sinAcceso = personas.filter((p) => !p.correo && !p.acceso);
  const paraNip = sinAcceso.filter((p) => p.numero).length;
  const orden = [...personas].sort((a, b) => Number(Boolean(a.correo || a.acceso)) - Number(Boolean(b.correo || b.acceso)));

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm"><Link href={RUTA_SOLICITUDES} className="underline">Solicitudes</Link> / Portal Mi gafete</p>
        <h1 className="mt-2 text-3xl font-extrabold">Portal Mi gafete</h1>
        <p className="mt-2 max-w-3xl text-gris">
          Una dirección propia de {empresa} donde tu gente pide cambiar su foto, corregir sus datos o reponer su gafete, y
          ve en qué va. Tú lo revisas todo en <Link href={RUTA_SOLICITUDES} className="font-semibold text-tinta underline">Solicitudes</Link>.
        </p>
      </div>

      <Bloque titulo="Dirección del portal">
        {administra ? (
          <Formulario accion={guardarPortal} boton="Guardar">
            <label className="block max-w-xl">
              <span className="text-sm font-semibold">Dirección</span>
              <span className="mt-1.5 flex items-stretch overflow-hidden rounded-tarjeta-chica border border-linea bg-white">
                <span className="flex items-center bg-papel px-3 text-sm text-gris">lagafeteria.com/e/</span>
                <input name="handle" defaultValue={handle ?? sugerido} required minLength={3} maxLength={30} autoCapitalize="none" spellCheck={false} className="min-w-0 flex-1 px-3 py-2.5 outline-none" />
              </span>
              <span className="mt-1 block text-xs text-gris">De 3 a 30 caracteres: minúsculas, números y guiones. Es también el «ID de la empresa».</span>
            </label>
            <div className="mt-4">
              <Chips
                etiqueta="¿Abierto?"
                name="activo"
                inicial={activo ? "si" : "no"}
                opciones={[
                  { valor: "si", texto: "Abierto", detalle: "Tu gente puede entrar" },
                  { valor: "no", texto: "Cerrado", detalle: "Nadie puede entrar" },
                ]}
              />
            </div>
          </Formulario>
        ) : (
          <p className="text-sm text-gris">Solo quien administra la empresa puede cambiar la dirección.</p>
        )}
        {url && activo ? (
          <p className="mt-4 rounded-tarjeta-chica bg-papel p-3 text-sm">
            Compártela con tu equipo: <a href={url} className="font-semibold break-all underline" target="_blank" rel="noreferrer">{url}</a>
          </p>
        ) : null}
      </Bloque>

      <Bloque titulo="Cómo entra tu gente">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-tarjeta-chica bg-papel p-4">
            <p className="text-2xl font-extrabold">{conCorreo.toLocaleString("es-MX")}</p>
            <p className="text-sm text-gris">con correo: les llega un código o una liga, sin contraseñas.</p>
          </div>
          <div className="rounded-tarjeta-chica bg-papel p-4">
            <p className="text-2xl font-extrabold">{conNip.toLocaleString("es-MX")}</p>
            <p className="text-sm text-gris">con ID de acceso y NIP de 6 números.</p>
          </div>
          <div className={`rounded-tarjeta-chica p-4 ${sinAcceso.length ? "bg-resaltador/30" : "bg-papel"}`}>
            <p className="text-2xl font-extrabold">{sinAcceso.length.toLocaleString("es-MX")}</p>
            <p className="text-sm text-gris">sin forma de entrar todavía.</p>
          </div>
        </div>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-gris">
          <li>El correo es el de la columna «Correo» de tu equipo.</li>
          <li>Quien no tiene correo entra con su <strong className="text-tinta">ID de acceso</strong> (su número de empleado) y un <strong className="text-tinta">NIP inicial</strong> que tú le das. Al entrar la primera vez crea el suyo.</li>
          <li>Tras 5 NIP equivocados se bloquea 15 minutos; a los 15, hasta que le des un NIP nuevo. Nunca vemos ni guardamos el NIP: solo una huella cifrada.</li>
        </ul>
        {administra && paraNip ? (
          <div className="mt-5 border-t border-linea pt-5">
            <p className="mb-3 text-sm font-semibold">NIP para quienes no tienen correo ({paraNip.toLocaleString("es-MX")} con número de empleado)</p>
            <NipsATodos pendientes={paraNip} handle={handle ?? sugerido} empresa={empresa} />
          </div>
        ) : null}
      </Bloque>

      <Bloque titulo={`Tu equipo${total > personas.length ? ` (primeras ${personas.length.toLocaleString("es-MX")} de ${total.toLocaleString("es-MX")})` : ""}`}>
        {personas.length ? (
          <ul className="divide-y divide-linea">
            {orden.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    <Link href={`/cuenta/equipo/${p.id}`} className="hover:underline">{p.nombre}</Link>
                    {p.numero ? <span className="ml-2 text-sm font-normal text-gris">#{p.numero}</span> : null}
                  </p>
                  <p className="text-xs text-gris">
                    {p.correo ?? "Sin correo"}
                    {p.acceso ? ` · ID ${p.acceso.idAcceso}` : ""}
                    {p.acceso?.ultimoIngreso ? ` · entró el ${fecha(p.acceso.ultimoIngreso)}` : ""}
                  </p>
                </div>
                <ComoEntra p={p} />
                {administra ? (
                  <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 sm:w-auto">
                    <BotonNip
                      empleado={p.id}
                      idAcceso={p.acceso?.idAcceso ?? p.numero ?? ""}
                      pideId={!p.acceso && !p.numero}
                      texto={p.acceso ? (p.acceso.bloqueado !== "no" ? "Desbloquear con NIP nuevo" : "Restablecer NIP") : "Dar NIP"}
                      handle={handle ?? sugerido}
                      empresa={empresa}
                    />
                    {p.acceso ? (
                      <form action={quitarNip}>
                        <input type="hidden" name="empleado" value={p.id} />
                        <button type="submit" className="text-sm text-gris underline underline-offset-4">Quitar NIP</button>
                      </form>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gris">Aún no hay personas en tu equipo.</p>
        )}
      </Bloque>
    </div>
  );
}
