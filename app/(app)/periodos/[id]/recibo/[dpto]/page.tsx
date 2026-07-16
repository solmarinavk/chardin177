import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRol } from "@/lib/roles";
import { getPeriodo, getCuotas, getPagadoPorCuota } from "@/lib/periodos";
import { etiquetaPeriodo } from "@/lib/fechas";
import { formatoPEN } from "@/lib/centimos";
import { lineasRecibo, textoReciboWhatsApp } from "@/lib/recibo";
import { EstadoCuotaBadge } from "@/components/estados";
import { CompartirRecibo } from "@/components/CompartirRecibo";

export const metadata: Metadata = { title: "Recibo" };

export default async function ReciboPage({
  params,
}: {
  params: { id: string; dpto: string };
}) {
  await requireRol(["tesoreria", "admin", "residente"]);
  const id = Number(params.id);
  const dptoId = Number(params.dpto);
  if (!Number.isInteger(id) || !Number.isInteger(dptoId)) notFound();

  const periodo = await getPeriodo(id);
  if (!periodo || periodo.estado === "borrador") notFound();

  const [cuotas, pagado] = await Promise.all([
    getCuotas(id),
    getPagadoPorCuota(id),
  ]);
  const cuota = cuotas.find((c) => c.dpto_id === dptoId);
  if (!cuota) notFound();

  const pagadoCent = pagado.get(cuota.id) ?? 0;
  const saldo = cuota.total_cent - pagadoCent;
  const lineas = lineasRecibo(cuota);
  const texto = textoReciboWhatsApp(periodo.anio, periodo.mes, cuota, pagadoCent);

  return (
    <main className="flex flex-col gap-5">
      <Link
        href={`/periodos/${id}`}
        className="text-sm font-semibold text-slate-500 hover:text-slate-900 print:hidden"
      >
        ← {etiquetaPeriodo(periodo.anio, periodo.mes)}
      </Link>

      <section className="card p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-lg font-black tracking-tight text-slate-900">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-xs font-black text-white">
                177
              </span>
              Chardin 177
            </p>
            <p className="mt-1 text-slate-600">
              Recibo · {etiquetaPeriodo(periodo.anio, periodo.mes)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-slate-900">Dpto {cuota.dpto_id}</p>
            <EstadoCuotaBadge estado={cuota.estado} />
          </div>
        </div>

        <table className="num mt-5 w-full text-sm">
          <tbody>
            {lineas.map((l) => (
              <tr key={l.etiqueta} className="border-b border-slate-100">
                <td className="py-2 text-slate-600">{l.etiqueta}</td>
                <td className="py-2 text-right font-medium text-slate-900">
                  {formatoPEN(l.cent)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="py-3 text-base font-bold text-slate-900">Total del mes</td>
              <td className="py-3 text-right text-xl font-black text-slate-900">
                {formatoPEN(cuota.total_cent)}
              </td>
            </tr>
          </tfoot>
        </table>

        {saldo > 0 ? (
          <div className="rounded-xl bg-red-50 px-4 py-3 num">
            <p className="text-sm text-red-700">
              Pagado: <span className="font-semibold">{formatoPEN(pagadoCent)}</span>
            </p>
            <p className="font-bold text-red-800">
              Pendiente por pagar: {formatoPEN(saldo)}
            </p>
          </div>
        ) : (
          <p className="rounded-xl bg-emerald-50 px-4 py-3 font-semibold text-emerald-800">
            Pagado ✅
          </p>
        )}
      </section>

      <CompartirRecibo texto={texto} />
    </main>
  );
}
