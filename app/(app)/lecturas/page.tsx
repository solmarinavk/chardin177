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
import { BUCKET_MEDIDORES, urlFirmada } from "@/lib/storage";
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

  // ¿Hay mes previo para este dpto? Entonces la lectura anterior se trae sola y
  // queda de solo lectura (matriz, regla 1). El primer mes es la excepción.
  const hayHistorial = anteriores.size > 0;

  const filas: FilaLectura[] = await Promise.all(
    departamentos.map(async (d) => {
      const existente = porDpto.get(d.id);
      const bloqueada = anteriores.has(d.id);
      return {
        dpto: d.id,
        anterior: bloqueada
          ? (anteriores.get(d.id) as number)
          : (existente?.lectura_anterior ?? 0),
        actual: existente?.lectura_actual ?? null,
        promedio: promedios.get(d.id) ?? null,
        bloqueada,
        fotoUrl: existente?.foto_url
          ? await urlFirmada(BUCKET_MEDIDORES, existente.foto_url)
          : null,
      };
    }),
  );

  return (
    <main className="flex flex-col gap-4">
      <div className="animar-aparecer">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Lecturas de agua
        </h1>
        <p className="mt-1 text-slate-600">
          {etiquetaPeriodo(borrador.anio, borrador.mes)} ·{" "}
          {hayHistorial
            ? "Solo escribe la lectura ACTUAL de cada medidor. La anterior se trae sola del mes pasado."
            : "Primer mes: escribe la lectura anterior (la que marca hoy el medidor como punto de partida) y la actual."}
        </p>
      </div>

      <FormLecturas accion={guardarLecturas} periodoId={borrador.id} filas={filas} />
    </main>
  );
}
