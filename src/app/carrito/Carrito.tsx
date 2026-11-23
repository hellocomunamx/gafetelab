"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, useTransition } from "react";
import { carritoMaximoPiezas, cotizarCarrito } from "@/lib/carrito";
import { cambiarPiezas, quitarDelCarrito, useCarrito, vaciarCarrito } from "@/lib/carrito-navegador";
import { pago, soloTransferencia } from "@/lib/pedidos/reglas";
import { notaIva, paqueteVigenciaMeses, pesos } from "@/lib/precios";
import { entregaTexto } from "@/lib/site";
import { comprarCarrito } from "./acciones";

type Opcion = { id: string; titulo: string; texto: string };

export type EstadoCompra =
  | { paso: "entrar" }
  | { paso: "aceptar" }
  | { paso: "empresa" }
  | { paso: "sin_permiso"; empresa: string }
  | { paso: "sin_pago"; empresa: string }
  | { paso: "listo"; empresa: string; correo: string; fiscales: Opcion[] };

const REGRESO = encodeURIComponent("/carrito");
const boton =
  "inline-flex w-full items-center justify-center rounded-full bg-rojo px-6 py-3 font-semibold text-white transition-colors hover:bg-rojo-oscuro disabled:opacity-60";
const liga = "font-semibold text-rojo underline underline-offset-4";
const tarjeta = (activo: boolean) =>
  `block w-full rounded-tarjeta-chica border p-3 text-left text-sm transition-colors ${
    activo ? "border-tinta bg-papel ring-1 ring-tinta" : "border-linea bg-white hover:border-tinta"
  }`;

/** Lo que hace falta antes de pagar, con el botón para hacerlo. */
function SiguientePaso({ estado }: { estado: Exclude<EstadoCompra, { paso: "listo" }> }) {
  const pasos = {
    entrar: {
      titulo: "Para pagar, entra o crea tu cuenta",
      texto: "Solo te pedimos tu correo. Si es tu primera vez, tu cuenta se crea sola y tu carrito te espera aquí.",
      boton: { href: `/entrar?siguiente=${REGRESO}`, texto: "Entrar o crear mi cuenta" },
    },
    aceptar: {
      titulo: "Acepta los términos para continuar",
      texto: "Es un solo paso y solo se hace una vez.",
      boton: { href: `/aceptar?siguiente=${REGRESO}`, texto: "Revisar y aceptar" },
    },
    empresa: {
      titulo: "Dinos el nombre de tu empresa",
      texto: "Tus gafetes quedan a nombre de tu empresa, para usarlos cuando quieras.",
      boton: { href: `/cuenta/empresa/nueva?siguiente=${REGRESO}`, texto: "Escribir el nombre de mi empresa" },
    },
    sin_permiso: {
      titulo: "Solo quien es dueño o administrador puede comprar",
      texto: `En ${"empresa" in estado ? estado.empresa : "tu empresa"} tienes el rol de editor. Pídele a alguien con ese rol que compre, o que te lo cambie en Usuarios.`,
      boton: null,
    },
    sin_pago: {
      titulo: "El pago en línea se activa muy pronto",
      texto: "Tu carrito queda guardado en este navegador. Si te urge, escríbenos y lo resolvemos.",
      boton: { href: "/contacto", texto: "Escribirnos" },
    },
  }[estado.paso];
  return (
    <div className="mt-5 rounded-tarjeta-chica bg-papel p-4">
      <p className="font-semibold">{pasos.titulo}</p>
      <p className="mt-1 text-sm text-gris">{pasos.texto}</p>
      {pasos.boton ? (
        <Link href={pasos.boton.href} className={`${boton} mt-4`}>
          {pasos.boton.texto}
        </Link>
      ) : null}
    </div>
  );
}

