import { formatoPEN } from "@/lib/centimos";
import type { Cuota } from "@/lib/periodos";
import { IconoCheck, IconoReloj, IconoAlerta } from "@/components/iconos";

function cuentas(cuotas: Cuota[]) {
  return {
    pagados: cuotas.filter((c) => c.estado === "pagado").length,
    parciales: cuotas.filter((c) => c.estado === "parcial").length,
    pendientes: cuotas.filter((c) => c.estado === "pendiente").length,
  };
}

const ESTILO = {
  pagado: {
    icono: IconoCheck,
    card: "border-emerald-200 bg-emerald-50",
    punto: "bg-emerald-600 text-white",
    texto: "text-emerald-800",
  },
  parcial: {
    icono: IconoReloj,
    card: "border-amber-200 bg-amber-50",
    punto: "bg-amber-500 text-white",
    texto: "text-amber-800",
  },
  pendiente: {
    icono: IconoAlerta,
    card: "border-red-200 bg-red-50",
    punto: "bg-red-600 text-white",
    texto: "text-red-800",
  },
} as const;

// 1.8 · Semáforo: los 10 dptos en verde (pagó) / ámbar (parcial) / rojo
// (pendiente), con montos si se pasa `pagadoPorCuota`. Con `conCobro` (vista
// tesorería del periodo), tocar un dpto con deuda salta a su formulario de
// pago ya precargado (5.4a).
export function Semaforo({
  cuotas,
  pagadoPorCuota,
  conCobro = false,
}: {
  cuotas: Cuota[];
  pagadoPorCuota?: Map<number, number>;
  conCobro?: boolean;
}) {
  const n = cuentas(cuotas);
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        <span className="chip bg-emerald-100 text-emerald-800">
          {n.pagados} al día
        </span>
        <span className="chip bg-amber-100 text-amber-800">
          {n.parciales} parcial{n.parciales === 1 ? "" : "es"}
        </span>
        <span className="chip bg-red-100 text-red-800">
          {n.pendientes} pendiente{n.pendientes === 1 ? "" : "s"}
        </span>
      </div>

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {cuotas.map((c) => {
          const e = ESTILO[c.estado];
          const Icono = e.icono;
          const pagado = pagadoPorCuota?.get(c.id);
          const cobrable = conCobro && c.estado !== "pagado";
          const contenido = (
            <>
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-slate-900">{c.dpto_id}</span>
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full ${e.punto}`}
                  title={c.estado}
                >
                  <Icono className="h-3.5 w-3.5" />
                </span>
              </div>
              {pagadoPorCuota && (
                <p className={`num mt-1 text-xs font-medium ${e.texto}`}>
                  {c.estado === "pagado"
                    ? formatoPEN(c.total_cent)
                    : `${formatoPEN(pagado ?? 0)} / ${formatoPEN(c.total_cent)}`}
                </p>
              )}
              {cobrable && (
                <p className="mt-1 text-[11px] font-semibold text-slate-500 underline underline-offset-2">
                  Registrar pago
                </p>
              )}
            </>
          );
          return (
            <li key={c.dpto_id}>
              {cobrable ? (
                <a
                  href={`?pagar=${c.dpto_id}#dpto-${c.dpto_id}`}
                  className={`block rounded-xl border p-3 transition hover:-translate-y-0.5 hover:shadow ${e.card}`}
                  aria-label={`Registrar pago del dpto ${c.dpto_id}`}
                >
                  {contenido}
                </a>
              ) : (
                <div className={`rounded-xl border p-3 ${e.card}`}>{contenido}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Versión compacta para el inicio: 10 puntos con el número del dpto.
export function SemaforoMini({ cuotas }: { cuotas: Cuota[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {cuotas.map((c) => {
        const color =
          c.estado === "pagado"
            ? "bg-emerald-600 text-white"
            : c.estado === "parcial"
              ? "bg-amber-500 text-white"
              : "bg-red-600 text-white";
        return (
          <li key={c.dpto_id}>
            <span
              className={`num flex h-9 w-11 items-center justify-center rounded-lg text-xs font-bold ${color}`}
              title={`Dpto ${c.dpto_id}: ${c.estado}`}
            >
              {c.dpto_id}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
