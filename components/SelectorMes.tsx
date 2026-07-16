"use client";

import { useRouter } from "next/navigation";

// 5.4e · Selector de mes en la página pública: permite ver el edificio y los
// pagos de meses anteriores, no solo el actual.
export function SelectorMes({
  opciones,
  actual,
}: {
  opciones: { id: number; etiqueta: string }[];
  actual: number;
}) {
  const router = useRouter();
  return (
    <select
      value={actual}
      onChange={(e) => router.push(`/transparencia?mes=${e.target.value}`, { scroll: false })}
      className="campo min-h-[40px] w-auto px-3 py-1.5 text-sm font-semibold"
      aria-label="Elegir el mes a consultar"
    >
      {opciones.map((o) => (
        <option key={o.id} value={o.id}>
          {o.etiqueta}
        </option>
      ))}
    </select>
  );
}