export function Carrito({ estado }: { estado: EstadoCompra }) {
  const router = useRouter();
  const articulos = useCarrito();
  const c = cotizarCarrito(articulos);
  const [facturacion, setFacturacion] = useState(estado.paso === "listo" ? (estado.fiscales[0]?.id ?? "") : "");
  const [error, setError] = useState("");
  const [enviando, iniciar] = useTransition();
  const porTransferencia = soloTransferencia(c.piezas, c.total);

  // El carrito vive en el navegador: hasta leerlo no se sabe si está vacío.
  const listo = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  if (!listo) return <p className="mt-6 text-gris">Cargando tu carrito…</p>;

  if (!articulos.length) {
    return (
      <div className="mt-6 max-w-xl rounded-tarjeta border border-linea bg-white p-6">
        <p className="text-lg font-semibold">Tu carrito está vacío.</p>
        <p className="mt-2 text-gris">
          Elige un <Link href="/precios#paquetes" className={liga}>paquete de gafetes prepagados</Link>,{" "}
          <Link href="/precios#paquete-a-la-medida" className={liga}>arma uno a la medida</Link> o calcula tus gafetes en el{" "}
          <Link href="/cotizar" className={liga}>cotizador en línea</Link>.
        </p>
      </div>
    );
  }

  function pagar() {
    setError("");
    iniciar(async () => {
      const r = await comprarCarrito({ articulos, facturacion: facturacion || null });
      if (r.url) {
        vaciarCarrito();
        window.location.assign(r.url);
      } else if (r.pedido) {
        vaciarCarrito();
        router.push(`/cuenta/pedidos/${r.pedido}?pago=error`);
      } else setError(r.error ?? "No pudimos guardar tu compra. Intenta de nuevo.");
    });
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <div className="min-w-0">
        <ul className="space-y-3">
          {c.articulos.map((a) => {
            const original = articulos.find((x) => x.id === a.id);
            return (
              <li key={a.id} className="rounded-tarjeta border border-linea bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-titulos text-lg font-extrabold">{a.nombre}</p>
                    <ul className="mt-1 text-sm text-gris">
                      {a.detalle.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  </div>
                  <p className="font-titulos text-xl font-extrabold">{pesos(a.subtotal)}</p>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                  {original?.tipo === "gafetes" ? (
                    <label className="flex items-center gap-2">
                      <span>Cantidad</span>
                      <input
                        type="number"
                        min={1}
                        max={carritoMaximoPiezas}
                        defaultValue={original.piezas}
                        onBlur={(e) => cambiarPiezas(a.id, Number(e.target.value) || 1)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") cambiarPiezas(a.id, Number(e.currentTarget.value) || 1);
                        }}
                        className="w-24 rounded-tarjeta-chica border border-linea px-3 py-1.5"
                      />
                    </label>
                  ) : null}
                  <button type="button" onClick={() => quitarDelCarrito(a.id)} className="underline underline-offset-4">
                    Quitar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-sm">
          <Link href="/precios#paquetes" className={liga}>Seguir viendo paquetes</Link>
          <span className="mx-2 text-gris">·</span>
          <Link href="/cotizar" className={liga}>Ir al cotizador</Link>
        </p>

        <div className="mt-6 rounded-tarjeta border border-linea bg-white p-5 text-sm">
          <p className="font-semibold">¿Cómo funciona?</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-gris">
            <li>Pagas tu carrito y tus gafetes quedan a favor de tu empresa.</li>
            <li>En tu plataforma subes a tu equipo y tu diseño, cuando quieras.</li>
            <li>Pides los gafetes que necesites: salen de tu saldo y te llegan en {entregaTexto}.</li>
          </ol>
          <p className="mt-2 text-gris">
            Se pueden usar durante {paqueteVigenciaMeses} meses. No son reembolsables y sí se pueden transferir a la cuenta de otra empresa.
          </p>
        </div>
      </div>

      <aside className="self-start rounded-tarjeta border border-linea bg-white p-5 sm:p-6 lg:sticky lg:top-24" aria-live="polite">
        <p className="text-sm font-semibold tracking-wide text-gris uppercase">Resumen</p>
        <p className="mt-1 font-titulos text-3xl font-extrabold">
          {c.piezas.toLocaleString("es-MX")} {c.piezas === 1 ? "gafete" : "gafetes"}
        </p>
        <p className="text-sm text-gris">
          y {c.envios} {c.envios === 1 ? "envío" : "envíos"} incluidos
        </p>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt>Subtotal</dt>
            <dd className="font-semibold">{pesos(c.subtotal)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>IVA</dt>
            <dd>{pesos(c.iva)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 border-t border-linea pt-2">
            <dt className="font-semibold">Total</dt>
            <dd className="font-titulos text-2xl font-extrabold">{pesos(c.total)}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-gris">Precios en pesos mexicanos. El subtotal es {notaIva}; el total ya lo incluye.</p>

        {c.problema ? (
          <p role="alert" className="mt-4 text-sm font-medium text-rojo-oscuro">
            {c.problema}
          </p>
        ) : estado.paso !== "listo" ? (
          <SiguientePaso estado={estado} />
        ) : (
          <div className="mt-5">
            <p className="text-sm text-gris">
              Compras a nombre de <strong className="text-tinta">{estado.empresa}</strong>.
            </p>
            <fieldset className="mt-4">
              <legend className="text-sm font-semibold">¿Necesitas factura?</legend>
              <div className="mt-2 space-y-2">
                {estado.fiscales.map((f) => (
                  <button key={f.id} type="button" aria-pressed={facturacion === f.id} onClick={() => setFacturacion(f.id)} className={tarjeta(facturacion === f.id)}>
                    <span className="block font-semibold">{f.titulo}</span>
                    <span className="block text-gris">{f.texto}</span>
                  </button>
                ))}
                <button type="button" aria-pressed={!facturacion} onClick={() => setFacturacion("")} className={tarjeta(!facturacion)}>
                  <span className="block font-semibold">No necesito factura</span>
                </button>
              </div>
              {!estado.fiscales.length ? (
                <p className="mt-2 text-xs text-gris">
                  Para facturar, agrega tus datos fiscales en{" "}
                  <Link href="/cuenta/datos" className="underline">
                    Datos de envío y facturación
                  </Link>{" "}
                  y regresa a tu carrito.
                </p>
              ) : null}
            </fieldset>

            <p className="mt-4 rounded-tarjeta-chica bg-papel p-3 text-sm">
              {porTransferencia
                ? "Por su tamaño, esta compra se paga por transferencia (SPEI). Al continuar te damos la CLABE y la referencia."
                : `Pagas con tarjeta, en efectivo en OXXO o por transferencia (SPEI). Con tarjeta tienes ${pago.minutosDeGracia} minutos para cancelar sin costo.`}
            </p>
            <button type="button" onClick={pagar} disabled={enviando} className={`${boton} mt-4`}>
              {enviando ? "Preparando tu pago…" : `Pagar ${pesos(c.total)}`}
            </button>
            {error ? (
              <p role="alert" className="mt-3 text-sm font-medium text-rojo-oscuro">
                {error}
              </p>
            ) : null}
            <p className="mt-3 text-xs text-gris">
              El pago se hace en la página segura de Stripe. Nosotros no vemos ni guardamos los datos de tu tarjeta.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
