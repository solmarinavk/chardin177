import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";
import type { Periodo } from "@/lib/periodos";

export type Constancia = Tables<"constancias_pago">;

// El periodo emitido más reciente (donde se cobra y se suben constancias).
export async function getPeriodoEmitido(): Promise<Periodo | null> {
  const s = createClient();
  const { data } = await s
    .from("periodos")
    .select("*")
    .eq("estado", "emitido")
    .order("anio", { ascending: false })
    .order("mes", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

// Constancias de un periodo (RLS filtra: residente ve las suyas; tesorería todas).
export async function getConstancias(periodoId: number): Promise<Constancia[]> {
  const s = createClient();
  const { data } = await s
    .from("constancias_pago")
    .select("*")
    .eq("periodo_id", periodoId)
    .order("id", { ascending: false });
  return data ?? [];
}

export async function getConstanciasPendientes(
  periodoId: number,
): Promise<Constancia[]> {
  const s = createClient();
  const { data } = await s
    .from("constancias_pago")
    .select("*")
    .eq("periodo_id", periodoId)
    .eq("estado", "pendiente")
    .order("id", { ascending: false });
  return data ?? [];
}
