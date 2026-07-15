"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ICONOS, IconoCandado } from "@/components/iconos";

export type NavItem = {
  href: string;
  etiqueta: string;
  icono: string;
  activo: boolean;
};

function esActiva(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Pestañas superiores (pantallas medianas en adelante).
export function NavSuperior({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Principal" className="hidden sm:block">
      <ul className="mx-auto flex max-w-3xl gap-1 px-2 pb-2">
        {items.map((item) => {
          const Icono = ICONOS[item.icono] ?? ICONOS.casa!;
          if (!item.activo) {
            return (
              <li key={item.href}>
                <span
                  className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-slate-400"
                  title="Disponible pronto"
                >
                  <IconoCandado className="h-4 w-4" />
                  {item.etiqueta}
                </span>
              </li>
            );
          }
          const activa = esActiva(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={activa ? "page" : undefined}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
                  activa
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icono className="h-4 w-4" />
                {item.etiqueta}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// Barra inferior tipo app (solo celular): lo que usan el portero y los vecinos.
export function NavInferior({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const activos = items.filter((i) => i.activo).slice(0, 5);
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
    >
      <ul className="flex justify-around">
        {activos.map((item) => {
          const Icono = ICONOS[item.icono] ?? ICONOS.casa!;
          const activa = esActiva(pathname, item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={activa ? "page" : undefined}
                className="flex min-h-[56px] flex-col items-center justify-center gap-0.5 py-1.5"
              >
                <span
                  className={`rounded-full px-4 py-1 transition ${
                    activa ? "bg-slate-900 text-white" : "text-slate-500"
                  }`}
                >
                  <Icono className="h-5 w-5" />
                </span>
                <span
                  className={`text-[11px] font-medium ${
                    activa ? "text-slate-900" : "text-slate-500"
                  }`}
                >
                  {item.etiqueta}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
