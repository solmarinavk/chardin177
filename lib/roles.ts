import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { RolUsuario, Tables } from "@/lib/database.types";

export type Perfil = Tables<"perfiles">;

export const ETIQUETA_ROL: Record<RolUsuario, string> = {
  admin: "Administración",
  tesoreria: "Tesorería",
  porteria: "Portería",
  residente: "Residente",
};

// "Nombre · Rol", sin repetir cuando el nombre ya es el rol (las cuentas
// compartidas se llaman igual que su rol: "Tesorería", "Portería"…).
export function nombreConRol(perfil: Perfil): string {
  const etiqueta = ETIQUETA_ROL[perfil.rol];
  if (perfil.nombre.toLowerCase().includes(etiqueta.toLowerCase())) {
    return perfil.nombre;
  }
  return `${perfil.nombre} · ${etiqueta}`;
}

// ¿El rol aporta información que el nombre no tiene?
export function rolEsRedundante(perfil: Perfil): boolean {
  return perfil.nombre
    .toLowerCase()
    .includes(ETIQUETA_ROL[perfil.rol].toLowerCase());
}

// Perfil del usuario logueado (o null si no hay sesión / no tiene perfil).
// `cache` deduplica la consulta dentro de un mismo request.
export const getPerfil = cache(async (): Promise<Perfil | null> => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("perfiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return data ?? null;
});

// Rol del usuario logueado (o null).
export async function getRol(): Promise<RolUsuario | null> {
  const perfil = await getPerfil();
  return perfil?.rol ?? null;
}

// Exige sesión + perfil activo con uno de los roles dados.
// Redirige a /login (sin sesión) o /sin-acceso (rol equivocado). Devuelve el perfil si cumple.
export async function requireRol(roles: RolUsuario[]): Promise<Perfil> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!perfil || !perfil.activo) redirect("/sin-acceso");
  if (!roles.includes(perfil.rol)) redirect("/sin-acceso");
  return perfil;
}

// ---------- Menú por rol ----------
// Vive en lib/navegacion.ts (lógica pura, sin servidor); se re-exporta aquí.
export { MENU, menuPara, type ItemMenu } from "@/lib/navegacion";
