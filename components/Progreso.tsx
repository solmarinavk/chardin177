// Barra de progreso accesible. `tono` verde para dinero/avance positivo,
// oscuro para pasos neutros.
export function Progreso({
  valor,
  max,
  tono = "verde",
  etiqueta,
}: {
  valor: number;
  max: number;
  tono?: "verde" | "oscuro";
  etiqueta?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((valor / max) * 100)) : 0;
  const color = tono === "verde" ? "bg-emerald-600" : "bg-slate-900";
  return (
    <div
      role="progressbar"
      aria-valuenow={valor}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={etiqueta}
      className="h-3 w-full overflow-hidden rounded-full bg-slate-200/80"
    >
      <div
        className={`h-full rounded-full ${color} transition-all duration-500`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
