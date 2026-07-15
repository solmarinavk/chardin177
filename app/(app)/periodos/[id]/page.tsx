import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPerfil } from "@/lib/roles";
import { getPeriodo, getResumenPeriodo, type ResumenPeriodo } from "@/lib/periodos";
import { pasosDelMes } from "@/lib/flujo";
import { etiquetaPeriodo, hoyLima } from "@/lib/fechas";
import { formatoPEN } from "@/lib/centimos";
import { EstadoPeriodoBadge } from "@/components/estados";
import { CuotasDesglose } from "@/components/CuotasDesglose";
import { Semaforo } from "@/components/Semaforo";
import { FlujoMes } from "@/components/FlujoMes";
import { Progreso } from "@/components/Progreso";
import { FormRecibo } from "@/components/forms/recibo";
import { FormAccionPeriodo } from "@/components/forms/periodo";
import { FormPago } from "@/components/forms/pago";
import { IconoFlecha, IconoCheck, IconoAlerta, IconoGota } from "@/components/iconos";
import {
  guardarRecibo,
  generarCuotas,
  emitirPeriodo,
  registrarPago,
} from "../acciones";

export const metadata: Metadata = { title: "Periodo" };

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

  const resumen = await getResumenPeriodo(periodo);
  const pasos = pasosDelMes(periodo, {
    lecturas: resumen.lecturas,
    reciboAgua: resumen.reciboAgua,
    reciboLuz: resumen.reciboLuz,
    cuotas: resumen.cuotas.length,
    cuotasPagadas: resumen.cuotasPagadas,
  });
  const gestiona = perfil.rol === "tesoreria" || perfil.rol === "admin";

  const cuotasGeneradas = resumen.cuotas.length === 10;
  const listoParaGenerar =
    resumen.reciboAgua && resumen.reciboLuz && resumen.lecturas === 10;

  return (
    <main className="flex flex-col gap-5">
      <div className="animar-aparecer">
        <Link
          href="/periodos"
          className="text-sm font-semibold text-slate-500 hover:text-slate-900"
        >
          ← Periodos
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            {etiquetaPeriodo(periodo.anio, periodo.mes)}
          </h1>
          <EstadoPeriodoBadge estado={periodo.estado} />
        </div>
      </div>

      {/* El GPS del mes */}
      <section className="card animar-aparecer p-5">
        <h2 className="titulo-seccion mb-4">Flujo del mes</h2>
        <FlujoMes pasos={pasos} />
      </section>

      {periodo.estado === "borrador" && (
        <>
          {/* Paso 1 · Lecturas */}
          <section
            id="lecturas"
            className="card animar-aparecer scroll-mt-24 p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                  <IconoGota className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-900">Lecturas de agua</h2>
                  <p className="num text-sm text-slate-500">
                    {resumen.lecturas} de 10 medidores
                  </p>
                </div>
              </div>
              <Link
                href="/lecturas"
                className="btn-secondary min-h-[44px] shrink-0 px-4 py-2.5 text-sm"
              >
                {resumen.lecturas === 10 ? "Revisar" : "Ingresar"}
              </Link>
            </div>
            <div className="mt-3">
              <Progreso valor={resumen.lecturas} max={10} etiqueta="Avance de lecturas" />
            </div>
          </section>

          {/* Paso 2 · Recibos */}
          {gestiona && (
            <section
              id="recibos"
              className="card animar-aparecer scroll-mt-24 p-5"
            >
              <h2 className="titulo-seccion mb-3">Recibos del mes</h2>
              <div className="flex flex-col gap-4">
                <FormRecibo
                  accion={guardarRecibo}
                  periodoId={id}
                  tipo="agua"
                  montoActualCent={resumen.recibos.agua?.monto_cent ?? null}
                />
                <FormRecibo
                  accion={guardarRecibo}
                  periodoId={id}
                  tipo="luz"
                  montoActualCent={resumen.recibos.luz?.monto_cent ?? null}
                />
              </div>
            </section>
          )}

          {/* Paso 3 · Calcular */}
          {gestiona && (
            <section
              id="calcular"
              className="card animar-aparecer scroll-mt-24 p-5"
            >
              <h2 className="titulo-seccion mb-2">Calcular cuotas</h2>
              {listoParaGenerar ? (
                <p className="mb-3 flex items-center gap-1.5 text-sm text-emerald-700">
                  <IconoCheck className="h-4 w-4" />
                  Todo listo para calcular.
                </p>
              ) : (
                <p className="mb-3 flex items-start gap-1.5 text-sm text-amber-700">
                  <IconoAlerta className="mt-0.5 h-4 w-4 shrink-0" />
                  Faltan {resumen.lecturas < 10 ? `lecturas (${resumen.lecturas}/10)` : ""}
                  {resumen.lecturas < 10 && !(resumen.reciboAgua && resumen.reciboLuz)
                    ? " y "
                    : ""}
                  {!(resumen.reciboAgua && resumen.reciboLuz) ? "recibos" : ""} para poder
                  calcular.
                </p>
              )}
              <FormAccionPeriodo
                accion={generarCuotas}
                periodoId={id}
                texto={cuotasGeneradas ? "Recalcular cuotas" : "Calcular cuotas"}
                textoEnviando="Calculando…"
                className="btn-primary w-full"
              />
            </section>
          )}

          {/* Borrador calculado + Emitir */}
          {cuotasGeneradas && (
            <section
              id="emitir"
              className="card animar-aparecer scroll-mt-24 p-5"
            >
              <h2 className="titulo-seccion mb-3">Borrador de cuotas</h2>
              <CuotasDesglose cuotas={resumen.cuotas} recibos={resumen.recibos} />
              {gestiona && (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-bold text-slate-900">
                    Emitir {etiquetaPeriodo(periodo.anio, periodo.mes)}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Se congelarán las 10 cuotas por un total de{" "}
                    <span className="num font-bold text-slate-900">
                      {formatoPEN(resumen.esperadoCent)}
                    </span>
                    . Después de emitir ya no se editan lecturas ni recibos de este
                    mes; toda corrección va como ajuste del mes siguiente.
                  </p>
                  <div className="mt-3">
                    <FormAccionPeriodo
                      accion={emitirPeriodo}
                      periodoId={id}
                      texto="Emitir periodo"
                      textoEnviando="Emitiendo…"
                      className="btn-primary w-full"
                      confirmar="¿Emitir el periodo? Las cuotas quedarán congeladas y los vecinos las verán."
                    />
                  </div>
                </div>
              )}
            </section>
          )}

          {!gestiona && perfil.rol === "residente" && (
            <p className="animar-aparecer text-center text-slate-500">
              Este mes está en preparación. Cuando se emita verás tu cuota aquí.
            </p>
          )}
        </>
      )}

      {(periodo.estado === "emitido" || periodo.estado === "cerrado") && (
        <>
          {/* Recaudación + semáforo */}
          <section className="card animar-aparecer p-5">
            <h2 className="titulo-seccion mb-3">Quién pagó</h2>
            <div className="mb-4">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-slate-600">Recaudado</span>
                <span className="num font-bold text-slate-900">
                  {formatoPEN(resumen.recaudadoCent)}
                  <span className="font-normal text-slate-400">
                    {" "}
                    de {formatoPEN(resumen.esperadoCent)}
                  </span>
                </span>
              </div>
              <div className="mt-2">
                <Progreso
                  valor={resumen.recaudadoCent}
                  max={resumen.esperadoCent}
                  etiqueta="Recaudación del mes"
                />
              </div>
            </div>
            <Semaforo cuotas={resumen.cuotas} pagadoPorCuota={resumen.pagadoPorCuota} />
          </section>

          {/* Registrar pagos */}
          {gestiona && periodo.estado === "emitido" && (
            <PagosSection resumen={resumen} periodoId={id} />
          )}

          {/* Desglose */}
          <section className="card animar-aparecer p-5">
            <h2 className="titulo-seccion mb-3">Cuotas del mes</h2>
            <CuotasDesglose
              cuotas={resumen.cuotas}
              recibos={resumen.recibos}
              mostrarEstado
            />
          </section>

          {periodo.estado === "cerrado" && (
            <section className="card animar-aparecer p-5">
              <h2 className="titulo-seccion mb-3">Caja del mes</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Saldo inicial</p>
                  <p className="num text-lg font-bold text-slate-900">
                    {periodo.saldo_inicial_cent !== null
                      ? formatoPEN(periodo.saldo_inicial_cent)
                      : "—"}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Saldo final</p>
                  <p className="num text-lg font-bold text-slate-900">
                    {periodo.saldo_final_cent !== null
                      ? formatoPEN(periodo.saldo_final_cent)
                      : "—"}
                  </p>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}

// Sección de cobranza por dpto (tesorería/admin, periodo emitido).
function PagosSection({
  resumen,
  periodoId,
}: {
  resumen: ResumenPeriodo;
  periodoId: number;
}) {
  const hoy = hoyLima();
  const pendientes = resumen.cuotas.filter((c) => c.estado !== "pagado");

  return (
    <section id="pagos" className="card animar-aparecer scroll-mt-24 p-5">
      <h2 className="titulo-seccion mb-3">Registrar pagos</h2>
      {pendientes.length === 0 ? (
        <p className="flex items-center gap-1.5 font-medium text-emerald-700">
          <IconoCheck className="h-5 w-5" />
          ¡Todos los departamentos pagaron! 🎉
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {resumen.cuotas.map((c) => {
            const pagadoCent = resumen.pagadoPorCuota.get(c.id) ?? 0;
            const saldo = c.total_cent - pagadoCent;
            return (
              <li key={c.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900">Dpto {c.dpto_id}</span>
                  <span className="num text-sm text-slate-600">
                    {formatoPEN(pagadoCent)} / {formatoPEN(c.total_cent)}
                  </span>
                </div>
                {saldo <= 0 ? (
                  <p className="mt-1 flex items-center gap-1 text-sm font-medium text-emerald-700">
                    <IconoCheck className="h-4 w-4" />
                    Pagado
                  </p>
                ) : (
                  <details className="group">
                    <summary className="mt-1 flex cursor-pointer list-none items-center gap-1 text-sm font-semibold text-slate-700 hover:text-slate-900">
                      <IconoFlecha className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
                      Registrar pago
                      <span className="num font-normal text-slate-500">
                        (debe {formatoPEN(saldo)})
                      </span>
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
      )}
    </section>
  );
}
