import type { Metadata } from "next";
import Link from "next/link";
import { requireRol } from "@/lib/roles";
import { listPeriodos, getBorrador } from "@/lib/periodos";
import { etiquetaPeriodo, hoyLima } from "@/lib/fechas";
import { formatoPEN } from "@/lib/centimos";
import { EstadoPeriodoBadge } from "@/components/estados";
import { FormCrearPeriodo } from "@/components/forms/periodo";
import { IconoFlecha, IconoCalendario } from "@/components/iconos";
import { crearPeriodo } from "./acciones";

export const metadata: Metadata = { title: "Periodos" };

export default async function PeriodosPage() {
  // Portería solo usa lecturas (PROPUESTA §5).
  const perfil = await requireRol(["tesoreria", "admin"]);
  const puedeGestionar = perfil.rol === "tesoreria" || perfil.rol === "admin";

  const [periodos, borrador] = await Promise.all([listPeriodos(), getBorrador()]);
  const [anioHoy, mesHoy] = hoyLima().split("-").map((x) => Number(x));

  return (
    <main className="flex flex-col gap-5">
      <h1 className="animar-aparecer text-2xl font-black tracking-tight text-slate-900">
        Periodos mensuales
      </h1>

      {puedeGestionar && (
        <section className="card animar-aparecer p-5">
          {borrador ? (
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <IconoCalendario className="h-5 w-5" />
              </span>
              <div>
                <p className="text-slate-700">
                  Ya hay un mes en preparación:{" "}
                  <span className="font-bold">
                    {etiquetaPeriodo(borrador.anio, borrador.mes)}
                  </span>
                  . Solo puede haber uno a la vez.
                </p>
                <Link
                  href={`/periodos/${borrador.id}`}
                  className="btn-primary mt-3 min-h-[44px] px-4 py-2.5 text-sm"
                >
                  Continuar con ese mes
                  <IconoFlecha className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ) : (
            <>
              <h2 className="titulo-seccion mb-3">Abrir un nuevo mes</h2>
              <FormCrearPeriodo
                accion={crearPeriodo}
                defaultAnio={anioHoy ?? 2026}
                defaultMes={mesHoy ?? 1}
              />
            </>
          )}
        </section>
      )}

      <section className="flex flex-col gap-2">
        {periodos.length === 0 && (
          <p className="animar-aparecer text-center text-slate-500">
            Aún no hay periodos creados.
          </p>
        )}
        {periodos.map((p, i) => (
          <Link
            key={p.id}
            href={`/periodos/${p.id}`}
            className="card animar-aparecer flex items-center justify-between gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-md"
            style={{ animationDelay: `${Math.min(i * 40, 240)}ms` }}
          >
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-slate-900">
                {etiquetaPeriodo(p.anio, p.mes)}
              </p>
              {p.estado === "cerrado" && p.saldo_final_cent !== null && (
                <p className="num text-sm text-slate-500">
                  Saldo final: {formatoPEN(p.saldo_final_cent)}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <EstadoPeriodoBadge estado={p.estado} />
              <IconoFlecha className="h-4 w-4 text-slate-400" />
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
