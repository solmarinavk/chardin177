import type { Metadata } from "next";
import Link from "next/link";
import { requireRol } from "@/lib/roles";
import {
  getBorrador,
  getDepartamentos,
  getLecturas,
  getLecturasAnteriores,
  getPromediosConsumo,
} from "@/lib/periodos";
import { etiquetaPeriodo } from "@/lib/fechas";
import { FormLecturas, type FilaLectura } from "@/components/forms/lecturas";
import { guardarLecturas } from "./acciones";

export const metadata: Metadata = { title: "Lecturas de agua" };

export default async function LecturasPage() {
  await requireRol(["porteria", "tesoreria", "admin"]);

  const borrador = await getBorrador();

  if (!borrador) {
    return (
      <main className="flex flex-col gap-4">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Lecturas de agua
        </h1>
        <section className="card animar-aparecer p-6 text-center">
          <p className="text-4xl" aria-hidden>
            💧
          </p>
          <h2 className="mt-2 text-lg font-bold text-slate-900">
            No hay un mes abierto
          </h2>
          <p className="mt-1 text-slate-600">
            Cuando tesorería o administración creen el periodo del mes en{" "}
            <Link href="/periodos" className="font-semibold text-slate-900 underline">
              Periodos
            </Link>
            , aquí aparecerán las 10 casillas para las lecturas.
          </p>
        </section>
      </main>
    );
  }

  const [departamentos, lecturas, anteriores, promedios] = await Promise.all([
    getDepartamentos(),
    getLecturas(borrador.id),
    getLecturasAnteriores(borrador.anio, borrador.mes),
    getPromediosConsumo(borrador.id),
  ]);

  const porDpto = new Map(lecturas.map((l) => [l.dpto_id, l]));

  const filas: FilaLectura[] = departamentos.map((d) => {
    const existente = porDpto.get(d.id);
    return {
      dpto: d.id,
      anterior: existente?.lectura_anterior ?? anteriores.get(d.id) ?? 0,
      actual: existente?.lectura_actual ?? null,
      promedio: promedios.get(d.id) ?? null,
    };
  });

  return (
    <main className="flex flex-col gap-4">
      <div className="animar-aparecer">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Lecturas de agua
        </h1>
        <p className="mt-1 text-slate-600">
          {etiquetaPeriodo(borrador.anio, borrador.mes)} · Copia el número que
          marca cada medidor. La lectura anterior ya está puesta.
        </p>
      </div>

      <FormLecturas accion={guardarLecturas} periodoId={borrador.id} filas={filas} />
    </main>
  );
}
