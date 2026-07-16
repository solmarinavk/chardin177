import type { Metadata } from "next";
import Link from "next/link";
import { requireRol } from "@/lib/roles";
import { listPeriodos } from "@/lib/periodos";
import { getConciliacionPreview, getConciliaciones } from "@/lib/caja";
import { etiquetaPeriodo } from "@/lib/fechas";
import { formatoPEN } from "@/lib/centimos";
import { IconoAlerta } from "@/components/iconos";
import { FormAplicarConciliacion } from "@/components/forms/conciliacion";
import { aplicarConciliacion } from "./acciones";

export const metadata: Metadata = { title: "Conciliación de agua" };

export default async function ConciliacionPage({
  searchParams,
}: {
  searchParams: { desde?: string; hasta?: string; facturado?: string };
}) {
  await requireRol(["tesoreria", "admin"]);

  const [periodos, historial] = await Promise.all([
    listPeriodos(),
    getConciliaciones(),
  ]);
  const cerradosOEmitidos = periodos.filter(
    (p) => p.estado === "emitido" || p.estado === "cerrado",
  );
  const etiquetaDe = new Map(
    periodos.map((p) => [p.id, etiquetaPeriodo(p.anio, p.mes)]),
  );

  const desdeId = searchParams.desde ? Number(searchParams.desde) : null;
  const hastaId = searchParams.hasta ? Number(searchParams.hasta) : null;
  const facturadoCent =
    searchParams.facturado && Number.isFinite(Number(searchParams.facturado))
      ? Math.round(Number(searchParams.facturado) * 100)
      : null;

  const preview =
    desdeId && hastaId && facturadoCent !== null
      ? await getConciliacionPreview(desdeId, hastaId, facturadoCent)
      : null;

  return (
    <main className="flex flex-col gap-5">
      <div className="animar-aparecer">
        <Link href="/caja" className="text-sm font-semibold text-slate-500 hover:text-slate-900">
          ← Caja
        </Link>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
          Conciliación de agua
        </h1>
        <p className="mt-1 text-slate-600">
          Compara lo cobrado por agua en un rango de meses contra el total real de
          Sedapal (medidor general) y reparte la diferencia por consumo.
        </p>
      </div>

      {cerradosOEmitidos.length === 0 ? (
        <section className="card animar-aparecer p-6 text-center text-slate-600">
          Aún no hay meses emitidos para conciliar.
        </section>
      ) : (
        <section className="card animar-aparecer p-5">
          <form method="get" className="flex flex-col gap-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="etiqueta" htmlFor="desde">
                  Desde
                </label>
                <select id="desde" name="desde" defaultValue={desdeId ?? ""} className="campo" required>
                  <option value="" disabled>
                    Mes…
                  </option>
                  {cerradosOEmitidos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {etiquetaPeriodo(p.anio, p.mes)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="etiqueta" htmlFor="hasta">
                  Hasta
                </label>
                <select id="hasta" name="hasta" defaultValue={hastaId ?? ""} className="campo" required>
                  <option value="" disabled>
                    Mes…
                  </option>
                  {cerradosOEmitidos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {etiquetaPeriodo(p.anio, p.mes)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="etiqueta" htmlFor="facturado">
                Total real facturado por Sedapal en el rango (S/)
              </label>
              <input
                id="facturado"
                name="facturado"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                required
                defaultValue={
                  facturadoCent !== null ? (facturadoCent / 100).toFixed(2) : ""
                }
                className="campo num"
                placeholder="Ej. 1450.00"
              />
            </div>
            <button type="submit" className="btn-secondary">
              Calcular cuadre
            </button>
          </form>
        </section>
      )}

      {preview && (
        <section className="card animar-aparecer p-5">
          <h2 className="titulo-seccion mb-3">Vista previa del cuadre</h2>
          <dl className="num flex flex-col gap-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">Cobrado (Σ recibos de agua)</dt>
              <dd className="font-semibold">{formatoPEN(preview.cobradoCent)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Facturado real (Sedapal)</dt>
              <dd className="font-semibold">{formatoPEN(preview.facturadoRealCent)}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1">
              <dt className="font-bold text-slate-900">Diferencia a repartir</dt>
              <dd
                className={`font-black ${
                  preview.diferenciaCent >= 0 ? "text-red-700" : "text-emerald-700"
                }`}
              >
                {formatoPEN(preview.diferenciaCent)}
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-slate-500">
            {preview.diferenciaCent >= 0
              ? "Positivo = faltó cobrar; se agrega como cargo a cada dpto por su consumo."
              : "Negativo = se cobró de más; se devuelve a cada dpto por su consumo."}{" "}
            Rango: {etiquetaPeriodo(preview.periodos[0]!.anio, preview.periodos[0]!.mes)} –{" "}
            {etiquetaPeriodo(
              preview.periodos[preview.periodos.length - 1]!.anio,
              preview.periodos[preview.periodos.length - 1]!.mes,
            )}
            .
          </p>

          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
            <table className="num w-full min-w-[360px] text-right text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Dpto</th>
                  <th className="px-3 py-2">Consumo</th>
                  <th className="px-3 py-2">Ajuste</th>
                </tr>
              </thead>
              <tbody>
                {preview.porDpto.map((x) => (
                  <tr key={x.dpto} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-left font-semibold">{x.dpto}</td>
                    <td className="px-3 py-2 text-slate-600">{x.consumoM3} m³</td>
                    <td
                      className={`px-3 py-2 font-bold ${
                        x.ajusteCent >= 0 ? "text-red-700" : "text-emerald-700"
                      }`}
                    >
                      {formatoPEN(x.ajusteCent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <FormAplicarConciliacion
              accion={aplicarConciliacion}
              desdeId={desdeId!}
              hastaId={hastaId!}
              facturadoCent={preview.facturadoRealCent}
            />
            <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-500">
              <IconoAlerta className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Los ajustes se agregan al periodo en borrador; luego recalcula sus
              cuotas para incluirlos.
            </p>
          </div>
        </section>
      )}

      {historial.length > 0 && (
        <section className="card animar-aparecer p-5">
          <h2 className="titulo-seccion mb-3">Conciliaciones anteriores</h2>
          <ul className="num flex flex-col gap-2 text-sm">
            {historial.map((c) => (
              <li key={c.id} className="flex items-baseline justify-between gap-2">
                <span className="text-slate-600">
                  {etiquetaDe.get(c.periodo_desde) ?? c.periodo_desde} –{" "}
                  {etiquetaDe.get(c.periodo_hasta) ?? c.periodo_hasta}
                </span>
                <span className="text-slate-800">
                  cobrado {formatoPEN(c.cobrado_cent)} · real{" "}
                  {formatoPEN(c.facturado_real_cent)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
