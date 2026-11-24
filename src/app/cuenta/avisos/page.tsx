import type { Metadata } from "next";
import Link from "next/link";
import { Bloque, Chips } from "@/components/cuenta/Entrada";
import { Formulario } from "@/components/cuenta/Formulario";
import { correoActivo } from "@/lib/correo";
import { MODO_INICIAL, MODOS_AVISO, RUTA_CAMBIOS_FOTO, RUTA_LIGAS, TIPOS_AVISO, type TipoAviso } from "@/lib/avisos/tipos";
import { requerirUsuario } from "@/lib/cuenta/sesion";
import { guardarAvisos } from "./acciones";

export const metadata: Metadata = { title: "Mis avisos por correo" };

const DONDE: Record<TipoAviso, string> = { cambio_foto: RUTA_CAMBIOS_FOTO, datos_liga: RUTA_LIGAS };

export default async function Avisos() {
  const { supabase, usuario } = await requerirUsuario();
  const [{ data: membresias }, { data: preferencias }] = await Promise.all([
    supabase.from("miembros").select("empresa_id, rol, empresas(nombre)").eq("usuario_id", usuario.id).order("creado_en"),
    supabase.from("preferencias_aviso").select("empresa_id, tipo, modo").eq("usuario_id", usuario.id),
  ]);
  const administradas = (membresias ?? []).filter((m) => m.rol !== "editor");
  const modoDe = (empresa: string, tipo: TipoAviso) =>
    preferencias?.find((p) => p.empresa_id === empresa && p.tipo === tipo)?.modo ?? MODO_INICIAL;
  const opciones = Object.entries(MODOS_AVISO).map(([valor, m]) => ({ valor, texto: m.nombre }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-sm"><Link href="/cuenta/acceso" className="underline">Mi acceso</Link> / Avisos por correo</p>
        <h1 className="mt-2 text-3xl font-extrabold">Mis avisos por correo</h1>
        <p className="mt-2 text-gris">
          Elige cómo te avisamos cuando tu equipo necesita algo de ti. Llegan a{" "}
          <strong className="break-all text-tinta">{usuario.email}</strong>. Lo que elijas aquí solo cambia tus avisos, no
          los de las demás personas con acceso.
        </p>
        <ul className="mt-3 space-y-1 text-sm text-gris">
          {Object.values(MODOS_AVISO).map((m) => (
            <li key={m.nombre}><strong className="text-tinta">{m.nombre}:</strong> {m.detalle.toLowerCase()}.</li>
          ))}
        </ul>
        {!correoActivo() ? (
          <p className="mt-3 rounded-tarjeta-chica bg-resaltador/30 p-3 text-sm">El envío de correos todavía no está activo en este sitio.</p>
        ) : null}
      </div>

      {administradas.length ? (
        administradas.map((m) => {
          const nombre = (m.empresas as unknown as { nombre: string } | null)?.nombre ?? "Tu empresa";
          return (
            <Bloque key={m.empresa_id} titulo={administradas.length > 1 ? nombre : undefined}>
              <Formulario accion={guardarAvisos} boton="Guardar">
                <input type="hidden" name="empresa" value={m.empresa_id} />
                <div className="space-y-6">
                  {(Object.entries(TIPOS_AVISO) as [TipoAviso, (typeof TIPOS_AVISO)[TipoAviso]][]).map(([tipo, t]) => (
                    <div key={tipo}>
                      <Chips etiqueta={t.nombre} name={`modo_${tipo}`} inicial={modoDe(m.empresa_id, tipo)} opciones={opciones} />
                      <p className="mt-1.5 text-xs text-gris">
                        {t.detalle}{" "}
                        <Link href={DONDE[tipo]} className="underline">Ver pendientes</Link>
                      </p>
                    </div>
                  ))}
                </div>
              </Formulario>
            </Bloque>
          );
        })
      ) : (
        <Bloque>
          <p className="text-gris">Estos avisos les llegan a quienes son dueños o administradores de una empresa. Con tu rol actual no recibes ninguno.</p>
        </Bloque>
      )}
    </div>
  );
}
