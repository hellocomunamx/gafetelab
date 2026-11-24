import type { Metadata } from "next";
import Link from "next/link";
import { SubirFotos } from "@/components/cuenta/SubirFotos";
import { claseBoton } from "@/components/cuenta/clases";
import { COLUMNA_FOTO } from "@/lib/cuenta/excel";
import { requerirEmpresa } from "@/lib/cuenta/sesion";

export const metadata: Metadata = { title: "Fotos del equipo" };

const RUTA = "/cuenta/equipo/fotos";
const FORMAS = [
  {
    id: "yo",
    titulo: "Yo las tengo y las subo",
    texto: "Si ya tienes las fotos en tu computadora o en un ZIP. Las subes todas juntas y cada una se asigna sola a su persona.",
  },
  {
    id: "liga",
    titulo: "Que cada quien mande la suya",
    texto: "Cada persona recibe su propia liga y se toma la foto con su celular, sin crear cuenta. Tú solo apruebas.",
  },
] as const;

export default async function Fotos({ searchParams }: { searchParams: Promise<{ forma?: string }> }) {
  const { supabase, empresa } = await requerirEmpresa();
  const { forma: elegida } = await searchParams;
  const forma = FORMAS.find((f) => f.id === elegida)?.id;
  const { data } = await supabase
    .from("empleados")
    .select("id, nombre, numero_empleado, foto_path, foto_archivo:datos->>foto_archivo")
    .eq("empresa_id", empresa.id)
    .neq("estatus", "baja")
    .order("nombre")
    .limit(5000);
  const personas = (data ?? []).map((p) => ({
    id: p.id,
    nombre: p.nombre,
    numero_empleado: p.numero_empleado,
    foto_archivo: p.foto_archivo as string | null,
    tieneFoto: Boolean(p.foto_path),
  }));
  const sinFoto = personas.filter((p) => !p.tieneFoto).length;
  // Una persona real del equipo para que el ejemplo de cómo nombrar los archivos se entienda.
  const ejemplo = personas.find((p) => p.numero_empleado && p.nombre) ?? personas.find((p) => p.nombre);
  const numeroEjemplo = ejemplo?.numero_empleado ?? "0042";
  const nombreEjemplo = ejemplo?.nombre ?? "Ana Martínez";

  return (
    <div className="space-y-6">
      <p className="text-sm"><Link href="/cuenta/equipo" className="underline">Equipo</Link> / Fotos</p>
      <div>
        <h1 className="text-3xl font-extrabold">Las fotos de tu equipo</h1>
        <p className="mt-2 max-w-2xl text-gris">
          {personas.length
            ? sinFoto
              ? `Te faltan ${sinFoto.toLocaleString("es-MX")} de ${personas.length.toLocaleString("es-MX")} personas. `
              : "Todo tu equipo activo ya tiene foto. "
            : ""}
          Puedes juntarlas de dos formas, y combinarlas: subir tú las que ya tienes y pedirle la suya a quien falte.
        </p>
      </div>

      {personas.length === 0 ? (
        <div className="rounded-tarjeta border border-dashed border-linea bg-white p-8 text-center">
          <p className="font-semibold">Primero sube a tu equipo.</p>
          <p className="mt-1 text-gris">
            <Link href="/cuenta/equipo/importar" className="underline">Importa tu Excel</Link> o{" "}
            <Link href="/cuenta/equipo/nuevo" className="underline">agrega a una persona</Link>.
          </p>
        </div>
      ) : (
        <>
          <nav aria-label="Cómo juntar las fotos">
            <p className="mb-3 font-titulos text-lg font-extrabold">¿Cómo quieres juntarlas?</p>
            <ul className="grid gap-3 sm:grid-cols-2">
              {FORMAS.map((f) => {
                const activa = forma === f.id;
                return (
                  <li key={f.id}>
                    <Link
                      href={`${RUTA}?forma=${f.id}#paso`}
                      aria-current={activa ? "true" : undefined}
                      className={`flex h-full gap-3 rounded-tarjeta border-2 bg-white p-4 transition-colors ${activa ? "border-rojo" : "border-linea hover:border-tinta"}`}
                    >
                      <span
                        aria-hidden
                        className={`mt-0.5 size-5 shrink-0 rounded-full border-2 ${activa ? "border-rojo bg-rojo shadow-[inset_0_0_0_3px_#fff]" : "border-linea"}`}
                      />
                      <span>
                        <span className="block font-semibold">{f.titulo}</span>
                        <span className="mt-0.5 block text-sm text-gris">{f.texto}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {forma === "yo" ? (
            <section id="paso" className="scroll-mt-4 space-y-5">
              <div className="rounded-tarjeta border border-linea bg-white p-5 sm:p-6">
                <h2 className="text-xl font-extrabold">Antes de subir: nombra cada foto</h2>
                <p className="mt-1 max-w-2xl text-sm text-gris">
                  Así sabemos de quién es cada una y se asigna sola. Usa cualquiera de estas tres formas:
                </p>
                <ol className="mt-4 grid gap-3 text-sm lg:grid-cols-3">
                  <li className="rounded-tarjeta-chica bg-papel p-4">
                    <span className="font-semibold">Con su número de empleado</span>
                    <span className="ml-2 rounded-full bg-resaltador/60 px-2 py-0.5 text-xs font-semibold">La más segura</span>
                    <code className="mt-2 block font-mono text-base">{numeroEjemplo}.jpg</code>
                    <span className="mt-1 block text-gris">No se confunde aunque dos personas se llamen igual.</span>
                  </li>
                  <li className="rounded-tarjeta-chica bg-papel p-4">
                    <span className="font-semibold">Con su nombre completo</span>
                    <code className="mt-2 block font-mono text-base">{nombreEjemplo}.jpg</code>
                    <span className="mt-1 block text-gris">Igual que en tu equipo. No importan mayúsculas ni acentos.</span>
                  </li>
                  <li className="rounded-tarjeta-chica bg-papel p-4">
                    <span className="font-semibold">Con el nombre que ya tienen</span>
                    <code className="mt-2 block font-mono text-base">IMG_2381.jpg</code>
                    <span className="mt-1 block text-gris">
                      Escribe ese nombre en la columna «{COLUMNA_FOTO}» de tu Excel, en el renglón de cada persona.
                    </span>
                  </li>
                </ol>
                <p className="mt-4 text-sm text-gris">
                  ¿Alguna no se reconoce? No pasa nada: antes de guardar ves todas y eliges a mano de quién es.
                </p>
              </div>
              <SubirFotos empresaId={empresa.id} personas={personas} />
            </section>
          ) : forma === "liga" ? (
            <section id="paso" className="scroll-mt-4 rounded-tarjeta border border-linea bg-white p-5 sm:p-6">
              <h2 className="text-xl font-extrabold">Así funciona la liga de cada persona</h2>
              <ol className="mt-4 grid gap-3 text-sm lg:grid-cols-3">
                <li className="rounded-tarjeta-chica bg-papel p-4">
                  <span className="font-semibold">1. Eliges qué pedir</span>
                  <span className="mt-1 block text-gris">
                    La foto y, si quieres, que revisen o completen otros datos, como su puesto o tipo de sangre. Todos
                    reciben las mismas preguntas, cada quien con sus propios datos ya llenos.
                  </span>
                </li>
                <li className="rounded-tarjeta-chica bg-papel p-4">
                  <span className="font-semibold">2. Les mandas su liga</span>
                  <span className="mt-1 block text-gris">Por correo a todos de una vez, o por WhatsApp a cada quien. Cada liga es personal.</span>
                </li>
                <li className="rounded-tarjeta-chica bg-papel p-4">
                  <span className="font-semibold">3. Tú apruebas</span>
                  <span className="mt-1 block text-gris">Ves la foto y lo que cambió. Nada pasa a su gafete hasta que lo apruebas.</span>
                </li>
              </ol>
              <Link href="/cuenta/equipo/ligas" className={`${claseBoton} mt-5`}>Preparar las ligas</Link>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
