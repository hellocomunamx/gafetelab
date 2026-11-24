import type { Metadata } from "next";
import Link from "next/link";
import { Bloque, Entrada } from "@/components/cuenta/Entrada";
import { Formulario } from "@/components/cuenta/Formulario";
import { claseBotonSecundario, claseEntrada } from "@/components/cuenta/clases";
import { AccionesLiga, BotonConfirmado } from "@/components/cuenta/Ligas";
import { correoActivo } from "@/lib/correo";
import { constanciaDe, puedePedir } from "@/lib/cuenta/constancia";
import { camposDe } from "@/lib/cuenta/consultas";
import { ligasDeFotos } from "@/lib/cuenta/fotos";
import {
  CORREOS_POR_ENVIO,
  type EstadoLiga,
  fraseCorreccion,
  QUE_CORREGIR,
  camposPedibles,
  datosPropuestos,
  esEstadoLiga,
  estadosLiga,
  mensajeDeLiga,
  urlDeLiga,
  valorDe,
} from "@/lib/cuenta/ligas";
import { faltanPorCorreo, personasConLiga } from "@/lib/cuenta/ligas-equipo";
import { requerirEmpresa } from "@/lib/cuenta/sesion";
import { normalizar, quien } from "@/lib/cuenta/texto";
import { aprobarPropuesta, aprobarTodas, enviarLigasPorCorreo, guardarAjusteLiga, rechazarPropuesta } from "./acciones";

export const metadata: Metadata = { title: "Liga por persona" };

const RUTA = "/cuenta/equipo/ligas";
const LIMITE = 200;
const POR_APROBAR = 30;
const numero = (n: number) => n.toLocaleString("es-MX");
const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Hermosillo" });

const chip = (activo: boolean) =>
  `rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
    activo ? "border-tinta bg-tinta text-white" : "border-linea bg-white hover:border-tinta"
  }`;
const claseCasilla =
  "cursor-pointer rounded-full border border-linea bg-white px-4 py-2 text-sm font-semibold transition-colors hover:border-tinta has-checked:border-tinta has-checked:bg-tinta has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2";

const FILTROS: { id: EstadoLiga | "sin_correo"; nombre: string }[] = [
  { id: "sin_enviar", nombre: "Sin enviar" },
  { id: "enviada", nombre: "Enviadas, sin respuesta" },
  { id: "pendiente", nombre: "Por aprobar" },
  { id: "rechazada", nombre: "Con corrección pedida" },
  { id: "aprobada", nombre: "Aprobadas" },
  { id: "sin_correo", nombre: "Sin correo" },
];

