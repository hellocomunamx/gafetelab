import type { Metadata } from "next";
import Link from "next/link";
import { SubirFotos } from "@/components/cuenta/SubirFotos";
import { requerirEmpresa } from "@/lib/cuenta/sesion";

export const metadata: Metadata = { title: "Subir fotos" };

export default async function Fotos() {
  const { supabase, empresa } = await requerirEmpresa();
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

  return (
    <div className="space-y-5">
      <p className="text-sm"><Link href="/cuenta/equipo" className="underline">Equipo</Link> / Subir fotos</p>
      <h1 className="text-3xl font-extrabold">Sube las fotos de tu equipo</h1>
      <p className="max-w-2xl text-gris">
        Súbelas todas de un jalón. Cada foto se asigna sola a su persona por el nombre del archivo, tú
        revisas antes de guardar y las que no reconozcamos las acomodas a mano.{" "}
        {personas.length
          ? sinFoto
            ? `Te faltan ${sinFoto} de ${personas.length} personas.`
            : "Todo tu equipo activo ya tiene foto."
          : ""}
      </p>
      {personas.length ? (
        <SubirFotos empresaId={empresa.id} personas={personas} />
      ) : (
        <div className="rounded-tarjeta border border-dashed border-linea bg-white p-8 text-center">
          <p className="font-semibold">Primero sube a tu equipo.</p>
          <p className="mt-1 text-gris">
            <Link href="/cuenta/equipo/importar" className="underline">Importa tu Excel</Link> o{" "}
            <Link href="/cuenta/equipo/nuevo" className="underline">agrega a una persona</Link>.
          </p>
        </div>
      )}
    </div>
  );
}
