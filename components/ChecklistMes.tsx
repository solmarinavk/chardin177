import Link from "next/link";
import type { Paso, DptoPendiente, TareaRecurrente } from "@/lib/flujo";
import { formatoPEN } from "@/lib/centimos";
import { IconoCheck, IconoCandado, IconoFlecha, IconoReloj } from "@/components/iconos";

// 6.8 · La lista del mes, entera y de un vistazo: qué está hecho, qué toca y
// qué falta — con nombre y apellido (qué dptos deben, qué gastos fijos no se
// han registrado). Cada línea pendiente es un enlace directo a hacerlo.
export function ChecklistMes({
  pasos,
  pendientes,
  periodoId,
  recurrentes,
}: {
  pasos: Paso[];
  pendientes: DptoPendiente[];
  periodoId: number;
  recurrentes: TareaRecurrente[];
}) {
  const hechos = pasos.filter((p) => p.estado === "hecho").length;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="titulo-seccion">El mes, paso a paso</h3>
          <span className="num text-xs font-semibold text-slate-500">
            {hechos} de {pasos.length} listos
          </span>
        </div>
        <ol className="mt-2 flex flex-col divide-y divide-slate-100">
          {pasos.map((paso, i) => (
            <li key={paso.clave} className="py-2.5">
              <div className="flex items-start gap-3">
                <Marca estado={paso.estado} numero={i + 1} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span
                      className={`font-semibold ${
                        paso.estado === "hecho"
                          ? "text-slate-500 line-through decoration-slate-300"
                          : paso.estado === "actual"
                            ? "text-slate-900"
                            : "text-slate-400"
                      }`}
                    >
                      {paso.titulo}
                    </span>
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

                  {paso.estado === "actual" && paso.clave === "pagos" && pendientes.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-slate-600">
                        Faltan {pendientes.length} departamento
                        {pendientes.length === 1 ? "" : "s"}. Toca uno para registrarle el
                        pago:
                      </p>
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {pendientes.map((d) => (
                          <li key={d.dpto}>
                            <Link
                              href={`/periodos/${periodoId}?pagar=${d.dpto}#dpto-${d.dpto}`}
                              className={`flex min-h-[44px] flex-col justify-center rounded-xl border px-3 py-1.5 leading-tight ${
                                d.parcial
                                  ? "border-amber-300 bg-amber-50 hover:bg-amber-100"
                                  : "border-red-200 bg-red-50 hover:bg-red-100"
                              }`}
                            >
                              <span className="font-bold text-slate-900">Dpto {d.dpto}</span>
                              <span className="num text-xs text-slate-600">
                                {d.parcial ? "falta " : "debe "}
                                {formatoPEN(d.debeCent)}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {paso.estado === "actual" && paso.clave !== "pagos" && paso.href && (
                    <Link
                      href={paso.href}
                      className="mt-2 inline-flex min-h-[40px] items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-200"
                    >
                      {paso.cta}
                      <IconoFlecha className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div>
        <h3 className="titulo-seccion">Cada mes, además</h3>
        <ul className="mt-2 flex flex-col divide-y divide-slate-100">
          {recurrentes.map((t) => (
            <li key={t.clave} className="flex items-start gap-3 py-2.5">
              <span
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  t.estado === "hecho"
                    ? "bg-emerald-600 text-white"
                    : t.estado === "pendiente"
                      ? "bg-amber-100 text-amber-800"
                      : "border-2 border-slate-200 bg-white text-slate-300"
                }`}
                aria-hidden
              >
                {t.estado === "hecho" ? (
                  <IconoCheck className="h-4 w-4" />
                ) : (
                  <IconoReloj className="h-4 w-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span
                    className={`font-semibold ${
                      t.estado === "hecho"
                        ? "text-slate-500 line-through decoration-slate-300"
                        : t.estado === "pendiente"
                          ? "text-slate-900"
                          : "text-slate-400"
                    }`}
                  >
                    {t.titulo}
                  </span>
                  <span
                    className={`chip ${
                      t.estado === "hecho"
                        ? "bg-emerald-100 text-emerald-800"
                        : t.estado === "pendiente"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {t.detalle}
                  </span>
                </div>
                {t.estado === "pendiente" && (
                  <>
                    <p className="mt-0.5 text-sm text-slate-600">{t.descripcion}</p>
                    <Link
                      href={t.href}
                      className="mt-2 inline-flex min-h-[40px] items-center gap-1 rounded-xl bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-200"
                    >
                      Registrar ahora
                      <IconoFlecha className="h-4 w-4" />
                    </Link>
                  </>
                )}
                {t.estado === "despues" && (
                  <p className="mt-0.5 text-xs text-slate-400">Todavía no toca.</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Marca({ estado, numero }: { estado: Paso["estado"]; numero: number }) {
  return (
    <span
      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
        estado === "hecho"
          ? "bg-emerald-600 text-white"
          : estado === "actual"
            ? "bg-slate-900 text-white ring-4 ring-slate-900/15"
            : "border-2 border-slate-200 bg-white text-slate-400"
      }`}
      aria-hidden
    >
      {estado === "hecho" ? (
        <IconoCheck className="h-4 w-4" />
      ) : estado === "bloqueado" ? (
        <IconoCandado className="h-3.5 w-3.5" />
      ) : (
        numero
      )}
    </span>
  );
}
