import type { Metadata } from "next";
import Link from "next/link";
import { requireRol } from "@/lib/roles";
import {
  ICONOS,
  IconoFlecha,
  IconoCandado,
} from "@/components/iconos";

export const metadata: Metadata = { title: "Administración" };

type Herramienta = {
  href: string;
  titulo: string;
  desc: string;
  icono: string;
  activo: boolean;
};

// Herramientas de administración (solo admin). Se activan al construirse.
const HERRAMIENTAS: Herramienta[] = [
  {
    href: "/cuotas-fijas",
    titulo: "Cuotas fijas",
    desc: "Vigilancia, mantenimiento, materiales y agua común.",
    icono: "recibo",
    activo: true,
  },
  {
    href: "/usuarios",
    titulo: "Usuarios y roles",
    desc: "Cambiar quién es admin, tesorería o portería, y gestionar residentes.",
    icono: "usuarios",
    activo: true,
  },
  {
    href: "/bitacora",
    titulo: "Bitácora",
    desc: "Registro de cada cambio sensible: quién, qué y cuándo.",
    icono: "bitacora",
    activo: false,
  },
];

export default async function AdministracionPage() {
  await requireRol(["admin"]);

  return (
    <main className="flex flex-col gap-5">
      <div className="animar-aparecer">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Administración
        </h1>
        <p className="mt-1 text-slate-600">
          Ajustes del edificio y control. Solo administración entra aquí.
        </p>
      </div>

      <section className="animar-aparecer grid gap-3 sm:grid-cols-2">
        {HERRAMIENTAS.map((h) => {
          const Icono = ICONOS[h.icono] ?? ICONOS.engranaje!;
          if (!h.activo) {
            return (
              <div
                key={h.href}
                className="card flex items-start gap-3 p-4 opacity-60"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                  <Icono className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 font-semibold text-slate-500">
                    {h.titulo}
                    <IconoCandado className="h-3.5 w-3.5" />
                  </p>
                  <p className="text-sm text-slate-400">Disponible pronto</p>
                </div>
              </div>
            );
          }
          return (
            <Link
              key={h.href}
              href={h.href}
              className="card flex items-start gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                <Icono className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center justify-between gap-2 font-semibold text-slate-900">
                  {h.titulo}
                  <IconoFlecha className="h-4 w-4 text-slate-400" />
                </p>
                <p className="text-sm text-slate-600">{h.desc}</p>
              </div>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
