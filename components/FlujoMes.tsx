import Link from "next/link";
import type { Paso } from "@/lib/flujo";
import { IconoCheck, IconoCandado, IconoFlecha } from "@/components/iconos";

// Stepper vertical del flujo mensual: qué se hizo, qué toca y qué falta.
// La guía visual para que cualquiera cierre el mes sin saber contabilidad.
export function FlujoMes({ pasos }: { pasos: Paso[] }) {
  return (
    <ol className="flex flex-col">
      {pasos.map((paso, i) => {
        const ultimo = i === pasos.length - 1;
        return (
          <li key={paso.clave} className="relative flex gap-3">
            {!ultimo && (
              <span
                aria-hidden
                className={`absolute left-[15px] top-9 h-[calc(100%-2.25rem)] w-0.5 rounded ${
                  paso.estado === "hecho" ? "bg-emerald-500" : "bg-slate-200"
                }`}
              />
            )}

            <span
              className={`z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                paso.estado === "hecho"
                  ? "bg-emerald-600 text-white"
                  : paso.estado === "actual"
                    ? "bg-slate-900 text-white ring-4 ring-slate-900/15"
                    : "border-2 border-slate-200 bg-white text-slate-400"
              }`}
            >
              {paso.estado === "hecho" ? (
                <IconoCheck className="h-4 w-4" />
              ) : paso.estado === "bloqueado" ? (
                <IconoCandado className="h-4 w-4" />
              ) : (
                i + 1
              )}
            </span>

            <div className={`min-w-0 flex-1 ${ultimo ? "" : "pb-5"}`}>
              <div className="flex flex-wrap items-center gap-2">
                <h3
                  className={`font-semibold ${
                    paso.estado === "actual"
                      ? "text-slate-900"
                      : paso.estado === "hecho"
                        ? "text-slate-700"
                        : "text-slate-400"
                  }`}
                >
                  {paso.titulo}
                </h3>
                {paso.detalle && (
                  <span
                    className={`chip ${
                      paso.estado === "hecho"
                        ? "bg-emerald-100 text-emerald-800"
                        : paso.estado === "actual"
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {paso.detalle}
                  </span>
                )}
              </div>

              {paso.estado === "actual" && (
                <>
                  <p className="mt-1 text-sm text-slate-600">{paso.descripcion}</p>
                  {paso.href && (
                    <Link
                      href={paso.href}
                      className="btn-primary mt-3 min-h-[44px] px-4 py-2.5 text-sm"
                    >
                      {paso.cta}
                      <IconoFlecha className="h-4 w-4" />
                    </Link>
                  )}
                </>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
