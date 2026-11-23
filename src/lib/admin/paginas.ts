/**
 * Trae todas las filas de una consulta, de mil en mil. La API de Supabase
 * entrega como máximo mil filas por solicitud, y los números del panel no
 * pueden quedarse cortos. La consulta debe traer un orden estable.
 */
export async function todas<T>(
  pagina: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null }>,
  maximo = 50000,
): Promise<T[]> {
  const TAMANO = 1000;
  const filas: T[] = [];
  for (let desde = 0; desde < maximo; desde += TAMANO) {
    const { data } = await pagina(desde, desde + TAMANO - 1);
    if (!data?.length) break;
    filas.push(...data);
    if (data.length < TAMANO) break;
  }
  return filas;
}
