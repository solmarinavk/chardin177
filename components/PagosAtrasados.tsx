import Link from "next/link";
import type { PagoAtrasado } from "@/lib/flujo";
import { totalAtrasadoCent } from "@/lib/flujo";
import { etiquetaPeriodo, mesesDesde, textoAntiguedad } from "@/lib/fechas";
import { formatoPEN } from "@/lib/centimos";
import { IconoAlerta, IconoFlecha } from "@/components/iconos";

// 6.10 · Cuotas de meses ya cerrados que siguen sin pagar, cada una con su
// botón para registrar el pago. Vive en el inicio y en Caja, que es donde la
// tesorera lo va a buscar. No muestra nada si nadie debe.
export function PagosAtrasados({ atrasados }: { atrasados: PagoAtrasado[] }) {
  if (atrasados.length === 0) return null;
  const total = totalAtrasadoCent(atrasados);

  return (
    <section className="card animar-aparecer border-red-200 bg-red-50 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
          <IconoAlerta className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-red-900">
            Pagos atrasados de meses anteriores
          </h2>
          <p className="mt-1 text-sm text-red-800">
            Cuotas de meses ya cerrados que siguen sin pagar. Cuando el vecino
            pague, regístralo aquí: el dinero entra a la caja de este mes y su
            deuda se borra.
          </p>
        </div>
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {atrasados.map((a) => {
          const meses = mesesDesde(a.anio, a.mes);
          return (
            <li
              key={`${a.periodoId}-${a.dpto}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-3 ring-1 ring-red-200"
            >
              <div className="min-w-0">
                <p className="font-bold text-slate-900">Dpto {a.dpto}</p>
                <p className="text-xs text-slate-500">
                  {etiquetaPeriodo(a.anio, a.mes)}
                  {meses > 0 && ` · hace ${textoAntiguedad(meses)}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="num font-bold text-red-700">{formatoPEN(a.saldoCent)}</span>
                <Link
                  href={`/periodos/${a.periodoId}?pagar=${a.dpto}#dpto-${a.dpto}`}
                  className="btn-primary min-h-[44px] px-4 py-2 text-sm"
                >
                  Registrar pago
                  <IconoFlecha className="h-4 w-4" />
                </Link>
              </div>
            </li>
          );
        })}
      </ul>

      {atrasados.length > 1 && (
        <p className="num mt-3 text-right text-sm font-semibold text-red-900">
          Total atrasado: {formatoPEN(total)}
        </p>
      )}
    </section>
  );
}
