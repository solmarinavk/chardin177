import type { EstadoCuota, EstadoPeriodo } from "@/lib/database.types";

const CUOTA: Record<EstadoCuota, { texto: string; clase: string }> = {
  pagado: { texto: "Pagado", clase: "bg-green-100 text-green-800" },
  parcial: { texto: "Parcial", clase: "bg-amber-100 text-amber-800" },
  pendiente: { texto: "Pendiente", clase: "bg-red-100 text-red-800" },
};

const PERIODO: Record<EstadoPeriodo, { texto: string; clase: string }> = {
  borrador: { texto: "Borrador", clase: "bg-slate-200 text-slate-700" },
  emitido: { texto: "Emitido", clase: "bg-blue-100 text-blue-800" },
  cerrado: { texto: "Cerrado", clase: "bg-slate-800 text-white" },
};

export function EstadoCuotaBadge({ estado }: { estado: EstadoCuota }) {
  const e = CUOTA[estado];
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${e.clase}`}>
      {e.texto}
    </span>
  );
}

export function EstadoPeriodoBadge({ estado }: { estado: EstadoPeriodo }) {
  const e = PERIODO[estado];
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${e.clase}`}>
      {e.texto}
    </span>
  );
}

// Punto del semáforo (verde/ámbar/rojo) según estado de la cuota.
export function PuntoSemaforo({ estado }: { estado: EstadoCuota }) {
  const color =
    estado === "pagado"
      ? "bg-semaforo-verde"
      : estado === "parcial"
        ? "bg-semaforo-ambar"
        : "bg-semaforo-rojo";
  return (
    <span
      className={`inline-block h-4 w-4 rounded-full ${color}`}
      aria-label={estado}
      title={estado}
    />
  );
}
