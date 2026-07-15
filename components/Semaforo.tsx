import { PuntoSemaforo } from "@/components/estados";
import type { Cuota } from "@/lib/periodos";

// 1.8 · Semáforo público: los 10 dptos en verde (pagó) / ámbar (parcial) / rojo (pendiente).
export function Semaforo({ cuotas }: { cuotas: Cuota[] }) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {cuotas.map((c) => (
          <div
            key={c.dpto_id}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"
          >
            <PuntoSemaforo estado={c.estado} />
            <span className="font-semibold text-slate-800">Dpto {c.dpto_id}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full bg-semaforo-verde" /> Pagado
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full bg-semaforo-ambar" /> Parcial
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full bg-semaforo-rojo" /> Pendiente
        </span>
      </div>
    </div>
  );
}
