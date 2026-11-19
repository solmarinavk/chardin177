// Menú por rol y barra inferior del celular (6.12). Lógica pura, sin nada de
// servidor, para poder usarla desde el componente cliente de la barra y
// testearla. (`lib/roles.ts` la re-exporta para el resto de la app.)

import type { RolUsuario } from "@/lib/database.types";

// Caben `max` pestañas en la barra del celular. Si hay más secciones, van las
// primeras (max − 1) y una pestaña "Más" con el resto. Con `max` o menos, van
// todas y no hay "Más". Pasó de verdad (19/11/2026): tesorería tiene 8
// secciones, la barra mostraba 5 y Caja era la sexta: en el celular no había
// forma de llegar a registrar un gasto salvo escribiendo la dirección a mano.
export function repartirBarra<T>(
  items: T[],
  max = 5,
): { principales: T[]; resto: T[] } {
  if (items.length <= max) return { principales: items, resto: [] };
  return { principales: items.slice(0, max - 1), resto: items.slice(max - 1) };
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
  // 6.12 · El orden importa: en el celular la barra de abajo muestra las 4
  // primeras secciones y una pestaña "Más" con el resto. Para tesorería van
  // primero las de todos los días (Lecturas, Periodos, Caja); Cuaderno y
  // Estado de cuenta quedan en "Más". Portería solo tiene 3 y las ve todas.
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
    href: "/caja",
    etiqueta: "Caja y egresos",
    corta: "Caja",
    icono: "recibo",
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
    href: "/ocurrencias",
    etiqueta: "Cuaderno de ocurrencias",
    corta: "Cuaderno",
    icono: "bitacora",
    roles: ["porteria", "tesoreria", "admin"],
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
