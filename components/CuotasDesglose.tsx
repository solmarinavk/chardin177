import { formatoPEN } from "@/lib/centimos";
import { EstadoCuotaBadge } from "@/components/estados";
import { IconoCheck, IconoAlerta } from "@/components/iconos";
import type { Cuota, ReciboServicio } from "@/lib/periodos";

type ColumnaNum = Exclude<
  keyof Cuota,
  "id" | "periodo_id" | "dpto_id" | "estado"
>;

const COLUMNAS: Array<{ campo: ColumnaNum; titulo: string }> = [
  { campo: "agua_consumo_cent", titulo: "Agua cons." },
  { campo: "agua_comun_cent", titulo: "Agua común" },
  { campo: "luz_cent", titulo: "Luz" },
  { campo: "vigilancia_cent", titulo: "Vigilancia" },
  { campo: "manto_cent", titulo: "Manto." },
  { campo: "materiales_cent", titulo: "Mater." },
  { campo: "extra_cent", titulo: "Extra" },
  { campo: "ajuste_cent", titulo: "Ajuste" },
];

function suma(cuotas: Cuota[], campo: ColumnaNum): number {
  return cuotas.reduce((acc, c) => acc + (c[campo] as number), 0);
}

function Cuadre({ ok, texto }: { ok: boolean; texto: string }) {
  return (
    <span
      className={`chip ${ok ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}
    >
      {ok ? <IconoCheck className="h-3.5 w-3.5" /> : <IconoAlerta className="h-3.5 w-3.5" />}
      {texto}
    </span>
  );
}

// Tabla de desglose de las 10 cuotas + totales por columna + cuadre de
// invariantes contra los recibos. Primera columna fija para scroll en celular.
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

  return (
    <div className="flex flex-col gap-3">
      {(recibos.agua || recibos.luz) && (
        <div className="flex flex-wrap gap-2">
          {recibos.agua && (
            <Cuadre
              ok={sumAgua === recibos.agua.monto_cent}
              texto={`Agua ${formatoPEN(sumAgua)} ${
                sumAgua === recibos.agua.monto_cent ? "cuadra con el recibo" : "NO cuadra"
              }`}
            />
          )}
          {recibos.luz && (
            <Cuadre
              ok={sumLuz === recibos.luz.monto_cent}
              texto={`Luz ${formatoPEN(sumLuz)} ${
                sumLuz === recibos.luz.monto_cent ? "cuadra con el recibo" : "NO cuadra"
              }`}
            />
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="num w-full min-w-[720px] text-right text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="sticky left-0 z-10 bg-slate-100 px-3 py-2.5 text-left">
                Dpto
              </th>
              {COLUMNAS.map((col) => (
                <th key={col.campo} className="px-3 py-2.5 font-semibold">
                  {col.titulo}
                </th>
              ))}
              <th className="px-3 py-2.5 font-bold text-slate-700">Total</th>
              {mostrarEstado && <th className="px-3 py-2.5 text-center">Estado</th>}
            </tr>
          </thead>
          <tbody>
            {cuotas.map((c) => (
              <tr
                key={c.dpto_id}
                className="border-t border-slate-100 bg-white even:bg-slate-50/60"
              >
                <td className="sticky left-0 z-10 bg-inherit px-3 py-2 text-left font-bold text-slate-900">
                  {c.dpto_id}
                  <span className="ml-1.5 text-xs font-normal text-slate-400">
                    {c.m3_variacion} m³
                  </span>
                </td>
                {COLUMNAS.map((col) => (
                  <td key={col.campo} className="px-3 py-2 text-slate-600">
                    {formatoPEN(c[col.campo] as number)}
                  </td>
                ))}
                <td className="px-3 py-2 font-bold text-slate-900">
                  {formatoPEN(c.total_cent)}
                </td>
                {mostrarEstado && (
                  <td className="px-3 py-2 text-center">
                    <EstadoCuotaBadge estado={c.estado} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-slate-300 bg-slate-50 font-bold text-slate-900">
            <tr>
              <td className="sticky left-0 z-10 bg-slate-50 px-3 py-2.5 text-left">
                Total
              </td>
              {COLUMNAS.map((col) => (
                <td key={col.campo} className="px-3 py-2.5">
                  {formatoPEN(suma(cuotas, col.campo))}
                </td>
              ))}
              <td className="px-3 py-2.5 text-base">{formatoPEN(sumTotal)}</td>
              {mostrarEstado && <td></td>}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
