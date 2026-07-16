import type { Metadata } from "next";
import Link from "next/link";
import { requireRol } from "@/lib/roles";
import { listPeriodos } from "@/lib/periodos";
import {
  getCategorias,
  getEgresos,
  getLibroCaja,
  getPeriodoAbierto,
  getCierres,
} from "@/lib/caja";
import { etiquetaPeriodo, formatoFecha, hoyLima } from "@/lib/fechas";
import { formatoPEN } from "@/lib/centimos";
import { BUCKET_COMPROBANTES, urlFirmada } from "@/lib/storage";
import { EstadoPeriodoBadge } from "@/components/estados";
import { IconoCheck, IconoFlecha, IconoReloj } from "@/components/iconos";
import {
  FormEgreso,
  FormMarcarEgreso,
  FormAnularEgreso,
} from "@/components/forms/egreso";
import { crearEgreso, marcarEgreso, anularEgreso } from "./acciones";

export const metadata: Metadata = { title: "Caja y egresos" };

export default async function CajaPage({
  searchParams,
}: {
  searchParams: { periodo?: string; categoria?: string };
}) {
  const perfil = await requireRol(["tesoreria", "admin"]);
  const gestiona = perfil.rol === "tesoreria" || perfil.rol === "admin";

  const [abierto, periodos, categorias, cierres] = await Promise.all([
    getPeriodoAbierto(),
    listPeriodos(),
    getCategorias(),
    getCierres(),
  ]);

  const libro = abierto ? await getLibroCaja(abierto) : null;

  // Filtros de egresos (por defecto: el mes abierto; "todos" = sin filtro).
  const filtroPeriodo =
    searchParams.periodo === "todos"
      ? null
      : searchParams.periodo
        ? Number(searchParams.periodo)
        : (abierto?.id ?? null);
  const filtroCategoria = searchParams.categoria
    ? Number(searchParams.categoria)
    : null;

  const egresos = await getEgresos({
    periodoId: Number.isInteger(filtroPeriodo) ? filtroPeriodo : null,
    categoriaId: Number.isInteger(filtroCategoria) ? filtroCategoria : null,
  });

  const nombreCategoria = new Map(categorias.map((c) => [c.id, c.nombre]));
  const etiquetaDePeriodo = new Map(
    periodos.map((p) => [p.id, etiquetaPeriodo(p.anio, p.mes)]),
  );

  // URLs firmadas de comprobantes
  const urls = new Map<number, string>();
  for (const e of egresos) {
    if (e.comprobante_url) {
      const url = await urlFirmada(BUCKET_COMPROBANTES, e.comprobante_url);
      if (url) urls.set(e.id, url);
    }
  }

  const periodoEgresoDestino =
    abierto && abierto.estado !== "cerrado" ? abierto : null;

  return (
    <main className="flex flex-col gap-5">
      <div className="animar-aparecer flex flex-col gap-2">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Caja y egresos
        </h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/provisiones"
            className="btn-secondary min-h-[40px] px-3 py-2 text-sm"
          >
            Provisiones
          </Link>
          {gestiona && (
            <Link
              href="/conciliacion"
              className="btn-secondary min-h-[40px] px-3 py-2 text-sm"
            >
              Conciliación de agua
            </Link>
          )}
        </div>
      </div>

      {/* ——— Libro de caja del mes abierto (2.2) ——— */}
      {libro ? (
        <section className="card animar-aparecer p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-slate-900">
              Caja de {etiquetaPeriodo(libro.periodo.anio, libro.periodo.mes)}
            </h2>
            <EstadoPeriodoBadge estado={libro.periodo.estado} />
          </div>

          <dl className="num mt-4 flex flex-col gap-2 text-sm">
            <div className="flex items-baseline justify-between">
              <dt className="text-slate-600">Saldo inicial</dt>
              <dd className="font-semibold text-slate-900">
                {formatoPEN(libro.saldoInicialCent)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between">
              <dt className="text-slate-600">+ Ingresos cobrados</dt>
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
            <div className="flex items-baseline justify-between border-t border-slate-200 pt-2">
              <dt className="font-bold text-slate-900">Saldo actual</dt>
              <dd className="text-xl font-black text-slate-900">
                {formatoPEN(libro.saldoActualCent)}
              </dd>
            </div>
            {libro.porPagarCent > 0 && (
              <div className="flex items-baseline justify-between">
                <dt className="text-slate-500">Cuentas por pagar (no descontadas)</dt>
                <dd className="font-medium text-amber-700">
                  {formatoPEN(libro.porPagarCent)}
                </dd>
              </div>
            )}
          </dl>

          {libro.saldoInicialPendiente && (
            <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
              El saldo inicial de este primer mes se fijará con la migración del
              histórico (Fase 4). Por ahora se muestra desde S/ 0.00; los meses
              siguientes lo arrastran automáticamente al cerrar.
            </p>
          )}

          {gestiona && libro.periodo.estado === "emitido" && (
            <Link
              href={`/periodos/${libro.periodo.id}#cerrar`}
              className="btn-secondary mt-4 min-h-[44px] px-4 py-2.5 text-sm"
            >
              Ir al cierre del mes
              <IconoFlecha className="h-4 w-4" />
            </Link>
          )}
        </section>
      ) : (
        <section className="card animar-aparecer p-6 text-center">
          <p className="text-4xl" aria-hidden>
            💼
          </p>
          <h2 className="mt-2 text-lg font-bold text-slate-900">
            No hay un mes abierto
          </h2>
          <p className="mt-1 text-slate-600">
            Crea el periodo del mes en{" "}
            <Link href="/periodos" className="font-semibold underline">
              Periodos
            </Link>{" "}
            para llevar la caja.
          </p>
        </section>
      )}

      {/* ——— Registrar egreso (2.1) ——— */}
      {gestiona && periodoEgresoDestino && (
        <section className="card animar-aparecer p-5">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2 font-bold text-slate-900">
              <IconoFlecha className="h-4 w-4 transition-transform group-open:rotate-90" />
              Registrar egreso en{" "}
              {etiquetaPeriodo(periodoEgresoDestino.anio, periodoEgresoDestino.mes)}
            </summary>
            <div className="mt-4">
              <FormEgreso
                accion={crearEgreso}
                periodoId={periodoEgresoDestino.id}
                categorias={categorias}
                fechaHoy={hoyLima()}
              />
            </div>
          </details>
        </section>
      )}

      {/* ——— Registrar mantenimiento / incidencia (3.6) ——— */}
      {gestiona && periodoEgresoDestino && (
        <section className="card animar-aparecer p-5">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2 font-bold text-slate-900">
              <IconoFlecha className="h-4 w-4 transition-transform group-open:rotate-90" />
              Registrar mantenimiento / incidencia
            </summary>
            <p className="mt-2 text-sm text-slate-600">
              El vecino avisa del problema (ascensor, filtración, etc.) por el
              WhatsApp del edificio y aquí se registra como egreso con su
              categoría. Entra a la caja del mes y se ve en el dashboard con su
              comprobante.
            </p>
            <div className="mt-3">
              <FormEgreso
                accion={crearEgreso}
                periodoId={periodoEgresoDestino.id}
                categorias={categorias}
                fechaHoy={hoyLima()}
                categoriaDefault={
                  categorias.find((c) => c.nombre === "Reparaciones")?.id
                }
                conceptoPlaceholder="Ej. Reparación de bomba de agua, cambio de foco…"
              />
            </div>
          </details>
        </section>
      )}

      {/* ——— Lista de egresos filtrable (2.1) ——— */}
      <section className="card animar-aparecer p-5">
        <h2 className="titulo-seccion mb-3">Egresos</h2>

        <form method="get" className="mb-4 flex gap-2">
          <div className="flex-1">
            <label className="etiqueta" htmlFor="filtro-periodo">
              Mes
            </label>
            <select
              id="filtro-periodo"
              name="periodo"
              defaultValue={filtroPeriodo === null ? "todos" : String(filtroPeriodo)}
              className="campo min-h-[44px] py-2"
            >
              <option value="todos">Todos</option>
              {periodos.map((p) => (
                <option key={p.id} value={p.id}>
                  {etiquetaPeriodo(p.anio, p.mes)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="etiqueta" htmlFor="filtro-categoria">
              Categoría
            </label>
            <select
              id="filtro-categoria"
              name="categoria"
              defaultValue={filtroCategoria === null ? "" : String(filtroCategoria)}
              className="campo min-h-[44px] py-2"
            >
              <option value="">Todas</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-secondary min-h-[44px] self-end px-4 py-2">
            Filtrar
          </button>
        </form>

        {egresos.length === 0 ? (
          <p className="text-slate-500">No hay egresos con este filtro.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {egresos.map((e) => (
              <li key={e.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{e.concepto}</p>
                    <p className="num mt-0.5 text-xs text-slate-500">
                      {formatoFecha(e.fecha)}
                      {e.categoria_id != null &&
                        ` · ${nombreCategoria.get(e.categoria_id) ?? ""}`}
                      {filtroPeriodo === null &&
                        ` · ${etiquetaDePeriodo.get(e.periodo_id) ?? ""}`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="num font-bold text-slate-900">
                      {formatoPEN(e.monto_cent)}
                    </p>
                    {e.pagado ? (
                      <span className="chip mt-1 bg-emerald-100 text-emerald-800">
                        <IconoCheck className="h-3 w-3" />
                        Pagado
                      </span>
                    ) : (
                      <span className="chip mt-1 bg-amber-100 text-amber-800">
                        <IconoReloj className="h-3 w-3" />
                        Por pagar
                      </span>
                    )}
                  </div>
                </div>
                {(urls.has(e.id) || gestiona) && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
                    {urls.has(e.id) && (
                      <a
                        href={urls.get(e.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-slate-500 underline underline-offset-2 hover:text-slate-900"
                      >
                        Ver comprobante
                      </a>
                    )}
                    {gestiona && (
                      <>
                        <FormMarcarEgreso
                          accion={marcarEgreso}
                          egresoId={e.id}
                          pagado={e.pagado}
                        />
                        <FormAnularEgreso
                          accion={anularEgreso}
                          egresoId={e.id}
                          descripcion={`${e.concepto} · ${formatoPEN(e.monto_cent)}`}
                        />
                      </>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ——— Historial de cierres ——— */}
      {cierres.length > 0 && (
        <section className="card animar-aparecer p-5">
          <h2 className="titulo-seccion mb-3">Meses cerrados</h2>
          <ul className="flex flex-col gap-2">
            {cierres.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/periodos/${p.id}`}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2.5 hover:bg-slate-50"
                >
                  <span className="font-semibold text-slate-900">
                    {etiquetaPeriodo(p.anio, p.mes)}
                  </span>
                  <span className="num text-sm text-slate-600">
                    {p.saldo_inicial_cent !== null && (
                      <>{formatoPEN(p.saldo_inicial_cent)} → </>
                    )}
                    <span className="font-bold text-slate-900">
                      {p.saldo_final_cent !== null
                        ? formatoPEN(p.saldo_final_cent)
                        : "—"}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
