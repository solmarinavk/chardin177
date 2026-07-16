import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";

export type Documento = Tables<"documentos">;

// Documentos del edificio (reglamento, actas, presupuestos, el Excel histórico…).
export async function getDocumentos(): Promise<Documento[]> {
  const s = createClient();
  const { data } = await s
    .from("documentos")
    .select("*")
    .order("creado_en", { ascending: false })
    .order("id", { ascending: false });
  return data ?? [];
}
