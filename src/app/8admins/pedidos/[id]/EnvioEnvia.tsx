import Link from "next/link";
import { claseBoton, claseBotonSecundario } from "@/components/cuenta/Formulario";
import { RUTA_ADMIN } from "@/lib/admin/ruta";
import { cotizarEnvio, destacadas, ErrorEnvia, enviaActivo, type Tarifa } from "@/lib/envios/envia";
import { armarSobres, sobresEnFrase } from "@/lib/envios/sobres";
import type { DireccionCopiada } from "@/lib/pedidos/reglas";
import type { Pedido } from "@/lib/pedidos/servidor";
import { pesos } from "@/lib/precios";
import { generarGuiaPedido } from "../acciones";

const IVA = 1.16;

/**
 * Envío de un pedido en producción: cuántos sobres armar, las tarifas en vivo
 * de Envia con lo que se gana o se pierde contra lo que se cobró de envío, y
 * la guía en un clic.
 */
export async function EnvioEnvia({
  pedido,
  empresa,
  correo,
  cotizar,
  error,
}: {
  pedido: Pedido;
  empresa: string | null;
  correo: string | null;
  cotizar: boolean;
  error: string | null;
}) {
  const sobres = armarSobres(pedido.piezas);
  const direccion = pedido.direccion as DireccionCopiada | null;
  const cobrado = Number(pedido.envio) * IVA;
  const ruta = `${RUTA_ADMIN}/pedidos/${pedido.id}`;

  let tarifas: Tarifa[] = [];
  let fallo: string | null = null;
  if (cotizar && enviaActivo() && direccion) {
    try {
      tarifas = await cotizarEnvio({ ...direccion, correo, empresa }, sobres, Number(pedido.subtotal));
      if (!tarifas.length) fallo = "Ninguna paquetería cotizó esta ruta.";
    } catch (e) {
      fallo = e instanceof ErrorEnvia ? e.message : "Envia no respondió. Intenta de nuevo en un momento.";
    }
  }
  const { barata, rapida } = destacadas(tarifas);

  return (
    <div id="envio" className="space-y-3 rounded-tarjeta-chica bg-papel p-4">
      <p className="text-sm">
        <strong>Arma {sobresEnFrase(sobres)}.</strong>{" "}
        <span className="text-gris">
          {sobres.map((s) => `${s.pesoKg} kg, ${s.largo} × ${s.ancho} × ${s.alto} cm`).join(" · ")}
        </span>
      </p>
      <p className="text-sm">
        Cobraste de envío: <strong>{cobrado ? `${pesos(cobrado)} con IVA` : "nada (envío gratis)"}</strong>.
      </p>

      {error ? (
        <p role="alert" className="rounded-tarjeta-chica border border-rojo/30 bg-white p-3 text-sm">
          <strong>No se generó la guía.</strong> {error}
        </p>
      ) : null}

      {!enviaActivo() ? (
        <p className="text-sm text-gris">
          Para cotizar y generar guías desde aquí, falta configurar <code>ENVIA_API_KEY</code> y <code>ENVIA_ORIGEN</code> en Cloudflare.
        </p>
      ) : !direccion ? (
        <p className="text-sm text-gris">Este pedido no tiene dirección de envío.</p>
      ) : !cotizar ? (
        <Link href={`${ruta}?cotizar=1#envio`} className={claseBotonSecundario}>
          Cotizar con Envia
        </Link>
      ) : fallo ? (
        <div className="space-y-2">
          <p role="alert" className="text-sm">
            <strong>No se pudo cotizar.</strong> {fallo}
          </p>
          <Link href={`${ruta}?cotizar=1#envio`} className={claseBotonSecundario}>
            Volver a cotizar
          </Link>
        </div>
      ) : (
        <form action={generarGuiaPedido} className="space-y-3">
          <input type="hidden" name="id" value={pedido.id} />
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-semibold">Elige la tarifa (lo que te cobra Envia por la guía)</legend>
            {tarifas.map((t, i) => {
              const margen = cobrado - t.precio;
              const etiqueta = t === barata ? "La más barata" : t === rapida ? "La más rápida" : null;
              return (
                <label
                  key={`${t.paqueteria}|${t.servicio}`}
                  className="flex cursor-pointer flex-wrap items-baseline gap-x-3 gap-y-1 rounded-tarjeta-chica border border-linea bg-white p-3 text-sm has-[:checked]:border-tinta"
                >
                  <input type="radio" name="tarifa" value={`${t.paqueteria}|${t.servicio}`} defaultChecked={i === 0} required />
                  <span className="font-semibold">
                    {t.nombrePaqueteria} · {t.descripcion}
                  </span>
                  {etiqueta ? <span className="rounded-full bg-resaltador/40 px-2 text-xs font-semibold">{etiqueta}</span> : null}
                  <span className="text-gris">{t.entrega ?? (t.dias ? `${t.dias} días` : "")}</span>
                  <span className="ml-auto text-right">
                    <strong>{pesos(t.precio)}</strong>
                    <span className={`block text-xs ${margen >= 0 ? "text-gris" : "text-rojo-oscuro"}`}>
                      {cobrado ? (margen >= 0 ? `Te quedan ${pesos(margen)}` : `Pones ${pesos(-margen)}`) : `Pones ${pesos(t.precio)}`}
                    </span>
                  </span>
                </label>
              );
            })}
          </fieldset>
          <p className="text-sm text-gris">
            Al generarla se cobra de tu saldo en Envia, el pedido pasa a enviado y al cliente le llega el número de guía con la liga de
            rastreo. Si te equivocas, la guía se cancela desde Envia.
          </p>
          <button type="submit" className={claseBoton}>
            Generar guía y marcar como enviado
          </button>
        </form>
      )}
    </div>
  );
}
