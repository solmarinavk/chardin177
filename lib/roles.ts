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
// Los módulos se activan (`activo: true`) al llegar su fase del roadmap.
export type ItemMenu = {
  href: string;
  etiqueta: string;
  corta: string; // etiqueta corta para la barra inferior del celular
  icono: string; // nombre en components/iconos.tsx → ICONOS
  roles: RolUsuario[];
  activo: boolean;
};

// Los usuarios con login son solo los roles que ESCRIBEN. Los vecinos ya no
// tienen cuenta: ven la transparencia en la web pública (/transparencia).
const TODOS: RolUsuario[] = ["admin", "tesoreria", "porteria"];

export const MENU: ItemMenu[] = [
  {
    href: "/inicio",
    etiqueta: "Inicio",
    corta: "Inicio",
    icono: "casa",
    roles: TODOS,
    activo: true,
  },
  {
    href: "/lecturas",
    etiqueta: "Lecturas de agua",
    corta: "Lecturas",
    icono: "gota",
    roles: ["porteria", "tesoreria", "admin"],
    activo: true,
  },
  {
    href: "/periodos",
    etiqueta: "Periodos",
    corta: "Periodos",
    icono: "calendario",
    roles: ["tesoreria", "admin"],
    activo: true,
  },
  {
    href: "/estado-cuenta",
    etiqueta: "Estado de cuenta",
    corta: "Cuenta",
    icono: "cuenta",
    roles: ["tesoreria", "admin"],
    activo: true,
  },
  {
    href: "/caja",
    etiqueta: "Caja y egresos",
    corta: "Caja",
    icono: "recibo",
    roles: ["tesoreria", "admin"],
    activo: true,
  },
  {
    href: "/exportar",
    etiqueta: "Exportar a Excel",
    corta: "Exportar",
    icono: "descarga",
    roles: ["tesoreria", "admin"],
    activo: true,
  },
  {
    href: "/documentos",
    etiqueta: "Documentos",
    corta: "Docs",
    icono: "documento",
    roles: ["tesoreria", "admin"],
    activo: true,
  },
  {
    href: "/administracion",
    etiqueta: "Administración",
    corta: "Admin",
    icono: "engranaje",
    roles: ["admin"],
    activo: true,
  },
  {
    href: "/ayuda",
    etiqueta: "Ayuda",
    corta: "Ayuda",
    icono: "ayuda",
    roles: TODOS,
    activo: true,
  },
];

export function menuPara(rol: RolUsuario): ItemMenu[] {
  return MENU.filter((m) => m.roles.includes(rol));
}
