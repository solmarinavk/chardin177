import Link from "next/link";
import { getPerfil } from "@/lib/roles";
import { listPeriodos, getBorrador } from "@/lib/periodos";
import { etiquetaPeriodo, hoyLima } from "@/lib/fechas";
import { EstadoPeriodoBadge } from "@/components/estados";
import { FormCrearPeriodo } from "@/components/forms/periodo";
import { crearPeriodo } from "./acciones";

export default async function PeriodosPage() {
  const perfil = await getPerfil();
  if (!perfil) return null;
  const puedeGestionar = perfil.rol === "tesoreria" || perfil.rol === "admin";

  const [periodos, borrador] = await Promise.all([listPeriodos(), getBorrador()]);
  const [anioHoy, mesHoy] = hoyLima().split("-").map((x) => Number(x));

  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-slate-900">Periodos mensuales</h1>

      {puedeGestionar && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          {borrador ? (
            <p className="text-slate-700">
              Ya hay un periodo en borrador:{" "}
              <Link
                href={`/periodos/${borrador.id}`}
                className="font-semibold text-blue-700 underline"
              >
                {etiquetaPeriodo(borrador.anio, borrador.mes)}
              </Link>
              . Emítelo o ciérralo antes de crear otro.
            </p>
          ) : (
            <>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Crear nuevo periodo
              </h2>
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
          <p className="text-slate-500">Aún no hay periodos.</p>
        )}
        {periodos.map((p) => (
          <Link
            key={p.id}
            href={`/periodos/${p.id}`}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50"
          >
            <span className="text-lg font-semibold text-slate-900">
              {etiquetaPeriodo(p.anio, p.mes)}
            </span>
            <EstadoPeriodoBadge estado={p.estado} />
          </Link>
        ))}
      </section>
    </main>
  );
}
