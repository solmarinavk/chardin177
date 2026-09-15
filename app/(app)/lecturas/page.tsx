import type { Metadata } from "next";
import Link from "next/link";
import { requireRol } from "@/lib/roles";
import {
  getBorrador,
  getDepartamentos,
  getLecturas,
  getLecturasAnteriores,
  getPromediosConsumo,
  getRecibos,
  getRecibosMesAnterior,
  type Periodo,
} from "@/lib/periodos";
import { etiquetaPeriodo } from "@/lib/fechas";
import { BUCKET_MEDIDORES, BUCKET_COMPROBANTES, urlFirmada } from "@/lib/storage";
import { FormLecturas, type FilaLectura } from "@/components/forms/lecturas";
import { FormRecibo } from "@/components/forms/recibo";
import { guardarLecturas, autoguardarLectura } from "./acciones";
import { guardarRecibo } from "../periodos/acciones";

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

      <FormLecturas accion={guardarLecturas} autoguardar={autoguardarLectura} periodoId={borrador.id} filas={filas} />

      <RecibosDelMes borrador={borrador} />
    </main>
  );
}

// 6.9 · Los recibos le llegan al portero: los sube aquí mismo (monto + foto o
// PDF), en la misma pantalla de las lecturas. Tesorería los ve en el periodo
// con el monto del mes pasado de referencia, y sigue siendo quien calcula y
// emite. Sólo se puede sobre el mes en preparación.
async function RecibosDelMes({ borrador }: { borrador: Periodo }) {
  const [recibos, anteriores] = await Promise.all([
    getRecibos(borrador.id),
    getRecibosMesAnterior(borrador),
  ]);
  const fotoAgua = recibos.agua?.foto_url
    ? await urlFirmada(BUCKET_COMPROBANTES, recibos.agua.foto_url)
    : null;
  const fotoLuz = recibos.luz?.foto_url
    ? await urlFirmada(BUCKET_COMPROBANTES, recibos.luz.foto_url)
    : null;
  const cargados = (recibos.agua ? 1 : 0) + (recibos.luz ? 1 : 0);

  return (
    <section id="recibos" className="card animar-aparecer scroll-mt-24 p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-900">Recibos del mes</h2>
        <span
          className={`chip ${
            cargados === 2 ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
          }`}
        >
          {cargados} de 2
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-600">
        Cuando llegue el recibo de agua o el de luz, escribe el <strong>monto total</strong>{" "}
        y sube la foto o el PDF. Con eso tesorería calcula las cuotas del mes.
      </p>
      <div className="mt-4 flex flex-col gap-4">
        <FormRecibo
          accion={guardarRecibo}
          periodoId={borrador.id}
          tipo="agua"
          montoActualCent={recibos.agua?.monto_cent ?? null}
          montoAnteriorCent={anteriores.agua?.monto_cent ?? null}
          fotoUrl={fotoAgua}
        />
        <FormRecibo
          accion={guardarRecibo}
          periodoId={borrador.id}
          tipo="luz"
          montoActualCent={recibos.luz?.monto_cent ?? null}
          montoAnteriorCent={anteriores.luz?.monto_cent ?? null}
          fotoUrl={fotoLuz}
        />
      </div>
    </section>
  );
}
