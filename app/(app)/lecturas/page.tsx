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

export default async function LecturasPage() {
  await requireRol(["porteria", "tesoreria", "admin"]);

  const borrador = await getBorrador();

  if (!borrador) {
    return (
      <main className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Lecturas de agua</h1>
        <p className="text-slate-600">
          No hay un periodo en borrador. Pídele a tesorería o administración que
          cree el periodo del mes en la sección{" "}
          <Link href="/periodos" className="font-semibold text-blue-700 underline">
            Periodos
          </Link>
          .
        </p>
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
    <main className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Lecturas de agua</h1>
        <p className="mt-1 text-slate-600">
          Periodo{" "}
          <span className="font-semibold">
            {etiquetaPeriodo(borrador.anio, borrador.mes)}
          </span>
          . Ingresa la lectura actual de cada medidor.
        </p>
      </div>

      <FormLecturas accion={guardarLecturas} periodoId={borrador.id} filas={filas} />
    </main>
  );
}
