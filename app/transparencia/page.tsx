import type { Metadata } from "next";
import Link from "next/link";
import { getDatosTransparencia } from "@/lib/transparencia";
import { formatoPEN } from "@/lib/centimos";
import {
  etiquetaPeriodo,
  formatoFecha,
  mesesDesde,
  textoAntiguedad,
} from "@/lib/fechas";
import { Edificio } from "@/components/Edificio";
import { mapaEdificio } from "@/lib/edificio";
import { ConsumoAgua } from "@/components/ConsumoAgua";
import { Progreso } from "@/components/Progreso";
import { IconoAlerta, IconoFlecha, IconoCandado } from "@/components/iconos";

// Página PÚBLICA (sin login). Se comparte por WhatsApp con los vecinos.
// Solo lectura: los datos vienen del cliente anónimo (RLS `pub_*`).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Las cuentas del edificio · Chardin 177",
  description:
    "La caja, los gastos, el consumo de agua y los pagos del mes del edificio Chardin 177, siempre al día.",
};

export default async function TransparenciaPage() {
  const d = await getDatosTransparencia();
  const hayAlgo =
    d.libro ||
    d.semaforo ||
    d.egresos.length > 0 ||
    d.consumos.length > 0 ||
    d.estados.length > 0;

  return (
    <main className="min-h-dvh bg-gradient-to-b from-white via-slate-50 to-slate-200">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6 sm:px-6">
        {/* ——— Encabezado ——— */}
        <header className="animar-aparecer">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-sm font-black text-white shadow">
                177
              </span>
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900">
                  Chardin 177
                </h1>
                <p className="text-xs text-slate-500">Barranco, Lima · 10 dptos</p>
              </div>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-700"
            >
              <IconoCandado className="h-3.5 w-3.5" />
              Ingresar
            </Link>
          </div>
          <div className="mt-4">
            <h2 className="text-2xl font-black tracking-tight text-slate-900">
              Las cuentas del edificio
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Cuánto hay en caja, en qué se gasta, el consumo de agua y los
              pagos del mes, siempre al día. Es una página{" "}
              <span className="font-semibold text-slate-800">
                solo de consulta
              </span>
              : aquí no se puede modificar nada.
            </p>
          </div>
        </header>

        {!hayAlgo && (
          <section className="card animar-aparecer p-6 text-center">
            <p className="text-4xl" aria-hidden>
              🗓️
            </p>
            <h3 className="mt-2 text-lg font-bold text-slate-900">
              Aún no hay información publicada
            </h3>
            <p className="mt-1 text-slate-600">
              Cuando la administración emita el primer mes, aquí aparecerá todo
              el detalle.
            </p>
          </section>
        )}

        {/* ——— Caja del edificio ——— */}
        {d.libro && (
          <section className="card animar-aparecer p-5">
            <h3 className="titulo-seccion">Caja del edificio</h3>
            <p className="num mt-1 text-4xl font-black text-slate-900">
              {formatoPEN(d.libro.saldoActualCent)}
            </p>
            <p className="text-xs text-slate-500">
              {etiquetaPeriodo(d.libro.periodo.anio, d.libro.periodo.mes)} · saldo
              en vivo
            </p>

            {d.totalProvisionesCent !== 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Apartado (provisiones)</p>
                  <p className="num mt-0.5 text-lg font-bold text-slate-900">
                    {formatoPEN(d.totalProvisionesCent)}
                  </p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3">
                  <p className="text-xs text-emerald-700">Disponible real</p>
                  <p className="num mt-0.5 text-lg font-bold text-emerald-800">
                    {formatoPEN(d.disponibleCent ?? 0)}
                  </p>
                </div>
              </div>
            )}

            {d.provisiones.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {d.provisiones.map((p) => (
                  <li
                    key={p.concepto}
                    className="num chip bg-slate-100 text-slate-700"
                  >
                    {p.concepto}: {formatoPEN(p.saldoCent)}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* ——— Semáforo de pagos del mes ——— */}
        {d.semaforo && (
          <section className="card animar-aparecer p-5">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="titulo-seccion">Quién pagó</h3>
              <span className="text-xs font-semibold text-slate-500">
                {etiquetaPeriodo(
                  d.semaforo.periodo.anio,
                  d.semaforo.periodo.mes,
                )}
              </span>
            </div>

            <div className="mb-4 mt-2">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-slate-600">Recaudado</span>
                <span className="num font-bold text-slate-900">
                  {formatoPEN(d.semaforo.recaudadoCent)}
                  <span className="font-normal text-slate-400">
                    {" "}
                    de {formatoPEN(d.semaforo.esperadoCent)}
                  </span>
                </span>
              </div>
              <div className="mt-2">
                <Progreso
                  valor={d.semaforo.recaudadoCent}
                  max={d.semaforo.esperadoCent}
                  etiqueta="Recaudación del mes"
                />
              </div>
            </div>

            <Edificio
              deptos={mapaEdificio(d.semaforo.cuotas, d.semaforo.pagadoPorCuota)}
            />
            <p className="mt-3 text-center text-xs text-slate-500">
              Toca una ventana para ver el detalle del departamento.
            </p>
          </section>
        )}

        {/* ——— Estado de cuenta por departamento ——— */}
        {d.estados.length > 0 && (
          <section className="card animar-aparecer p-5">
            <h3 className="titulo-seccion mb-3">Estado de cuenta por dpto</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="num w-full text-right text-xs">
                <thead className="bg-slate-100 uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-2 py-2 text-left">Dpto</th>
                    <th className="px-2 py-2">Cargos</th>
                    <th className="px-2 py-2">Pagos</th>
                    <th className="px-2 py-2">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {d.estados.map((f) => (
                    <tr
                      key={f.dpto}
                      className="border-t border-slate-100 bg-white even:bg-slate-50/60"
                    >
                      <td className="px-2 py-2 text-left font-bold text-slate-900">
                        {f.dpto}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-slate-600">
                        {formatoPEN(f.cargos)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-slate-600">
                        {formatoPEN(f.abonos)}
                      </td>
                      <td
                        className={`whitespace-nowrap px-2 py-2 font-bold ${
                          f.saldo > 0 ? "text-red-700" : "text-emerald-700"
                        }`}
                      >
                        {f.saldo > 0 ? formatoPEN(f.saldo) : "Al día"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Deudas con antigüedad */}
            {d.deudas.length > 0 && (
              <div className="mt-4">
                <h4 className="titulo-seccion mb-2">Deudas por antigüedad</h4>
                <ul className="flex flex-col gap-2">
                  {d.deudas.map((deuda) => {
                    const masAntigua = deuda.cuotas[0];
                    const antiguedad = masAntigua
                      ? mesesDesde(masAntigua.anio, masAntigua.mes)
                      : 0;
                    return (
                      <li
                        key={deuda.dpto}
                        className="rounded-xl border border-slate-200 p-3"
                      >
                        <details className="group">
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
                            <span className="flex items-center gap-2">
                              <IconoFlecha className="h-3.5 w-3.5 text-slate-400 transition-transform group-open:rotate-90" />
                              <span className="font-bold text-slate-900">
                                Dpto {deuda.dpto}
                              </span>
                              {antiguedad >= 2 && (
                                <span className="chip bg-red-100 text-red-800">
                                  <IconoAlerta className="h-3 w-3" />
                                  {textoAntiguedad(antiguedad)}
                                </span>
                              )}
                            </span>
                            <span className="num font-bold text-red-700">
                              {formatoPEN(deuda.totalCent)}
                            </span>
                          </summary>
                          <ul className="num mt-2 flex flex-col gap-1 border-t border-slate-100 pt-2 text-sm">
                            {deuda.cuotas.map((c) => (
                              <li
                                key={`${c.anio}-${c.mes}`}
                                className="flex items-baseline justify-between gap-2"
                              >
                                <span className="text-slate-600">
                                  {etiquetaPeriodo(c.anio, c.mes)}
                                </span>
                                <span className="font-semibold text-slate-900">
                                  {formatoPEN(c.saldoCent)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </details>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            <p className="mt-3 text-xs text-slate-500">
              Al día = pagó todo lo emitido. Un saldo a favor es un adelanto del
              departamento.
            </p>
          </section>
        )}

        {/* ——— Gastos con comprobante ——— */}
        {d.egresos.length > 0 && (
          <section className="card animar-aparecer p-5">
            <h3 className="titulo-seccion mb-3">Gastos del edificio</h3>
            <ul className="flex flex-col divide-y divide-slate-100">
              {d.egresos.map((e) => (
                <li
                  key={e.id}
                  className="flex items-baseline justify-between gap-3 py-2 text-sm"
                >
                  <span className="min-w-0">
                    <span className="font-medium text-slate-800">
                      {e.concepto}
                    </span>{" "}
                    <span className="num text-xs text-slate-400">
                      {formatoFecha(e.fecha)}
                    </span>
                    {e.comprobanteUrl && (
                      <>
                        {" "}
                        <a
                          href={e.comprobanteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-slate-500 underline underline-offset-2 hover:text-slate-900"
                        >
                          comprobante
                        </a>
                      </>
                    )}
                  </span>
                  <span className="num shrink-0 font-bold text-slate-900">
                    {formatoPEN(e.monto_cent)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ——— Consumo de agua ——— */}
        {d.consumos.length > 0 && (
          <section className="card animar-aparecer p-5">
            <h3 className="titulo-seccion mb-3">Consumo de agua por dpto</h3>
            <ConsumoAgua consumos={d.consumos} />
          </section>
        )}

        <footer className="pb-6 pt-2 text-center text-xs text-slate-400">
          Chardin 177 · Barranco, Lima · Página de consulta
        </footer>
      </div>
    </main>
  );
}
