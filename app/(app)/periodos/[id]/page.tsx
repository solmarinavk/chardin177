import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRol } from "@/lib/roles";
import {
  getPeriodo,
  getResumenPeriodo,
  getPagosPorCuota,
  getDepartamentos,
  getDerramas,
  type ResumenPeriodo,
} from "@/lib/periodos";
import { getLibroCaja } from "@/lib/caja";
import { getConstanciasPendientes } from "@/lib/constancias";
import { pasosDelMes } from "@/lib/flujo";
import { etiquetaPeriodo, formatoFecha, hoyLima } from "@/lib/fechas";
import { formatoPEN } from "@/lib/centimos";
import { BUCKET_COMPROBANTES, urlFirmada } from "@/lib/storage";
import { EstadoPeriodoBadge } from "@/components/estados";
import { BotonExcel } from "@/components/BotonExcel";
import { CuotasDesglose } from "@/components/CuotasDesglose";
import { Semaforo } from "@/components/Semaforo";
import { FlujoMes } from "@/components/FlujoMes";
import { Progreso } from "@/components/Progreso";
import { FormRecibo } from "@/components/forms/recibo";
import { FormAccionPeriodo } from "@/components/forms/periodo";
import { FormPago } from "@/components/forms/pago";
import { IconoFlecha, IconoCheck, IconoAlerta, IconoGota } from "@/components/iconos";
import { FormAnularPago } from "@/components/forms/anular-pago";
import { FormDerrama, FormEliminarDerrama } from "@/components/forms/derrama";
import {
  FormConfirmarConstancia,
  FormRechazarConstancia,
} from "@/components/forms/constancia";
import {
  confirmarConstancia,
  rechazarConstancia,
} from "@/app/(app)/constancias/acciones";
import {
  guardarRecibo,
  generarCuotas,
  emitirPeriodo,
  registrarPago,
  anularPago,
  cerrarPeriodo,
  crearDerrama,
  eliminarDerrama,
} from "../acciones";

const MEDIO_TEXTO: Record<string, string> = {
  yape: "Yape",
  plin: "Plin",
  transferencia: "Transferencia",
  efectivo: "Efectivo",
  otro: "Otro",
};

export const metadata: Metadata = { title: "Periodo" };

