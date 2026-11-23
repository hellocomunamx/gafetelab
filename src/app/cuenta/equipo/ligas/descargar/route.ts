import { descargaXlsx, hoyEnSonora } from "@/lib/admin/xlsx";
import { estadosLiga, urlDeLiga } from "@/lib/cuenta/ligas";
import { personasConLiga } from "@/lib/cuenta/ligas-equipo";
import { requerirEmpresa } from "@/lib/cuenta/sesion";
import { normalizar } from "@/lib/cuenta/texto";

/** Todas las ligas del equipo en un Excel, para mandarlas por el medio que la empresa prefiera. */
export async function GET() {
  const { supabase, empresa } = await requerirEmpresa();
  const personas = await personasConLiga(supabase, empresa.id);
  return descargaXlsx(`ligas-${normalizar(empresa.nombre).replace(/ /g, "-")}-${hoyEnSonora()}`, [
    {
      nombre: "Ligas",
      encabezados: ["Nombre", "Número de empleado", "Correo", "Liga personal", "Estado de su liga", "Se le mandó"],
      anchos: [34, 20, 32, 62, 24, 18],
      filas: personas.map((p) => [
        p.nombre,
        p.numero_empleado,
        p.correo,
        urlDeLiga(p.liga),
        estadosLiga[p.estado].nombre,
        { fechaHora: p.liga_enviada_en },
      ]),
    },
  ]);
}
