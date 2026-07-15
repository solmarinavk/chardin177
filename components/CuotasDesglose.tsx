import { formatoPEN } from "@/lib/centimos";
import { EstadoCuotaBadge } from "@/components/estados";
import type { Cuota, ReciboServicio } from "@/lib/periodos";

function suma(cuotas: Cuota[], campo: keyof Cuota): number {
  return cuotas.reduce((acc, c) => acc + (c[campo] as number), 0);
}

// Tabla de desglose de las 10 cuotas + fila de totales + cuadre de invariantes.
export function CuotasDesglose({
  cuotas,
  recibos,
  mostrarEstado = false,
}: {
  cuotas: Cuota[];
  recibos: { agua: ReciboServicio | null; luz: ReciboServicio | null };
  mostrarEstado?: boolean;
}) {
  const sumAgua = suma(cuotas, "agua_consumo_cent") + suma(cuotas, "agua_comun_cent");
  const sumLuz = suma(cuotas, "luz_cent");
  const sumTotal = suma(cuotas, "total_cent");
  const aguaOk = recibos.agua ? sumAgua === recibos.agua.monto_cent : null;
  const luzOk = recibos.luz ? sumLuz === recibos.luz.monto_cent : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[640px] text-right text-sm">
          <thead className="bg-slate-100 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">Dpto</th>
              <th className="px-3 py-2">Agua cons.</th>
              <th className="px-3 py-2">Agua común</th>
              <th className="px-3 py-2">Luz</th>
              <th className="px-3 py-2">Vigil.</th>
              <th className="px-3 py-2">Manto.</th>
              <th className="px-3 py-2">Mater.</th>
              <th className="px-3 py-2">Extra</th>
              <th className="px-3 py-2">Ajuste</th>
              <th className="px-3 py-2">Total</th>
              {mostrarEstado && <th className="px-3 py-2 text-center">Estado</th>}
            </tr>
          </thead>
          <tbody>
            {cuotas.map((c) => (
              <tr key={c.dpto_id} className="border-t border-slate-100">
                <td className="px-3 py-2 text-left font-semibold">{c.dpto_id}</td>
                <td className="px-3 py-2">{formatoPEN(c.agua_consumo_cent)}</td>
                <td className="px-3 py-2">{formatoPEN(c.agua_comun_cent)}</td>
                <td className="px-3 py-2">{formatoPEN(c.luz_cent)}</td>
                <td className="px-3 py-2">{formatoPEN(c.vigilancia_cent)}</td>
                <td className="px-3 py-2">{formatoPEN(c.manto_cent)}</td>
                <td className="px-3 py-2">{formatoPEN(c.materiales_cent)}</td>
                <td className="px-3 py-2">{formatoPEN(c.extra_cent)}</td>
                <td className="px-3 py-2">{formatoPEN(c.ajuste_cent)}</td>
                <td className="px-3 py-2 font-bold">{formatoPEN(c.total_cent)}</td>
                {mostrarEstado && (
                  <td className="px-3 py-2 text-center">
                    <EstadoCuotaBadge estado={c.estado} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-slate-300 bg-slate-50 font-bold">
            <tr>
              <td className="px-3 py-2 text-left">Total</td>
              <td className="px-3 py-2" colSpan={8}></td>
              <td className="px-3 py-2">{formatoPEN(sumTotal)}</td>
              {mostrarEstado && <td></td>}
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-col gap-1 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-slate-600">Σ Agua (consumo + común):</span>
          <span className="font-semibold">{formatoPEN(sumAgua)}</span>
          {aguaOk !== null &&
            (aguaOk ? (
              <span className="text-green-700">✓ cuadra con el recibo</span>
            ) : (
              <span className="text-red-700">✗ no cuadra con el recibo</span>
            ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-600">Σ Luz:</span>
          <span className="font-semibold">{formatoPEN(sumLuz)}</span>
          {luzOk !== null &&
            (luzOk ? (
              <span className="text-green-700">✓ cuadra con el recibo</span>
            ) : (
              <span className="text-red-700">✗ no cuadra con el recibo</span>
            ))}
        </div>
      </div>
    </div>
  );
}
