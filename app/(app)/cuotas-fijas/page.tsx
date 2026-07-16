import type { Metadata } from "next";
import Link from "next/link";
import { requireRol } from "@/lib/roles";
import { getCuotasFijas, cuotaFijaVigente } from "@/lib/cuotas_fijas";
import { formatoPEN } from "@/lib/centimos";
import { formatoFecha, hoyLima } from "@/lib/fechas";
import { FormCuotaFija } from "@/components/forms/cuota-fija";
import { guardarCuotaFija } from "./acciones";

export const metadata: Metadata = { title: "Cuotas fijas" };

// Parte fija de la cuota de cada dpto (sin agua por consumo ni luz, que varían).
function fijaPorDpto(c: {
  vigilancia_total_cent: number;
  manto_total_cent: number;
  materiales_dpto_cent: number;
  agua_comun_dpto_cent: number;
}): number {
  return (
    Math.round(c.vigilancia_total_cent / 10) +
    Math.round(c.manto_total_cent / 10) +
    c.materiales_dpto_cent +
    c.agua_comun_dpto_cent
  );
}

export default async function CuotasFijasPage() {
  await requireRol(["admin"]);

  const versiones = await getCuotasFijas();
  const vigente = cuotaFijaVigente(versiones, hoyLima());

  return (
    <main className="flex flex-col gap-5">
      <div className="animar-aparecer">
        <Link
          href="/administracion"
          className="text-sm font-semibold text-slate-500 hover:text-slate-900"
        >
          ← Administración
        </Link>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
          Cuotas fijas
        </h1>
        <p className="mt-1 text-slate-600">
          Los montos que no dependen del consumo: vigilancia y mantenimiento
          (totales del edificio, se dividen entre 10), más materiales y agua
          común por departamento.
        </p>
      </div>

      {/* Vigente hoy */}
      {vigente ? (
        <section className="card animar-aparecer p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="titulo-seccion">Vigente hoy</h2>
            <span className="num text-xs text-slate-500">
              desde {formatoFecha(vigente.vigente_desde)}
            </span>
          </div>
          <dl className="num mt-3 flex flex-col gap-1.5 text-sm">
            <Fila etiqueta="Vigilancia (total)" valor={vigente.vigilancia_total_cent} sufijo={`= ${formatoPEN(Math.round(vigente.vigilancia_total_cent / 10))}/dpto`} />
            <Fila etiqueta="Mantenimiento (total)" valor={vigente.manto_total_cent} sufijo={`= ${formatoPEN(Math.round(vigente.manto_total_cent / 10))}/dpto`} />
            <Fila etiqueta="Materiales (por dpto)" valor={vigente.materiales_dpto_cent} />
            <Fila etiqueta="Agua común (por dpto)" valor={vigente.agua_comun_dpto_cent} />
            <div className="mt-1 flex items-baseline justify-between border-t border-slate-200 pt-1.5">
              <dt className="font-bold text-slate-900">Parte fija por dpto</dt>
              <dd className="text-lg font-black text-slate-900">
                {formatoPEN(fijaPorDpto(vigente))}
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-slate-500">
            (A esto el motor le suma el agua por consumo y la luz de cada mes.)
          </p>
        </section>
      ) : (
        <section className="card animar-aparecer p-5 text-slate-600">
          Aún no hay una versión vigente. Crea la primera abajo.
        </section>
      )}

      {/* Nueva versión */}
      <section className="card animar-aparecer p-5">
        <h2 className="titulo-seccion mb-3">Cambiar las cuotas fijas</h2>
        <FormCuotaFija accion={guardarCuotaFija} actuales={vigente} hoy={hoyLima()} />
      </section>

      {/* Historial de versiones */}
      {versiones.length > 0 && (
        <section className="card animar-aparecer p-5">
          <h2 className="titulo-seccion mb-3">Historial de versiones</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="num w-full text-right text-xs">
              <thead className="bg-slate-100 uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-2 py-2 text-left">Desde</th>
                  <th className="px-2 py-2">Vigilancia</th>
                  <th className="px-2 py-2">Manto.</th>
                  <th className="px-2 py-2">Materiales</th>
                  <th className="px-2 py-2">Agua común</th>
                </tr>
              </thead>
              <tbody>
                {versiones.map((v) => (
                  <tr
                    key={v.id}
                    className={`border-t border-slate-100 ${
                      vigente && v.id === vigente.id ? "bg-emerald-50" : "bg-white"
                    }`}
                  >
                    <td className="whitespace-nowrap px-2 py-2 text-left font-semibold text-slate-900">
                      {formatoFecha(v.vigente_desde)}
                      {vigente && v.id === vigente.id && (
                        <span className="ml-1 text-emerald-700">•</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-slate-600">
                      {formatoPEN(v.vigilancia_total_cent)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-slate-600">
                      {formatoPEN(v.manto_total_cent)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-slate-600">
                      {formatoPEN(v.materiales_dpto_cent)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-slate-600">
                      {formatoPEN(v.agua_comun_dpto_cent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Cada cambio crea una versión nueva; las anteriores no se editan (así
            los meses viejos mantienen sus valores). El punto verde marca la vigente.
          </p>
        </section>
      )}
    </main>
  );
}

function Fila({
  etiqueta,
  valor,
  sufijo,
}: {
  etiqueta: string;
  valor: number;
  sufijo?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-slate-600">{etiqueta}</dt>
      <dd className="font-semibold text-slate-900">
        {formatoPEN(valor)}
        {sufijo && <span className="ml-1 font-normal text-slate-400">{sufijo}</span>}
      </dd>
    </div>
  );
}
