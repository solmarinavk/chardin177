import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";

export type CuotaFija = Tables<"cuotas_fijas">;

// Todas las versiones, de la más reciente a la más antigua.
export async function getCuotasFijas(): Promise<CuotaFija[]> {
  const s = createClient();
  const { data } = await s
    .from("cuotas_fijas")
    .select("*")
    .order("vigente_desde", { ascending: false })
    .order("id", { ascending: false });
  return data ?? [];
}

// La versión vigente para una fecha (por defecto la de hoy): la de mayor
// `vigente_desde <= fecha`. Es la misma regla que usa el motor en Postgres
// (`order by vigente_desde desc limit 1`). Empate por fecha → mayor id.
export function cuotaFijaVigente(
  lista: CuotaFija[],
  fechaISO: string,
): CuotaFija | null {
  const candidatas = lista.filter((c) => c.vigente_desde <= fechaISO);
  if (candidatas.length === 0) return null;
  return candidatas.reduce((mejor, c) => {
    if (c.vigente_desde > mejor.vigente_desde) return c;
    if (c.vigente_desde === mejor.vigente_desde && c.id > mejor.id) return c;
    return mejor;
  });
}
