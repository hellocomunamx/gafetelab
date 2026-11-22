"use client";

import type { ReactNode } from "react";
import { COLUMNA_FOTO, type CampoExcel, columnasDe } from "@/lib/cuenta/excel";
import { claseBotonSecundario } from "./Formulario";

/** Arma y descarga la plantilla de Excel con una columna por cada campo de la empresa. */
export function BotonPlantilla({
  campos,
  empresa,
  className = claseBotonSecundario,
  children = "Descargar plantilla de Excel",
}: {
  campos: CampoExcel[];
  /** Nombre de la empresa, ya listo para usarse en el nombre del archivo. */
  empresa: string;
  className?: string;
  children?: ReactNode;
}) {
  async function descargar() {
    const { default: escribir } = await import("write-excel-file/browser");
    const titulos = [...columnasDe(campos).map((c) => c.etiqueta), COLUMNA_FOTO];
    const negrita = (value: string) => ({ value, fontWeight: "bold" as const });
    await escribir([
      {
        sheet: "Equipo",
        data: [titulos.map(negrita)],
        columns: titulos.map((t) => ({ width: Math.max(18, t.length + 4) })),
        stickyRowsCount: 1,
      },
      {
        sheet: "Instrucciones",
        data: [
          [negrita("Cómo llenar esta plantilla")],
          ["1. Una persona por renglón, en la hoja Equipo. No cambies los títulos de las columnas."],
          ["2. El nombre es obligatorio. Lo demás puede ir vacío."],
          ["3. Con número de empleado, si la persona ya existe se actualiza en lugar de duplicarse."],
          [`4. En "${COLUMNA_FOTO}" puedes escribir el nombre del archivo de su foto (por ejemplo 0042.jpg) para asignarla sola al subir las fotos.`],
          ["5. Las fechas van como AAAA-MM-DD o con formato de fecha de Excel."],
          ["6. Guarda el archivo y súbelo en tu plataforma: Equipo, Importar Excel."],
        ],
        columns: [{ width: 110 }],
      },
    ]).toFile(`plantilla-${empresa}.xlsx`);
  }

  return (
    <button type="button" onClick={descargar} className={className}>
      {children}
    </button>
  );
}