/** Pedir una corrección: qué (foto, datos o ambos) y por qué. Reabre su liga. */
function PedirCorreccion({ id }: { id: string }) {
  return (
    <Formulario accion={rechazarPropuesta} boton="Pedir corrección" className="rounded-tarjeta-chica bg-papel p-3">
      <input type="hidden" name="id" value={id} />
      <fieldset>
        <legend className="text-sm font-semibold">¿Qué tiene que corregir?</legend>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {QUE_CORREGIR.map((q, i) => (
            <label key={q} className={claseCasilla}>
              <input type="radio" name="que" value={q} defaultChecked={i === 0} className="sr-only" />
              {q}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-3">
        <Entrada
          etiqueta="¿Por qué?"
          name="motivo"
          required
          maxLength={280}
          autoComplete="off"
          placeholder="Por ejemplo: salió oscura y no se ve tu cara."
          ayuda="Se lo mandamos tal cual: «Tu empresa te solicita una corrección de tu foto debido a: …». Después eliges cómo avisarle."
        />
      </div>
    </Formulario>
  );
}

export default async function Ligas({ searchParams }: { searchParams: Promise<{ estado?: string; q?: string; corregir?: string }> }) {
  const { supabase, empresa, administra } = await requerirEmpresa();
  const filtros = await searchParams;

  const [personas, campos, { data: ajuste }, constancia, { data: pendientes }] = await Promise.all([
    personasConLiga(supabase, empresa.id),
    camposDe(supabase, empresa.id),
    supabase.from("empresas").select("liga_campos, liga_foto").eq("id", empresa.id).maybeSingle(),
    constanciaDe(supabase, empresa.id),
    supabase
      .from("propuestas")
      .select("empleado_id, datos, foto_path, enviado_en")
      .eq("empresa_id", empresa.id)
      .eq("estado", "pendiente")
      .order("enviado_en")
      .limit(POR_APROBAR),
  ]);
  const pedibles = camposPedibles(campos);
  const elegidos = ajuste?.liga_campos ?? ["nombre"];
  const conFoto = ajuste?.liga_foto ?? true;
  const conDatos = pedibles.some((c) => elegidos.includes(c.clave));

  // Lo que está por aprobar, con los datos de hoy de cada persona para comparar.
  const { data: fichas } = pendientes?.length
    ? await supabase
        .from("empleados")
        .select("id, nombre, numero_empleado, puesto, departamento, tipo_contrato, datos, foto_path")
        .in("id", pendientes.map((p) => p.empleado_id))
    : { data: [] };
  const fichaDe = new Map((fichas ?? []).map((f) => [f.id, f]));
  const fotos = await ligasDeFotos(supabase, [
    ...(pendientes ?? []).map((p) => p.foto_path),
    ...(fichas ?? []).map((f) => f.foto_path),
  ]);

  const cuenta = (estado: EstadoLiga) => personas.filter((p) => p.estado === estado).length;
  const totalPorAprobar = cuenta("pendiente");
  const sinCorreo = personas.filter((p) => !p.correo).length;
  const porCorreo = faltanPorCorreo(personas).length;
  const puedeCorreo = correoActivo() && puedePedir(constancia);

  const estado = filtros.estado === "sin_correo" || esEstadoLiga(filtros.estado) ? filtros.estado : undefined;
  const q = normalizar(filtros.q?.slice(0, 60) ?? "");
  const filtradas = personas.filter(
    (p) =>
      (!estado || (estado === "sin_correo" ? !p.correo : p.estado === estado)) &&
      (!q || normalizar(`${p.nombre} ${p.numero_empleado ?? ""} ${p.correo ?? ""}`).includes(q)),
  );
  // Recién se pidió una corrección: se ofrece avisarle por correo o WhatsApp.
  const corregida = personas.find((p) => p.id === filtros.corregir && p.estado === "rechazada");
  const liga = (cambios: { estado?: string }) => {
    const parametros = new URLSearchParams();
    if (cambios.estado) parametros.set("estado", cambios.estado);
    if (filtros.q) parametros.set("q", filtros.q);
    const texto = parametros.toString();
    return `${RUTA}${texto ? `?${texto}` : ""}#personas`;
  };

  return (
    <div className="space-y-5">
      <p className="text-sm"><Link href="/cuenta/equipo" className="underline">Equipo</Link> / Liga por persona</p>
      <div>
        <h1 className="text-3xl font-extrabold">Liga por persona</h1>
        <p className="mt-2 max-w-3xl text-gris">
          Cada persona de tu equipo tiene su propia liga para subir su foto y revisar o completar sus datos desde el
          celular, sin crear cuenta. Tú eliges qué se pide; todos reciben las mismas preguntas, cada quien con sus
          propios datos ya llenos. Nada cambia en su gafete hasta que tú lo apruebas.
        </p>
      </div>

      {corregida ? (
        <section id="aviso" role="status" className="scroll-mt-4 rounded-tarjeta border-2 border-tinta bg-white p-5">
          <h2 className="text-lg font-extrabold">Listo. Ahora avísale a {quien(corregida)}</h2>
          <p className="mt-1 text-sm text-gris">
            Le diremos: «{fraseCorreccion(empresa.nombre, corregida.motivo ?? "")}» Lo verá al abrir su liga, pero no le
            llega ningún aviso solo. Mándale el mensaje con su liga:
          </p>
          <div className="mt-3">
            <AccionesLiga
              id={corregida.id}
              url={urlDeLiga(corregida.liga)}
              mensaje={mensajeDeLiga({ nombre: corregida.nombre, empresa: empresa.nombre, url: urlDeLiga(corregida.liga), conDatos, conFoto, correccion: corregida.motivo })}
              correo={puedeCorreo ? corregida.correo : null}
              correccion
            />
          </div>
          {!corregida.correo ? (
            <p className="mt-2 text-xs text-gris">No tiene correo guardado; por eso solo aparece WhatsApp.</p>
          ) : !puedeCorreo ? (
            <p className="mt-2 text-xs text-gris">
              «Enviar por correo» aparece cuando tu empresa está verificada.{" "}
              <Link href="/cuenta/verificacion" className="underline">Verificar mi empresa</Link>
            </p>
          ) : null}
        </section>
      ) : null}

      {personas.length === 0 ? (
        <div className="rounded-tarjeta border border-dashed border-linea bg-white p-8 text-center">
          <p className="font-semibold">Primero sube a tu equipo.</p>
          <p className="mt-1 text-gris">Con el nombre basta. Si en el Excel pones su correo, después les mandas su liga con un botón.</p>
          <Link href="/cuenta/equipo/importar" className={`${claseBotonSecundario} mt-4`}>Importar con Excel</Link>
        </div>
      ) : null}

      {pendientes?.length ? (
        <Bloque>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold">Por aprobar ({numero(totalPorAprobar)})</h2>
              <p className="mt-1 text-sm text-gris">
                Esto mandó cada persona. Al aprobar, sus datos y su foto pasan a su ficha.
                {totalPorAprobar > POR_APROBAR ? ` Se muestran las primeras ${POR_APROBAR}.` : ""}
              </p>
            </div>
            {totalPorAprobar > 1 ? (
              <BotonConfirmado
                accion={aprobarTodas}
                texto={`Aprobar ${totalPorAprobar > 200 ? "las primeras 200" : `las ${numero(totalPorAprobar)}`}`}
                pregunta="Se aprueba todo lo que está por aprobar, tal como lo mandó cada persona. Revisa antes las fotos."
                confirmar="Sí, aprobar todo"
                ocupado="Aprobando…"
                secundario
              />
            ) : null}
          </div>
          <ul className="grid gap-4 lg:grid-cols-2">
            {pendientes.map((p) => {
              const ficha = fichaDe.get(p.empleado_id);
              if (!ficha) return null;
              const propuestos = datosPropuestos(p.datos);
              const cambios = pedibles
                .filter((c) => c.clave in propuestos && propuestos[c.clave].trim() !== valorDe(ficha, c.clave).trim())
                .map((c) => ({ etiqueta: c.etiqueta, antes: valorDe(ficha, c.clave), ahora: propuestos[c.clave] }));
              const fotoNueva = p.foto_path ? fotos.get(p.foto_path) : undefined;
              const fotoAnterior = ficha.foto_path ? fotos.get(ficha.foto_path) : undefined;
              return (
                <li key={p.empleado_id} className="rounded-tarjeta-chica border border-linea p-4">
                  <div className="flex items-start gap-4">
                    {fotoNueva ? (
                      // eslint-disable-next-line @next/next/no-img-element -- liga temporal de almacenamiento privado
                      <img src={fotoNueva} alt={`Foto que mandó ${quien(ficha)}`} width={96} height={128} className="aspect-[3/4] w-24 shrink-0 rounded-tarjeta-chica object-cover" />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">
                        <Link href={`/cuenta/equipo/${ficha.id}`} className="hover:underline">{quien(ficha)}</Link>
                      </p>
                      <p className="text-xs text-gris">Lo mandó el {fechaHora(p.enviado_en)}</p>
                      {cambios.length ? (
                        <dl className="mt-2 space-y-1.5 text-sm">
                          {cambios.map((c) => (
                            <div key={c.etiqueta}>
                              <dt className="text-xs text-gris">{c.etiqueta}</dt>
                              <dd className="break-words">
                                {c.antes ? <span className="text-gris line-through">{c.antes}</span> : <span className="text-gris">Vacío</span>}{" "}
                                <span aria-hidden>→</span> <strong>{c.ahora || "Vacío"}</strong>
                              </dd>
                            </div>
                          ))}
                        </dl>
                      ) : (
                        <p className="mt-2 text-sm text-gris">Confirmó sus datos sin cambios.</p>
                      )}
                      {fotoNueva ? (
                        <p className="mt-2 text-sm text-gris">{fotoAnterior ? "Foto nueva: reemplaza la que tenía." : "Foto nueva."}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-1 flex flex-wrap items-start gap-x-4">
                    <Formulario accion={aprobarPropuesta} boton="Aprobar">
                      <input type="hidden" name="id" value={ficha.id} />
                    </Formulario>
                    <details className="mt-5 min-w-0 flex-1 text-sm">
                      <summary className="cursor-pointer list-none py-2.5 font-semibold text-rojo-oscuro underline underline-offset-4 [&::-webkit-details-marker]:hidden">
                        Pedir una corrección
                      </summary>
                      <PedirCorreccion id={ficha.id} />
                    </details>
                  </div>
                </li>
              );
            })}
          </ul>
        </Bloque>
      ) : null}

      <Bloque titulo="Qué le pides a cada persona">
        <Formulario accion={guardarAjusteLiga} boton="Guardar">
          <fieldset disabled={!administra}>
            <legend className="text-sm text-gris">
              Toca lo que quieres que cada quien revise o llene; aplica a todas las ligas. Lo que no elijas no lo ven ni lo
              pueden cambiar. Si solo necesitas fotos, deja marcada nada más la fotografía.
            </legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {pedibles.map((c) => (
                <label key={c.clave} className={claseCasilla}>
                  <input type="checkbox" name={`pedir_${c.clave}`} defaultChecked={elegidos.includes(c.clave)} className="sr-only" />
                  {c.etiqueta}
                </label>
              ))}
              <label className={claseCasilla}>
                <input type="checkbox" name="pedir_foto" defaultChecked={conFoto} className="sr-only" />
                Fotografía
              </label>
            </div>
          </fieldset>
          <p className="mt-3 text-sm text-gris">
            ¿Te falta un dato, como tipo de sangre o contacto de emergencia?{" "}
            <Link href="/cuenta/campos" className="underline">Agrégalo en Datos del equipo</Link> y aparece aquí.
            {administra ? "" : " Solo quien administra la empresa puede cambiar esta lista."}
          </p>
        </Formulario>
      </Bloque>

      {personas.length ? (
        <>
          <Bloque titulo="Manda las ligas">
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <h3 className="font-titulos text-lg font-extrabold">Por correo, a todos de una vez</h3>
                {porCorreo ? (
                  <>
                    <p className="mt-1 mb-3 text-sm text-gris">
                      {numero(porCorreo)} {porCorreo === 1 ? "persona tiene correo y todavía no recibe" : "personas tienen correo y todavía no reciben"} su liga.
                      A cada quien le llega un correo con su nombre y su liga personal; si responden, la respuesta te llega a ti.
                    </p>
                    {puedeCorreo ? (
                      <BotonConfirmado
                        accion={enviarLigasPorCorreo}
                        texto={`Enviar la liga por correo a ${numero(Math.min(porCorreo, CORREOS_POR_ENVIO))} ${porCorreo === 1 ? "persona" : "personas"}`}
                        pregunta={`Se manda un correo a ${numero(Math.min(porCorreo, CORREOS_POR_ENVIO))} ${porCorreo === 1 ? "persona" : "personas"} con su liga personal. Revisa antes que arriba esté elegido lo que quieres pedir.`}
                        confirmar="Sí, enviar los correos"
                      />
                    ) : (
                      <p className="rounded-tarjeta-chica bg-resaltador/30 p-3 text-sm">
                        {puedePedir(constancia) ? (
                          "El envío por correo todavía no está activo. Mientras, copia las ligas o mándalas por WhatsApp."
                        ) : (
                          <>
                            Para mandar correos desde la plataforma necesitas tu empresa verificada.{" "}
                            <Link href="/cuenta/verificacion" className="font-semibold underline">Verificar mi empresa</Link>.
                            Mientras, copia las ligas o mándalas por WhatsApp.
                          </>
                        )}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="mt-1 text-sm text-gris">
                    {sinCorreo === personas.length
                      ? "Todavía nadie tiene correo."
                      : "Ya se le mandó su liga a todas las personas que tienen correo."}
                  </p>
                )}
                {sinCorreo ? (
                  <p className="mt-3 text-sm text-gris">
                    {numero(sinCorreo)} {sinCorreo === 1 ? "persona no tiene" : "personas no tienen"} correo. Ponlo en la columna Correo de{" "}
                    <Link href="/cuenta/equipo/importar" className="underline">tu plantilla de Excel</Link> o en la ficha de cada quien.
                  </p>
                ) : null}
              </div>
              <div>
                <h3 className="font-titulos text-lg font-extrabold">Por WhatsApp o como tú quieras</h3>
                <p className="mt-1 mb-3 text-sm text-gris">
                  En la lista de abajo, cada persona trae su botón de WhatsApp con el mensaje ya escrito y otro para
                  copiar su liga. También puedes bajar todas las ligas en un Excel para mandarlas a tu manera.
                </p>
                <a href={`${RUTA}/descargar`} className={claseBotonSecundario}>Descargar todas las ligas en Excel</a>
              </div>
            </div>
          </Bloque>

          <section id="personas" className="scroll-mt-4 space-y-3">
            <h2 className="text-xl font-extrabold">Las ligas de tu equipo</h2>
            <div className="flex flex-wrap gap-2">
              <Link href={liga({})} className={chip(!estado)}>Todas ({numero(personas.length)})</Link>
              {FILTROS.map((f) => {
                const total = f.id === "sin_correo" ? sinCorreo : cuenta(f.id);
                return total || estado === f.id ? (
                  <Link key={f.id} href={liga({ estado: f.id })} className={chip(estado === f.id)}>
                    {f.nombre} ({numero(total)})
                  </Link>
                ) : null;
              })}
            </div>
            <form action={`${RUTA}#personas`} className="flex flex-wrap items-end gap-3">
              {estado ? <input type="hidden" name="estado" value={estado} /> : null}
              <label className="block min-w-0 flex-1 sm:max-w-xs">
                <span className="sr-only">Buscar</span>
                <input name="q" defaultValue={filtros.q ?? ""} placeholder="Buscar por nombre, número o correo" className={claseEntrada} />
              </label>
              <button type="submit" className={claseBotonSecundario}>Buscar</button>
              {filtros.q ? <Link href={liga({ estado })} className="py-2.5 text-sm underline">Limpiar</Link> : null}
            </form>

            {filtradas.length ? (
              <div className="overflow-x-auto rounded-tarjeta border border-linea bg-white">
                <table className="w-full min-w-[46rem] text-left text-sm">
                  <thead className="bg-papel">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-semibold">Persona</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Estado de su liga</th>
                      <th scope="col" className="px-4 py-3 font-semibold">Mandarle su liga</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-linea">
                    {filtradas.slice(0, LIMITE).map((p) => {
                      const url = urlDeLiga(p.liga);
                      return (
                        <tr key={p.id} className="align-top">
                          <th scope="row" className="px-4 py-3 font-medium">
                            <Link href={`/cuenta/equipo/${p.id}`} className="hover:underline">{quien(p)}</Link>
                            <span className="block text-xs font-normal break-all text-gris">
                              {p.correo ?? "Sin correo"}
                            </span>
                          </th>
                          <td className="px-4 py-3">
                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${estadosLiga[p.estado].clase}`}>
                              {estadosLiga[p.estado].nombre}
                            </span>
                            {p.estado === "aprobada" ? (
                              <details className="mt-1 text-xs">
                                <summary className="cursor-pointer font-semibold underline underline-offset-4">Reabrir con una corrección</summary>
                                <div className="mt-2 w-72 text-sm">
                                  <PedirCorreccion id={p.id} />
                                </div>
                              </details>
                            ) : null}
                            <span className="mt-1 block text-xs text-gris">
                              {p.estado === "rechazada" && p.motivo
                                ? `Le pediste: ${p.motivo}`
                                : p.estado === "enviada" && p.liga_enviada_en
                                  ? `Se la mandaste el ${fechaHora(p.liga_enviada_en)}`
                                  : p.respondio && p.estado !== "sin_enviar"
                                    ? `Respondió el ${fechaHora(p.respondio)}`
                                    : ""}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <AccionesLiga
                              id={p.id}
                              url={url}
                              mensaje={mensajeDeLiga({ nombre: p.nombre, empresa: empresa.nombre, url, conDatos, conFoto, correccion: p.motivo })}
                              correo={puedeCorreo ? p.correo : null}
                              yaEnviada={p.estado !== "sin_enviar"}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="rounded-tarjeta border border-dashed border-linea bg-white p-6 text-center text-gris">
                Nadie coincide con este filtro.
              </p>
            )}
            {filtradas.length > LIMITE ? (
              <p className="text-sm text-gris">
                Se muestran las primeras {LIMITE} de {numero(filtradas.length)}: usa los filtros o el buscador para acotar.
              </p>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}
