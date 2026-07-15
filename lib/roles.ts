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
// Los módulos se activan (`activo: true`) al llegar su fase del roadmap.
export type ItemMenu = {
  href: string;
  etiqueta: string;
  roles: RolUsuario[];
  activo: boolean;
};

const TODOS: RolUsuario[] = ["admin", "tesoreria", "porteria", "residente"];

export const MENU: ItemMenu[] = [
  { href: "/inicio", etiqueta: "Inicio", roles: TODOS, activo: true },
  {
    href: "/lecturas",
    etiqueta: "Lecturas de agua",
    roles: ["porteria", "tesoreria", "admin"],
    activo: true,
  },
  {
    href: "/periodos",
    etiqueta: "Periodos",
    roles: ["tesoreria", "admin", "residente"],
    activo: true,
  },
  {
    href: "/estado-cuenta",
    etiqueta: "Estado de cuenta",
    roles: ["residente", "tesoreria", "admin"],
    activo: true,
  },
  {
    href: "/egresos",
    etiqueta: "Egresos",
    roles: ["tesoreria", "admin"],
    activo: false,
  },
  {
    href: "/usuarios",
    etiqueta: "Usuarios y roles",
    roles: ["admin"],
    activo: false,
  },
];

export function menuPara(rol: RolUsuario): ItemMenu[] {
  return MENU.filter((m) => m.roles.includes(rol));
}
