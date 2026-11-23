import type { Metadata } from "next";
import Link from "next/link";
import {
  borrarDatosFiscales,
  borrarDireccion,
  guardarDatosFiscales,
  guardarDireccion,
  guardarEmpresa,
  predeterminarDireccion,
} from "@/app/cuenta/acciones";
import { Confirmar } from "@/components/cuenta/Confirmar";
import { Bloque, Entrada, Seleccion } from "@/components/cuenta/Entrada";
import { Formulario } from "@/components/cuenta/Formulario";
import { GiroChips } from "@/components/cuenta/GiroChips";
import { estadosMexico, regimenesFiscales, usosCfdi } from "@/lib/cuenta/catalogos";
import { opcionesGiro } from "@/lib/giros";
import { requerirEmpresa } from "@/lib/cuenta/sesion";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Envío y facturación" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const etiquetaChica = "rounded-full bg-resaltador/50 px-2 py-0.5 text-xs font-semibold";

export default async function Datos({
  searchParams,
}: {
  searchParams: Promise<{ dir?: string; rfc?: string }>;
}) {
  const { supabase, empresa, administra } = await requerirEmpresa();
  const q = await searchParams;
  const [{ data: direcciones }, { data: fiscales }] = await Promise.all([
    supabase.from("direcciones").select("*").eq("empresa_id", empresa.id).order("predeterminada", { ascending: false }).order("creado_en"),
    supabase.from("datos_fiscales").select("*").eq("empresa_id", empresa.id).order("predeterminado", { ascending: false }).order("creado_en"),
  ]);
  const dir = UUID.test(q.dir ?? "") ? direcciones?.find((d) => d.id === q.dir) : undefined;
  const rfc = UUID.test(q.rfc ?? "") ? fiscales?.find((f) => f.id === q.rfc) : undefined;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">Envío y facturación</h1>
      <p className="max-w-2xl text-gris">
        Guarda aquí tus datos una sola vez. Al hacer un pedido solo eliges a dónde va y a nombre de
        quién se factura.
      </p>

      {administra ? null : (
        <p className="rounded-tarjeta-chica bg-resaltador/30 p-4 text-sm">
          Puedes ver estos datos, pero solo quien administra la empresa puede cambiarlos. Si hace
          falta un cambio, pídeselo a alguien con rol de dueño o administrador en{" "}
          <Link href="/cuenta/usuarios" className="font-semibold underline underline-offset-4">Usuarios</Link>.
        </p>
      )}

      <Bloque titulo="Tu empresa">
        {administra ? (
          <Formulario accion={guardarEmpresa} boton="Guardar">
            <div className="space-y-5">
              <Entrada etiqueta="Nombre de la empresa" name="nombre" required maxLength={120} defaultValue={empresa.nombre} className="max-w-md" />
              <GiroChips opciones={opcionesGiro} inicial={empresa.giro ?? ""} />
            </div>
          </Formulario>
        ) : (
          <p>
            <strong>{empresa.nombre}</strong>
            {empresa.giro ? <span className="text-gris"> · {empresa.giro}</span> : null}
          </p>
        )}
      </Bloque>

      <Bloque titulo="Direcciones de envío">
        {direcciones?.length ? (
          <ul className="mb-6 grid gap-3 sm:grid-cols-2">
            {direcciones.map((d) => (
              <li key={d.id} className="rounded-tarjeta-chica border border-linea p-4 text-sm">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {d.alias || d.destinatario}
                  {d.predeterminada ? <span className={etiquetaChica}>Predeterminada</span> : null}
                </p>
                <p className="mt-1 text-gris">
                  {d.alias ? `${d.destinatario}. ` : ""}
                  {d.calle}, {d.colonia}, {d.ciudad}, {d.estado}, C.P. {d.cp}. Tel. {d.telefono}
                </p>
                <div className={administra ? "mt-3 flex flex-wrap items-start gap-x-4 gap-y-2" : "hidden"}>
                  <Link href={`/cuenta/datos?dir=${d.id}#direccion`} className="font-semibold underline underline-offset-4">Editar</Link>
                  {d.predeterminada ? null : (
                    <form action={predeterminarDireccion}>
                      <input type="hidden" name="id" value={d.id} />
                      <button type="submit" className="font-semibold underline underline-offset-4">Usar siempre</button>
                    </form>
                  )}
                  <Confirmar accion={borrarDireccion} id={d.id} texto="Borrar" confirmar="Sí, borrar" />
                </div>
              </li>
            ))}
          </ul>
        ) : administra ? null : (
          <p className="text-sm text-gris">Todavía no hay direcciones guardadas.</p>
        )}

        {administra ? (
        <>
        <h3 id="direccion" className="scroll-mt-28 font-titulos text-lg font-bold">
          {dir ? "Editar dirección" : "Agregar dirección"}
        </h3>
        <Formulario key={dir?.id ?? "nueva"} accion={guardarDireccion} boton={dir ? "Guardar cambios" : "Guardar dirección"} limpiarAlGuardar={!dir} className="mt-3">
          {dir ? <input type="hidden" name="id" value={dir.id} /> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Entrada etiqueta="Nombre para identificarla (opcional)" name="alias" maxLength={60} placeholder="Oficina, Sucursal centro" defaultValue={dir?.alias ?? ""} />
            <Entrada etiqueta="Quién recibe" name="destinatario" required maxLength={120} autoComplete="name" defaultValue={dir?.destinatario} />
            <Entrada etiqueta="Teléfono" name="telefono" type="tel" required maxLength={30} autoComplete="tel" defaultValue={dir?.telefono} ayuda="A 10 dígitos, para la paquetería." />
            <Entrada etiqueta="Calle y número" name="calle" required maxLength={160} autoComplete="address-line1" defaultValue={dir?.calle} />
            <Entrada etiqueta="Colonia" name="colonia" required maxLength={120} autoComplete="address-line2" defaultValue={dir?.colonia} />
            <Entrada etiqueta="Ciudad o municipio" name="ciudad" required maxLength={120} autoComplete="address-level2" defaultValue={dir?.ciudad} />
            <Seleccion etiqueta="Estado" name="estado" required autoComplete="address-level1" defaultValue={dir?.estado ?? ""}>
              <option value="" disabled>Elige</option>
              {estadosMexico.map((e) => (
                <option key={e}>{e}</option>
              ))}
            </Seleccion>
            <Entrada etiqueta="Código postal" name="cp" required inputMode="numeric" pattern="[0-9]{5}" maxLength={5} autoComplete="postal-code" defaultValue={dir?.cp} />
            <Entrada etiqueta="Referencias (opcional)" name="referencias" maxLength={240} defaultValue={dir?.referencias ?? ""} className="sm:col-span-2" />
          </div>
          <label className="mt-4 inline-flex items-center gap-2 text-sm">
            <input type="checkbox" name="predeterminada" defaultChecked={dir?.predeterminada} className="size-4 accent-tinta" />
            Usar siempre esta dirección
          </label>
        </Formulario>
        {dir ? <p className="mt-3 text-sm"><Link href="/cuenta/datos" className="underline">Cancelar</Link></p> : null}
        </>
        ) : null}
      </Bloque>

      <section id="facturacion" className="scroll-mt-28 rounded-tarjeta border border-linea bg-white p-5 sm:p-6">
        <h2 className="mb-4 text-xl font-extrabold">Datos de facturación</h2>
        <p className="mb-5 rounded-tarjeta-chica bg-resaltador/30 p-4 text-sm">
          <strong>Revisa bien tus datos.</strong> La factura (CFDI) se pide dentro de los{" "}
          {site.plazoFacturaDias} días posteriores a tu pedido y, una vez emitida, no se puede
          modificar. Captúralos tal como aparecen en tu{" "}
          Constancia de Situación Fiscal del SAT.
        </p>

        {fiscales?.length ? (
          <ul className="mb-6 grid gap-3 sm:grid-cols-2">
            {fiscales.map((f) => (
              <li key={f.id} className="rounded-tarjeta-chica border border-linea p-4 text-sm">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {f.razon_social}
                  {f.predeterminado ? <span className={etiquetaChica}>Predeterminado</span> : null}
                </p>
                <p className="mt-1 text-gris">
                  RFC {f.rfc}. Régimen {f.regimen_fiscal}, uso {f.uso_cfdi}, C.P. {f.cp_fiscal}. {f.correo}
                </p>
                <div className={administra ? "mt-3 flex flex-wrap items-start gap-x-4 gap-y-2" : "hidden"}>
                  <Link href={`/cuenta/datos?rfc=${f.id}#facturacion-forma`} className="font-semibold underline underline-offset-4">Editar</Link>
                  <Confirmar accion={borrarDatosFiscales} id={f.id} texto="Borrar" confirmar="Sí, borrar" />
                </div>
              </li>
            ))}
          </ul>
        ) : administra ? null : (
          <p className="text-sm text-gris">Todavía no hay datos de facturación guardados.</p>
        )}

        {administra ? (
        <>
        <h3 id="facturacion-forma" className="scroll-mt-28 font-titulos text-lg font-bold">
          {rfc ? "Editar datos de facturación" : "Agregar datos de facturación"}
        </h3>
        <Formulario key={rfc?.id ?? "nuevo"} accion={guardarDatosFiscales} boton={rfc ? "Guardar cambios" : "Guardar datos"} limpiarAlGuardar={!rfc} className="mt-3">
          {rfc ? <input type="hidden" name="id" value={rfc.id} /> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Entrada etiqueta="RFC" name="rfc" required minLength={12} maxLength={13} autoCapitalize="characters" defaultValue={rfc?.rfc} />
            <Entrada etiqueta="Nombre o razón social" name="razon_social" required maxLength={200} defaultValue={rfc?.razon_social} ayuda="Sin el régimen societario (S.A. de C.V.), como pide el SAT." />
            <Seleccion etiqueta="Régimen fiscal" name="regimen_fiscal" required defaultValue={rfc?.regimen_fiscal ?? ""} className="sm:col-span-2">
              <option value="" disabled>Elige</option>
              {regimenesFiscales.map((r) => (
                <option key={r.clave} value={r.clave}>{r.clave} · {r.nombre}</option>
              ))}
            </Seleccion>
            <Entrada etiqueta="Código postal fiscal" name="cp_fiscal" required inputMode="numeric" pattern="[0-9]{5}" maxLength={5} defaultValue={rfc?.cp_fiscal} />
            <Seleccion etiqueta="Uso del CFDI" name="uso_cfdi" required defaultValue={rfc?.uso_cfdi ?? "G03"}>
              {usosCfdi.map((u) => (
                <option key={u.clave} value={u.clave}>{u.clave} · {u.nombre}</option>
              ))}
            </Seleccion>
            <Entrada etiqueta="Correo para recibir facturas" name="correo" type="email" required maxLength={254} autoComplete="email" defaultValue={rfc?.correo} className="sm:col-span-2" />
          </div>
          <label className="mt-4 inline-flex items-center gap-2 text-sm">
            <input type="checkbox" name="predeterminado" defaultChecked={rfc?.predeterminado} className="size-4 accent-tinta" />
            Usar siempre estos datos
          </label>
        </Formulario>
        {rfc ? <p className="mt-3 text-sm"><Link href="/cuenta/datos#facturacion" className="underline">Cancelar</Link></p> : null}
        </>
        ) : null}
      </section>
    </div>
  );
}