export default async function PeriodoDetallePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { pagar?: string };
}) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();
  // 5.4a · Pago en un toque: ?pagar=301 llega desde el edificio del inicio y
  // abre directo el formulario de ese dpto (monto y fecha ya precargados).
  const pagarDpto = Number(searchParams.pagar);

  // Portería solo usa el módulo de lecturas (PROPUESTA §5); los datos
  // financieros del periodo son para tesorería y admin. Los vecinos ven el
  // resumen del mes en la web pública (/transparencia).
  const perfil = await requireRol(["tesoreria", "admin"]);

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

  // URLs firmadas de las fotos de los recibos (buckets privados).
  const fotoAgua = resumen.recibos.agua?.foto_url
    ? await urlFirmada(BUCKET_COMPROBANTES, resumen.recibos.agua.foto_url)
    : null;
  const fotoLuz = resumen.recibos.luz?.foto_url
    ? await urlFirmada(BUCKET_COMPROBANTES, resumen.recibos.luz.foto_url)
    : null;

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
          {periodo.estado !== "borrador" && (
            <BotonExcel href={`/api/exportar?modulo=periodo&periodo=${id}`} />
          )}
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
                  fotoUrl={fotoAgua}
                />
                <FormRecibo
                  accion={guardarRecibo}
                  periodoId={id}
                  tipo="luz"
                  montoActualCent={resumen.recibos.luz?.monto_cent ?? null}
                  fotoUrl={fotoLuz}
                />
              </div>
            </section>
          )}

          {/* Cuota extraordinaria (derrama) */}
          {gestiona && <DerramaSection periodoId={id} />}

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
              {cuotasGeneradas && (
                <p className="mt-2 text-xs text-slate-500">
                  Si después de calcular cambias alguna lectura o recibo, vuelve a
                  calcular antes de emitir.
                </p>
              )}
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
            <PagosSection resumen={resumen} periodoId={id} pagarDpto={pagarDpto} />
          )}

          {/* Cerrar el mes (2.3) */}
          {gestiona && periodo.estado === "emitido" && (
            <CierreSection resumen={resumen} periodoId={id} />
          )}

          {/* Desglose */}
          <section className="card animar-aparecer p-5">
            <h2 className="titulo-seccion mb-3">Cuotas del mes</h2>
            <CuotasDesglose
              cuotas={resumen.cuotas}
              recibos={resumen.recibos}
              mostrarEstado
            />
            {(fotoAgua || fotoLuz) && (
              <p className="mt-3 text-sm text-slate-600">
                Recibos del mes:{" "}
                {fotoAgua && (
                  <a
                    href={fotoAgua}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold underline underline-offset-2 hover:text-slate-900"
                  >
                    foto del recibo de agua
                  </a>
                )}
                {fotoAgua && fotoLuz && " · "}
                {fotoLuz && (
                  <a
                    href={fotoLuz}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold underline underline-offset-2 hover:text-slate-900"
                  >
                    foto del recibo de luz
                  </a>
                )}
              </p>
            )}
          </section>

          {/* Recibos por dpto (3.4) */}
          <section className="card animar-aparecer p-5">
            <h2 className="titulo-seccion mb-3">Recibos por departamento</h2>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {resumen.cuotas.map((c) => (
                <li key={c.dpto_id}>
                  <Link
                    href={`/periodos/${id}/recibo/${c.dpto_id}`}
                    className="flex items-center justify-center rounded-xl border border-slate-200 py-2.5 font-bold text-slate-800 hover:bg-slate-50"
                  >
                    {c.dpto_id}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-slate-500">
              Abre el recibo de un dpto para compartirlo por WhatsApp o imprimirlo.
            </p>
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

// Cierre de mes (2.3): resumen de caja, aviso de morosos y botón Cerrar.
async function CierreSection({
  resumen,
  periodoId,
}: {
  resumen: ResumenPeriodo;
  periodoId: number;
}) {
  const libro = await getLibroCaja(resumen.periodo);
  const morosos = resumen.cuotas.filter((c) => c.estado !== "pagado");
  const deudaCent = morosos.reduce(
    (a, c) => a + c.total_cent - (resumen.pagadoPorCuota.get(c.id) ?? 0),
    0,
  );

  return (
    <section id="cerrar" className="card animar-aparecer scroll-mt-24 p-5">
      <h2 className="titulo-seccion mb-3">Cerrar el mes</h2>

      <dl className="num flex flex-col gap-1.5 text-sm">
        <div className="flex items-baseline justify-between">
          <dt className="text-slate-600">Saldo inicial</dt>
          <dd className="font-semibold">{formatoPEN(libro.saldoInicialCent)}</dd>
        </div>
        <div className="flex items-baseline justify-between">
          <dt className="text-slate-600">+ Ingresos cobrados (incluye atrasos)</dt>
          <dd className="font-semibold text-emerald-700">
            {formatoPEN(libro.ingresosCent)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between">
          <dt className="text-slate-600">− Egresos pagados</dt>
          <dd className="font-semibold text-red-700">
            {formatoPEN(libro.egresosPagadosCent)}
          </dd>
        </div>
        <div className="flex items-baseline justify-between border-t border-slate-200 pt-1.5">
          <dt className="font-bold text-slate-900">Saldo final al cerrar</dt>
          <dd className="text-lg font-black text-slate-900">
            {formatoPEN(libro.saldoActualCent)}
          </dd>
        </div>
      </dl>

      {morosos.length > 0 && (
        <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
          <IconoAlerta className="mt-0.5 h-4 w-4 shrink-0" />
          {morosos.length} departamento{morosos.length === 1 ? "" : "s"} deben{" "}
          {formatoPEN(deudaCent)} en total. Al cerrar, esa deuda pasa a su cuenta
          corriente y podrá pagarse en los meses siguientes.
        </p>
      )}
      {libro.porPagarCent > 0 && (
        <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
          <IconoAlerta className="mt-0.5 h-4 w-4 shrink-0" />
          Hay egresos por pagar por {formatoPEN(libro.porPagarCent)} que NO se
          descuentan de esta caja. Márcalos como pagados antes de cerrar si ya
          salieron del dinero del edificio.
        </p>
      )}

      <p className="mt-3 text-sm text-slate-600">
        Al cerrar: el saldo final queda fijado, los pagos cobrados quedan
        contabilizados (ya no se pueden anular), los egresos del mes se congelan
        y se abre el mes siguiente con el saldo arrastrado.
      </p>

      <div className="mt-4">
        <FormAccionPeriodo
          accion={cerrarPeriodo}
          periodoId={periodoId}
          texto="Cerrar el mes"
          textoEnviando="Cerrando…"
          className="btn-primary w-full"
          confirmar={`¿Cerrar ${etiquetaPeriodo(resumen.periodo.anio, resumen.periodo.mes)}? El saldo final quedará fijado y se abrirá el mes siguiente.`}
        />
      </div>
    </section>
  );
}

// Cuota extraordinaria / derrama (3.2): crea EXTRA en el borrador. Solo se
// muestra en borrador (el motor la recoge al recalcular).
async function DerramaSection({ periodoId }: { periodoId: number }) {
  const [departamentos, derramas] = await Promise.all([
    getDepartamentos(),
    getDerramas(periodoId),
  ]);
  const dptos = departamentos.map((d) => d.id);

  return (
    <section className="card animar-aparecer p-5">
      <h2 className="titulo-seccion mb-3">Cuota extraordinaria (derrama)</h2>

      {derramas.length > 0 && (
        <ul className="mb-4 flex flex-col gap-2">
          {derramas.map((d) => (
            <li
              key={d.concepto}
              className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3"
            >
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{d.concepto}</p>
                <p className="num text-xs text-slate-500">
                  Total {formatoPEN(d.totalCent)} · {d.porDpto.size} dpto
                  {d.porDpto.size === 1 ? "" : "s"}
                </p>
              </div>
              <FormEliminarDerrama
                accion={eliminarDerrama}
                periodoId={periodoId}
                concepto={d.concepto}
              />
            </li>
          ))}
        </ul>
      )}

      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-1 text-sm font-semibold text-slate-700 hover:text-slate-900">
          <IconoFlecha className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
          Agregar una derrama
        </summary>
        <div className="mt-3">
          <FormDerrama accion={crearDerrama} periodoId={periodoId} dptos={dptos} />
          <p className="mt-2 text-xs text-slate-500">
            Después de crear la derrama, pulsa <b>Recalcular cuotas</b> para que se
            sume como EXTRA en cada departamento.
          </p>
        </div>
      </details>
    </section>
  );
}

// Sección de cobranza por dpto (tesorería/admin, periodo emitido): registrar
// pagos, ver el historial con comprobantes, y anular errores de digitación.
async function PagosSection({
  resumen,
  periodoId,
  pagarDpto,
}: {
  resumen: ResumenPeriodo;
  periodoId: number;
  pagarDpto?: number;
}) {
  const hoy = hoyLima();
  const [pagosPorCuota, constancias] = await Promise.all([
    getPagosPorCuota(periodoId),
    getConstanciasPendientes(periodoId),
  ]);
  const todoPagado = resumen.cuotas.every((c) => c.estado === "pagado");

  // URLs firmadas de las constancias y saldo sugerido por dpto.
  const urlsConstancia = new Map<number, string>();
  for (const c of constancias) {
    if (c.foto_url) {
      const u = await urlFirmada(BUCKET_COMPROBANTES, c.foto_url);
      if (u) urlsConstancia.set(c.id, u);
    }
  }
  const saldoDeDpto = new Map<number, number>();
  for (const c of resumen.cuotas) {
    saldoDeDpto.set(
      c.dpto_id,
      c.total_cent - (resumen.pagadoPorCuota.get(c.id) ?? 0),
    );
  }

  // URLs firmadas de los comprobantes (los buckets son privados).
  const urlsComprobante = new Map<number, string>();
  for (const pagos of pagosPorCuota.values()) {
    for (const p of pagos) {
      if (p.comprobante_url) {
        const url = await urlFirmada(BUCKET_COMPROBANTES, p.comprobante_url);
        if (url) urlsComprobante.set(p.id, url);
      }
    }
  }

  return (
    <section id="pagos" className="card animar-aparecer scroll-mt-24 p-5">
      <h2 className="titulo-seccion mb-3">Cobranza</h2>

      {/* 3.7 · Constancias del vecino por confirmar */}
      {constancias.length > 0 && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="mb-2 font-bold text-amber-900">
            Constancias por confirmar ({constancias.length})
          </p>
          <ul className="flex flex-col gap-3">
            {constancias.map((c) => (
              <li key={c.id} className="rounded-xl bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900">Dpto {c.dpto_id}</span>
                  <FormRechazarConstancia
                    accion={rechazarConstancia}
                    constanciaId={c.id}
                    periodoId={periodoId}
                  />
                </div>
                {c.nota && <p className="text-sm text-slate-600">{c.nota}</p>}
                <div className="mt-1 flex items-center gap-3 text-sm">
                  {c.monto_cent != null && (
                    <span className="num text-slate-600">
                      Dice: {formatoPEN(c.monto_cent)}
                    </span>
                  )}
                  {urlsConstancia.has(c.id) && (
                    <a
                      href={urlsConstancia.get(c.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-slate-500 underline underline-offset-2 hover:text-slate-900"
                    >
                      Ver constancia
                    </a>
                  )}
                </div>
                <FormConfirmarConstancia
                  accion={confirmarConstancia}
                  constanciaId={c.id}
                  periodoId={periodoId}
                  montoSugeridoCent={c.monto_cent ?? saldoDeDpto.get(c.dpto_id) ?? 0}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {todoPagado && (
        <p className="mb-3 flex items-center gap-1.5 font-medium text-emerald-700">
          <IconoCheck className="h-5 w-5" />
          ¡Todos los departamentos pagaron! 🎉
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {resumen.cuotas.map((c) => {
          const pagadoCent = resumen.pagadoPorCuota.get(c.id) ?? 0;
          const saldo = c.total_cent - pagadoCent;
          const pagos = pagosPorCuota.get(c.id) ?? [];
          const abrirPago = pagarDpto === c.dpto_id && saldo > 0;
          return (
            <li
              key={c.id}
              id={`dpto-${c.dpto_id}`}
              className={`scroll-mt-24 rounded-xl border p-3 ${
                abrirPago ? "border-slate-900 ring-2 ring-slate-900/10" : "border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-900">Dpto {c.dpto_id}</span>
                <span className="num text-sm text-slate-600">
                  {formatoPEN(pagadoCent)} / {formatoPEN(c.total_cent)}
                </span>
              </div>

              {pagos.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1 border-t border-slate-100 pt-2">
                  {pagos.map((p) => (
                    <li
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm"
                    >
                      <span className="num text-slate-600">
                        {formatoFecha(p.fecha_pago)} · {MEDIO_TEXTO[p.medio] ?? p.medio} ·{" "}
                        <span className="font-semibold text-slate-900">
                          {formatoPEN(p.monto_cent)}
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        {urlsComprobante.has(p.id) && (
                          <a
                            href={urlsComprobante.get(p.id)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-slate-500 underline underline-offset-2 hover:text-slate-900"
                          >
                            Comprobante
                          </a>
                        )}
                        <FormAnularPago
                          accion={anularPago}
                          pagoId={p.id}
                          periodoId={periodoId}
                          descripcion={`${formatoPEN(p.monto_cent)} del dpto ${c.dpto_id}`}
                        />
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {saldo <= 0 ? (
                <p className="mt-1 flex items-center gap-1 text-sm font-medium text-emerald-700">
                  <IconoCheck className="h-4 w-4" />
                  Pagado
                </p>
              ) : (
                <details className="group" open={abrirPago}>
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
    </section>
  );
}
