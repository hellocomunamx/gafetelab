import Link from "next/link";
import { pedirFactura } from "@/app/cuenta/pedidos/factura-acciones";
import { Seleccion } from "@/components/cuenta/Entrada";
import { Formulario } from "@/components/cuenta/Formulario";
import { usosCfdi } from "@/lib/cuenta/catalogos";
import { fechaLarga } from "@/lib/cuenta/constancia";
import { requerirEmpresa } from "@/lib/cuenta/sesion";
import { dentroDelPlazo, nombreUso, plazoFactura } from "@/lib/facturas";
import type { FacturacionCopiada } from "@/lib/pedidos/reglas";

type Props = {
  pedido: { id: string; estado: string; pagado_en: string | null; creado_en: string };
  /** La copia de los datos de facturación guardada en el pedido, o null si no pidió factura. */
  datos: FacturacionCopiada | null;
};

/**
 * La factura de un pedido en la cuenta de la empresa: si está en proceso, sus
 * archivos cuando ya se emitió, o la forma para pedirla dentro del plazo.
 */
export async function FacturaDelPedido({ pedido, datos }: Props) {
  const { supabase, empresa, administra } = await requerirEmpresa();
  const [{ data: factura }, { data: fiscales }] = await Promise.all([
    supabase.from("facturas").select("estado, folio_fiscal, pdf_ruta, xml_ruta, emitida_en").eq("pedido_id", pedido.id).maybeSingle(),
    supabase.from("datos_fiscales").select("id, rfc, razon_social, uso_cfdi, predeterminado").eq("empresa_id", empresa.id).order("predeterminado", { ascending: false }).order("creado_en"),
  ]);
  const cerrado = pedido.estado === "cancelado" || pedido.estado === "reembolsado";
  const enPlazo = dentroDelPlazo(pedido);
  const archivo = (tipo: "pdf" | "xml") => `/cuenta/pedidos/${pedido.id}/factura/${tipo}`;

  if (factura?.estado === "emitida") {
    return (
      <div className="mt-3 text-sm">
        <p>
          Factura emitida{factura.emitida_en ? ` el ${fechaLarga(factura.emitida_en)}` : ""} a nombre de{" "}
          <strong>{datos?.razon_social}</strong> ({datos?.rfc}).
        </p>
        {factura.folio_fiscal ? <p className="text-gris">Folio fiscal: {factura.folio_fiscal}</p> : null}
        {factura.pdf_ruta || factura.xml_ruta ? (
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-semibold">
            {factura.pdf_ruta ? <a href={archivo("pdf")} className="text-rojo underline underline-offset-4">Descargar PDF</a> : null}
            {factura.xml_ruta ? <a href={archivo("xml")} className="text-rojo underline underline-offset-4">Descargar XML</a> : null}
          </p>
        ) : (
          <p className="text-gris">Te la mandamos a {datos?.correo}.</p>
        )}
      </div>
    );
  }
  if (factura?.estado === "cancelada") {
    return <p className="mt-3 text-sm">La factura de este pedido se canceló en el SAT.</p>;
  }

  const forma =
    administra && !cerrado && enPlazo ? (
      fiscales?.length ? (
        <Formulario accion={pedirFactura} boton={datos ? "Guardar cambios" : "Pedir factura"} className="mt-3 rounded-tarjeta-chica bg-papel p-4">
          <input type="hidden" name="id" value={pedido.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Seleccion etiqueta="A nombre de" name="datos" required defaultValue={fiscales.find((f) => f.rfc === datos?.rfc)?.id ?? fiscales[0].id}>
              {fiscales.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.razon_social} ({f.rfc})
                </option>
              ))}
            </Seleccion>
            <Seleccion etiqueta="Uso del CFDI" name="uso_cfdi" required defaultValue={datos?.uso_cfdi ?? fiscales[0].uso_cfdi}>
              {usosCfdi.map((u) => (
                <option key={u.clave} value={u.clave}>
                  {u.clave} · {u.nombre}
                </option>
              ))}
            </Seleccion>
          </div>
          <p className="mt-2 text-xs text-gris">
            Los datos salen de tu Constancia de Situación Fiscal. Revísalos bien: una factura emitida ya no se puede cambiar.{" "}
            <Link href="/cuenta/datos#facturacion" className="underline">Editar datos de facturación</Link>
          </p>
        </Formulario>
      ) : (
        <p className="mt-2 text-sm">
          <Link href="/cuenta/datos#facturacion" className="font-semibold text-rojo underline underline-offset-4">
            Agrega tus datos de facturación
          </Link>{" "}
          para pedir la factura de este pedido.
        </p>
      )
    ) : null;

  if (datos) {
    return (
      <div className="mt-3 text-sm">
        <p>
          Factura a nombre de <strong>{datos.razon_social}</strong> ({datos.rfc}), uso {[datos.uso_cfdi, nombreUso(datos.uso_cfdi)].filter(Boolean).join(" · ")}.
        </p>
        <p className="text-gris">
          {cerrado ? "El pedido se canceló, así que no lleva factura." : `En proceso. Te llega a ${datos.correo} y aquí podrás descargarla.`}
        </p>
        {forma ? (
          <details className="mt-2">
            <summary className="cursor-pointer font-semibold underline underline-offset-4">Cambiar datos de la factura</summary>
            {forma}
          </details>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-3 text-sm">
      <p>Sin factura.</p>
      {forma ? (
        <>
          <p className="text-gris">¿La necesitas? Puedes pedirla hasta el {fechaLarga(plazoFactura(pedido).toISOString())}.</p>
          {forma}
        </>
      ) : null}
    </div>
  );
}
