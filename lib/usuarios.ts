import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";

export type Perfil = Tables<"perfiles">;
export type Residente = Tables<"residentes">;

// Usuarios con login (perfiles). Admin los ve todos (política sel_perfiles).
export async function getPerfiles(): Promise<Perfil[]> {
  const s = createClient();
  const { data } = await s.from("perfiles").select("*").order("rol");
  return data ?? [];
}

// Padrón de residentes (para avisos por correo y transparencia interna).
export async function getResidentes(): Promise<Residente[]> {
  const s = createClient();
  const { data } = await s
    .from("residentes")
    .select("*")
    .order("dpto_id")
    .order("id");
  return data ?? [];
}
