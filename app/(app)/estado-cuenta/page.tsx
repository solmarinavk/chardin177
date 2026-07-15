import type { Metadata } from "next";
import Link from "next/link";
import { requireRol } from "@/lib/roles";
import { getEstadosDeCuenta } from "@/lib/periodos";
import { getDeudasPorDpto } from "@/lib/caja";
import { etiquetaPeriodo, mesesDesde, textoAntiguedad } from "@/lib/fechas";
import { formatoPEN } from "@/lib/centimos";
import { IconoCheck, IconoFlecha, IconoAlerta } from "@/components/iconos";

export const metadata: Metadata = { title: "Estado de cuenta" };

export default async function EstadoCuentaPage() {
  // Portería solo usa lecturas (PROPUESTA §5).
  const perfil = await requireRol(["tesoreria", "admin", "residente"]);

  const [todos, deudas] = await Promise.all([
    getEstadosDeCuenta(),
    getDeudasPorDpto(),
  ]);
  // Si el perfil está asociado a un dpto, muestra solo el suyo; si no
  // (cuenta compartida de vecinos), muestra todos (transparencia).
  const filas =
    perfil.dpto_id != null ? todos.filter((f) => f.dpto === perfil.dpto_id) : todos;
  const deudasVisibles =
    perfil.dpto_id != null ? deudas.filter((d) => d.dpto === perfil.dpto_id) : deudas;

  const totCargos = filas.reduce((a, f) => a + f.cargos, 0);
  const totAbonos = filas.reduce((a, f) => a + f.abonos, 0);
  const totSaldo = totCargos - totAbonos;

  return (
    <main className="flex flex-col gap-5">
      <div className="animar-aparecer">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Estado de cuenta
        </h1>
        <p className="mt-1 text-slate-600">
          Cargos (cuotas emitidas) contra abonos (pagos) por departamento.
        </p>
      </div>

      {filas.length === 0 ? (
        <section className="card animar-aparecer p-6 text-center">
          <p className="text-4xl" aria-hidden>
            🧾
          </p>
          <h2 className="mt-2 text-lg font-bold text-slate-900">
            Aún no hay cuotas emitidas
          </h2>
          <p className="mt-1 text-slate-600">
            Cuando se emita el primer mes, aquí verás los cargos y pagos.{" "}
            <Link href="/periodos" className="font-semibold text-slate-900 underline">
              Ver periodos
            </Link>
          </p>
        </section>
      ) : (
        <>
          <section className="animar-aparecer grid grid-cols-3 gap-3">
            <div className="card p-4">
              <p className="titulo-seccion">Cargos</p>
              <p className="num mt-1 text-lg font-black text-slate-900">
                {formatoPEN(totCargos)}
              </p>
            </div>
            <div className="card p-4">
              <p className="titulo-seccion">Abonos</p>
              <p className="num mt-1 text-lg font-black text-emerald-700">
                {formatoPEN(totAbonos)}
              </p>
            </div>
            <div className="card p-4">
              <p className="titulo-seccion">Saldo</p>
              <p
                className={`num mt-1 text-lg font-black ${
                  totSaldo > 0 ? "text-red-700" : "text-emerald-700"
                }`}
              >
                {formatoPEN(totSaldo)}
              </p>
            </div>
          </section>

          <section
            className="animar-aparecer overflow-x-auto rounded-xl border border-slate-200 bg-white"
            style={{ animationDelay: "60ms" }}
          >
            <table className="num w-full min-w-[400px] text-right text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2.5 text-left">Dpto</th>
                  <th className="px-3 py-2.5">Cargos</th>
                  <th className="px-3 py-2.5">Abonos</th>
                  <th className="px-3 py-2.5">Situación</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr
                    key={f.dpto}
                    className="border-t border-slate-100 bg-white even:bg-slate-50/60"
                  >
                    <td className="px-3 py-2.5 text-left font-bold text-slate-900">
                      {f.dpto}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">
                      {formatoPEN(f.cargos)}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">
                      {formatoPEN(f.abonos)}
                    </td>
                    <td className="px-3 py-2.5">
                      {f.saldo > 0 ? (
                        <span className="chip bg-red-100 text-red-800">
                          Debe {formatoPEN(f.saldo)}
                        </span>
                      ) : (
                        <span className="chip bg-emerald-100 text-emerald-800">
                          <IconoCheck className="h-3.5 w-3.5" />
                          Al día
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <p className="text-xs text-slate-500">
            Al día = pagó todo lo emitido. Un saldo negativo es un adelanto a
            favor del departamento.
          </p>

          {/* ——— Morosidad con antigüedad (2.5) ——— */}
          {deudasVisibles.length > 0 && (
            <section
              className="card animar-aparecer p-5"
              style={{ animationDelay: "100ms" }}
            >
              <h2 className="titulo-seccion mb-3">Deudas por departamento</h2>
              <ul className="flex flex-col gap-2">
                {deudasVisibles.map((d) => {
                  const masAntigua = d.cuotas[0];
                  const antiguedad = masAntigua
                    ? mesesDesde(masAntigua.anio, masAntigua.mes)
                    : 0;
                  return (
                    <li
                      key={d.dpto}
                      className="rounded-xl border border-slate-200 p-3"
                    >
                      <details className="group">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
                          <span className="flex items-center gap-2">
                            <IconoFlecha className="h-3.5 w-3.5 text-slate-400 transition-transform group-open:rotate-90" />
                            <span className="font-bold text-slate-900">
                              Dpto {d.dpto}
                            </span>
                            {antiguedad >= 2 && (
                              <span className="chip bg-red-100 text-red-800">
                                <IconoAlerta className="h-3 w-3" />
                                {textoAntiguedad(antiguedad)}
                              </span>
                            )}
                          </span>
                          <span className="num font-bold text-red-700">
                            {formatoPEN(d.totalCent)}
                          </span>
                        </summary>
                        <ul className="num mt-2 flex flex-col gap-1 border-t border-slate-100 pt-2 text-sm">
                          {d.cuotas.map((c) => (
                            <li
                              key={`${c.anio}-${c.mes}`}
                              className="flex items-baseline justify-between gap-2"
                            >
                              <span className="text-slate-600">
                                {etiquetaPeriodo(c.anio, c.mes)}
                                <span className="text-xs text-slate-400">
                                  {" · "}
                                  {mesesDesde(c.anio, c.mes) === 0
                                    ? "este mes"
                                    : `hace ${textoAntiguedad(mesesDesde(c.anio, c.mes))}`}
                                </span>
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
              <p className="mt-3 text-xs text-slate-500">
                Las deudas se pagan desde la cobranza del periodo correspondiente;
                el dinero entra a la caja del mes en que se cobra.
              </p>
            </section>
          )}
        </>
      )}
    </main>
  );
}
