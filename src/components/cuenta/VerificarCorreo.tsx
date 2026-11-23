"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { confirmarCodigoCorreo, enviarCodigoCorreo } from "@/app/cuenta/verificacion/acciones";
import { CartaResponsabilidad } from "@/components/cuenta/CartaResponsabilidad";
import { claseBoton, claseBotonSecundario, claseEntrada } from "@/components/cuenta/Formulario";
import { esCorreoGratuito } from "@/lib/cuenta/constancia";
import type { Resultado } from "@/lib/cuenta/tipos";

/** Verifica la empresa con un correo de su dominio: manda un código y lo confirma. */
export function VerificarCorreo({ nombreEmpresa, correoSugerido }: { nombreEmpresa: string; correoSugerido: string }) {
  const router = useRouter();
  const [negocio, setNegocio] = useState(nombreEmpresa);
  const [correo, setCorreo] = useState(correoSugerido);
  const [codigo, setCodigo] = useState("");
  const [enviado, setEnviado] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  const [cartaAceptada, setCartaAceptada] = useState(false);

  async function mandarCodigo(evento?: FormEvent<HTMLFormElement>) {
    evento?.preventDefault();
    setError("");
    if (!negocio.trim()) return setError("Escribe el nombre de tu negocio como aparece en los gafetes.");
    if (esCorreoGratuito(correo.trim())) {
      return setError("Ese es un correo gratuito. Usa uno con el dominio de tu negocio, o elige otra forma de verificar.");
    }
    setOcupado(true);
    const r: Resultado = await enviarCodigoCorreo({ correo, negocio }).catch(() => ({ error: "No pudimos mandar el correo. Intenta de nuevo." }));
    setOcupado(false);
    if (r.error) return setError(r.error);
    setCodigo("");
    setEnviado(r.ok ?? "Te mandamos un código.");
  }

  async function confirmar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(codigo.trim())) return setError("El código lleva 6 números.");
    if (!cartaAceptada) return setError("Acepta la carta de responsabilidad.");
    setOcupado(true);
    const r = await confirmarCodigoCorreo({ codigo: codigo.trim(), carta: true }).catch(() => ({ error: "No pudimos confirmar. Intenta de nuevo." }));
    if (r.error) {
      setOcupado(false);
      return setError(r.error);
    }
    router.push("/cuenta/verificacion");
    router.refresh();
  }

  const aviso = error ? <p role="alert" className="rounded-tarjeta-chica bg-rojo/10 p-3 text-sm font-medium text-rojo-oscuro">{error}</p> : null;

  if (!enviado) {
    return (
      <form onSubmit={mandarCodigo} className="space-y-5" noValidate>
        <fieldset disabled={ocupado} className="space-y-5">
          <label className="block">
            <span className="font-semibold">Nombre de tu negocio, como aparece en los gafetes</span>
            <input value={negocio} onChange={(e) => setNegocio(e.target.value)} maxLength={120} className={claseEntrada} />
          </label>
          <label className="block">
            <span className="font-semibold">Correo de tu empresa</span>
            <span className="block text-sm text-gris">Con el dominio de tu negocio, no Gmail ni Hotmail.</span>
            <input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="tu@tunegocio.com"
              maxLength={200}
              className={claseEntrada}
            />
          </label>
        </fieldset>
        {aviso}
        <button type="submit" disabled={ocupado} className={claseBoton}>
          {ocupado ? "Mandando…" : "Mandarme el código"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={confirmar} className="space-y-5" noValidate>
      <p role="status" className="rounded-tarjeta-chica bg-[#dff3ea]/60 p-3 text-sm">
        {enviado} Vence en 15 minutos; si no lo ves, revisa tu carpeta de spam.
      </p>
      <label className="block sm:max-w-xs">
        <span className="font-semibold">Código de 6 números</span>
        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          disabled={ocupado}
          className={`${claseEntrada} text-lg tracking-[0.3em]`}
        />
      </label>
      <CartaResponsabilidad aceptada={cartaAceptada} alCambiar={setCartaAceptada} deshabilitada={ocupado} />
      {aviso}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={ocupado} className={claseBoton}>
          {ocupado ? "Confirmando…" : "Confirmar y mandar a revisión"}
        </button>
        <button type="button" disabled={ocupado} onClick={() => mandarCodigo()} className={claseBotonSecundario}>
          Mandar otro código
        </button>
        <button type="button" disabled={ocupado} onClick={() => setEnviado("")} className="text-sm underline">
          Cambiar el correo
        </button>
      </div>
    </form>
  );
}
