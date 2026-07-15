import { notFound } from "next/navigation";
import Link from "next/link";
import { getPerfil } from "@/lib/roles";
import {
  getPeriodo,
  getLecturas,
  getRecibos,
  getCuotas,
  getPagadoPorCuota,
} from "@/lib/periodos";
import { etiquetaPeriodo, hoyLima } from "@/lib/fechas";
import { formatoPEN } from "@/lib/centimos";
import { EstadoPeriodoBadge } from "@/components/estados";
import { CuotasDesglose } from "@/components/CuotasDesglose";
import { Semaforo } from "@/components/Semaforo";
import { FormRecibo } from "@/components/forms/recibo";
import { FormAccionPeriodo } from "@/components/forms/periodo";
import { FormPago } from "@/components/forms/pago";
import {
  guardarRecibo,
  generarCuotas,
  emitirPeriodo,
  registrarPago,
} from "../acciones";

export default async function PeriodoDetallePage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();

  const perfil = await getPerfil();
  if (!perfil) return null;

  const periodo = await getPeriodo(id);
  if (!periodo) notFound();

  const gestiona = perfil.rol === "tesoreria" || perfil.rol === "admin";
  const [lecturas, recibos, cuotas] = await Promise.all([
    getLecturas(id),
    getRecibos(id),
    getCuotas(id),
  ]);

  const cuotasGeneradas = cuotas.length === 10;
  const recibosCompletos = Boolean(recibos.agua && recibos.luz);
  const listoParaGenerar = recibosCompletos && lecturas.length === 10;

  return (
    <main className="flex flex-col gap-6">
      <div>
        <Link href="/periodos" className="text-sm font-semibold text-slate-500">
          ← Periodos
        </Link>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">
            {etiquetaPeriodo(periodo.anio, periodo.mes)}
          </h1>
          <EstadoPeriodoBadge estado={periodo.estado} />
        </div>
      </div>

      {periodo.estado === "borrador" && (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Preparación
            </h2>
            <ul className="flex flex-col gap-1 text-slate-800">
              <li>
                {lecturas.length === 10 ? "✅" : "⬜"} Lecturas de agua:{" "}
                <span className="font-semibold">{lecturas.length}/10</span>
              </li>
              <li>
                {recibos.agua ? "✅" : "⬜"} Recibo de agua
                {recibos.agua ? `: ${formatoPEN(recibos.agua.monto_cent)}` : ""}
              </li>
              <li>
                {recibos.luz ? "✅" : "⬜"} Recibo de luz
                {recibos.luz ? `: ${formatoPEN(recibos.luz.monto_cent)}` : ""}
              </li>
            </ul>
            <div className="mt-4">
              <Link href="/lecturas" className="btn-secondary inline-flex">
                Ingresar / editar lecturas
              </Link>
            </div>
          </section>

          {gestiona && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Recibos del mes
              </h2>
              <div className="flex flex-col gap-6">
                <FormRecibo
                  accion={guardarRecibo}
                  periodoId={id}
                  tipo="agua"
                  montoActualCent={recibos.agua?.monto_cent ?? null}
                />
                <FormRecibo
                  accion={guardarRecibo}
                  periodoId={id}
                  tipo="luz"
                  montoActualCent={recibos.luz?.monto_cent ?? null}
                />
              </div>
            </section>
          )}

          {gestiona && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Calcular cuotas
              </h2>
              {!listoParaGenerar && (
                <p className="mb-3 text-sm text-amber-700">
                  Necesitas las 10 lecturas y los dos recibos antes de calcular.
                </p>
              )}
              <FormAccionPeriodo
                accion={generarCuotas}
                periodoId={id}
                texto={cuotasGeneradas ? "Recalcular cuotas" : "Calcular cuotas"}
                textoEnviando="Calculando…"
                className="btn-primary"
              />
            </section>
          )}

          {cuotasGeneradas && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Borrador de cuotas
              </h2>
              <CuotasDesglose cuotas={cuotas} recibos={recibos} />
              {gestiona && (
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <p className="mb-3 text-sm text-slate-600">
                    Al emitir, las cuotas se congelan y ya no se pueden editar. Las
                    correcciones futuras se hacen como ajustes del mes siguiente.
                  </p>
                  <FormAccionPeriodo
                    accion={emitirPeriodo}
                    periodoId={id}
                    texto="Emitir periodo"
                    textoEnviando="Emitiendo…"
                    confirmar="¿Emitir el periodo? Las cuotas quedarán congeladas."
                  />
                </div>
              )}
            </section>
          )}

          {!gestiona && perfil.rol === "residente" && (
            <p className="text-slate-500">
              Este mes está en preparación. Pronto verás tu cuota.
            </p>
          )}
        </>
      )}

      {(periodo.estado === "emitido" || periodo.estado === "cerrado") && (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Quién pagó
            </h2>
            <Semaforo cuotas={cuotas} />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Cuotas del mes
            </h2>
            <CuotasDesglose cuotas={cuotas} recibos={recibos} mostrarEstado />
          </section>

          {gestiona && periodo.estado === "emitido" && (
            <PagosSection periodoId={id} />
          )}

          {periodo.estado === "cerrado" && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-800">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Caja del mes
              </h2>
              <p>
                Saldo inicial:{" "}
                <span className="font-semibold">
                  {periodo.saldo_inicial_cent !== null
                    ? formatoPEN(periodo.saldo_inicial_cent)
                    : "—"}
                </span>
              </p>
              <p>
                Saldo final:{" "}
                <span className="font-semibold">
                  {periodo.saldo_final_cent !== null
                    ? formatoPEN(periodo.saldo_final_cent)
                    : "—"}
                </span>
              </p>
            </section>
          )}
        </>
      )}
    </main>
  );
}

// Sección de pagos por dpto (tesorería/admin, periodo emitido).
async function PagosSection({ periodoId }: { periodoId: number }) {
  const [cuotas, pagado] = await Promise.all([
    getCuotas(periodoId),
    getPagadoPorCuota(periodoId),
  ]);
  const hoy = hoyLima();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Registrar pagos
      </h2>
      <ul className="flex flex-col gap-2">
        {cuotas.map((c) => {
          const pagadoCent = pagado.get(c.id) ?? 0;
          const saldo = c.total_cent - pagadoCent;
          return (
            <li key={c.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">Dpto {c.dpto_id}</span>
                <span className="text-sm text-slate-600">
                  {formatoPEN(pagadoCent)} / {formatoPEN(c.total_cent)}
                </span>
              </div>
              {saldo <= 0 ? (
                <p className="mt-1 text-sm font-medium text-green-700">Pagado ✓</p>
              ) : (
                <details>
                  <summary className="mt-1 cursor-pointer text-sm font-medium text-blue-700">
                    Registrar pago (saldo {formatoPEN(saldo)})
                  </summary>
                  <FormPago
                    accion={registrarPago}
                    periodoId={periodoId}
                    cuotaId={c.id}
                    saldoPendienteCent={saldo}
                    fechaHoy={hoy}
                  />
                </details>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
