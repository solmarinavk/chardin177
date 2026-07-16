import type { Metadata } from "next";
import { requireRol } from "@/lib/roles";
import { listPeriodos, getDepartamentos } from "@/lib/periodos";
import { getCategorias } from "@/lib/caja";
import { etiquetaPeriodo } from "@/lib/fechas";
import { TIPOS_DATO } from "@/lib/exportar_datos";
import { IconoDescarga } from "@/components/iconos";

export const metadata: Metadata = { title: "Exportar a Excel" };

export default async function ExportarPage() {
  await requireRol(["tesoreria", "admin"]);

  const [periodos, departamentos, categorias] = await Promise.all([
    listPeriodos(),
    getDepartamentos(),
    getCategorias(),
  ]);

  if (periodos.length === 0) {
    return (
      <main className="flex flex-col gap-5">
        <h1 className="animar-aparecer text-2xl font-black tracking-tight text-slate-900">
          Exportar a Excel
        </h1>
        <section className="card animar-aparecer p-6 text-center">
          <p className="text-4xl" aria-hidden>
            📊
          </p>
          <h2 className="mt-2 text-lg font-bold text-slate-900">
            Aún no hay datos que exportar
          </h2>
          <p className="mt-1 text-slate-600">
            Cuando exista al menos un mes creado, aquí podrás descargarlo todo
            en Excel.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-5">
      <div className="animar-aparecer">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Exportar a Excel
        </h1>
        <p className="mt-1 text-slate-600">
          Elige qué datos y qué filtros. Se genera un archivo{" "}
          <span className="font-semibold">.xlsx</span> con una hoja por tipo de
          dato y los montos en soles.
        </p>
      </div>

      {/* Formulario GET: al enviar, el navegador descarga el archivo. */}
      <form
        action="/api/exportar"
        method="get"
        className="card animar-aparecer flex flex-col gap-5 p-5"
      >
        <fieldset>
          <legend className="titulo-seccion mb-2">¿Qué datos?</legend>
          <div className="flex flex-col gap-2">
            {TIPOS_DATO.map((t) => (
              <label
                key={t.clave}
                className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"
              >
                <input
                  type="checkbox"
                  name="datos"
                  value={t.clave}
                  defaultChecked
                  className="h-5 w-5 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                />
                <span className="text-sm font-medium text-slate-800">
                  {t.etiqueta}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="titulo-seccion mb-2">Rango de meses</legend>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">Desde</span>
              <select name="desde" className="campo" defaultValue="">
                <option value="">(el más antiguo)</option>
                {periodos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {etiquetaPeriodo(p.anio, p.mes)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">Hasta</span>
              <select name="hasta" className="campo" defaultValue="">
                <option value="">(el más reciente)</option>
                {periodos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {etiquetaPeriodo(p.anio, p.mes)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend className="titulo-seccion mb-2">Filtros opcionales</legend>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">Departamento</span>
              <select name="dpto" className="campo" defaultValue="">
                <option value="">Todos</option>
                {departamentos.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.id}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600">Categoría (egresos)</span>
              <select name="categoria" className="campo" defaultValue="">
                <option value="">Todas</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>

        <button type="submit" className="btn-primary w-full">
          <IconoDescarga className="h-4 w-4" />
          Descargar Excel
        </button>
      </form>
    </main>
  );
}
