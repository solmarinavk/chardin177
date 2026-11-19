"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ICONOS, IconoCandado, IconoMas } from "@/components/iconos";
import { repartirBarra } from "@/lib/navegacion";

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
      <ul className="mx-auto flex max-w-3xl flex-wrap gap-1 px-2 pb-2">
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

// Barra inferior tipo app (solo celular). Caben 5 pestañas: si hay más
// secciones, van las 4 primeras y una pestaña "Más" que despliega el resto
// (6.12). Antes se cortaba en 5 y Caja, la sexta, no se podía abrir.
export function NavInferior({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  // Al navegar se cierra el panel de "Más".
  useEffect(() => {
    setAbierto(false);
  }, [pathname]);

  const { principales, resto } = repartirBarra(items.filter((i) => i.activo));
  const restoActivo = resto.some((i) => esActiva(pathname, i.href));
  const resaltarMas = abierto || restoActivo;

  return (
    <>
      {abierto && resto.length > 0 && (
        <div
          className="fixed inset-0 z-40 sm:hidden"
          onClick={() => setAbierto(false)}
        >
          <div className="absolute inset-0 bg-slate-900/30" aria-hidden />
          <div
            role="dialog"
            aria-label="Más secciones"
            className="absolute inset-x-0 bottom-[calc(56px_+_env(safe-area-inset-bottom))] rounded-t-2xl border-t border-slate-200 bg-white p-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <ul className="grid grid-cols-2 gap-2">
              {resto.map((item) => {
                const Icono = ICONOS[item.icono] ?? ICONOS.casa!;
                const activa = esActiva(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={activa ? "page" : undefined}
                      className={`flex min-h-[52px] items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${
                        activa
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-800"
                      }`}
                    >
                      <Icono className="h-5 w-5 shrink-0" />
                      {item.etiqueta}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
      >
        <ul className="flex justify-around">
          {principales.map((item) => {
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
          {resto.length > 0 && (
            <li className="flex-1">
              <button
                type="button"
                aria-expanded={abierto}
                aria-haspopup="dialog"
                onClick={() => setAbierto((v) => !v)}
                className="flex min-h-[56px] w-full flex-col items-center justify-center gap-0.5 py-1.5"
              >
                <span
                  className={`rounded-full px-4 py-1 transition ${
                    resaltarMas ? "bg-slate-900 text-white" : "text-slate-500"
                  }`}
                >
                  <IconoMas className="h-5 w-5" />
                </span>
                <span
                  className={`text-[11px] font-medium ${
                    resaltarMas ? "text-slate-900" : "text-slate-500"
                  }`}
                >
                  Más
                </span>
              </button>
            </li>
          )}
        </ul>
      </nav>
    </>
  );
}
