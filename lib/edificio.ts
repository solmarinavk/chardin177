import type { Cuota } from "@/lib/periodos";

// Datos que el edificio visual (components/Edificio.tsx) necesita por dpto.
// Vive aquí (módulo de servidor) para poder mapearse en server components y
// probarse sin renderizar SVG.

export type DptoEdificio = {
  dpto: number;
  estado: "pagado" | "parcial" | "pendiente" | null; // null = sin cuota (mes en preparación)
  totalCent: number | null;
  pagadoCent: number;
};

// Piso 5 arriba, piso 1 abajo (como se ve el edificio desde la calle).
export const PISOS_EDIFICIO: [number, number][] = [
  [501, 502],
  [401, 402],
  [301, 302],
  [201, 202],
  [101, 102],
];

export function mapaEdificio(
  cuotas: Cuota[],
  pagadoPorCuota: Map<number, number>,
): DptoEdificio[] {
  const porDpto = new Map(cuotas.map((c) => [c.dpto_id, c]));
  return PISOS_EDIFICIO.flat().map((dpto) => {
    const c = porDpto.get(dpto);
    if (!c) return { dpto, estado: null, totalCent: null, pagadoCent: 0 };
    return {
      dpto,
      estado: c.estado,
      totalCent: c.total_cent,
      // Si la cuota está pagada y no vino el detalle de pagos, el pagado es el total.
      pagadoCent:
        pagadoPorCuota.get(c.id) ?? (c.estado === "pagado" ? c.total_cent : 0),
    };
  });
}
