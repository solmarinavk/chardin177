import { describe, it, expect } from "vitest";
import { mapaEdificio, PISOS_EDIFICIO } from "@/lib/edificio";
import type { Cuota } from "@/lib/periodos";

function cuota(parcial: Partial<Cuota> & { id: number; dpto_id: number }): Cuota {
  return {
    periodo_id: 1,
    m3_variacion: 0,
    agua_consumo_cent: 0,
    agua_comun_cent: 0,
    luz_cent: 0,
    vigilancia_cent: 0,
    manto_cent: 0,
    materiales_cent: 0,
    extra_cent: 0,
    ajuste_cent: 0,
    total_cent: 45000,
    estado: "pendiente",
    ...parcial,
  } as Cuota;
}

describe("edificio visual (5.1): mapa de datos", () => {
  it("la fachada tiene 5 pisos con 2 dptos, piso 5 arriba y 1 abajo", () => {
    expect(PISOS_EDIFICIO).toHaveLength(5);
    expect(PISOS_EDIFICIO[0]).toEqual([501, 502]);
    expect(PISOS_EDIFICIO[4]).toEqual([101, 102]);
  });

  it("mapea estado y montos por dpto; sin cuota → estado null", () => {
    const cuotas = [
      cuota({ id: 1, dpto_id: 101, estado: "pagado", total_cent: 43216 }),
      cuota({ id: 2, dpto_id: 301, estado: "parcial", total_cent: 44370 }),
    ];
    const pagado = new Map([
      [1, 43216],
      [2, 26622],
    ]);
    const mapa = mapaEdificio(cuotas, pagado);
    expect(mapa).toHaveLength(10); // siempre los 10 dptos del edificio

    const d101 = mapa.find((d) => d.dpto === 101)!;
    expect(d101).toEqual({ dpto: 101, estado: "pagado", totalCent: 43216, pagadoCent: 43216 });

    const d301 = mapa.find((d) => d.dpto === 301)!;
    expect(d301.estado).toBe("parcial");
    expect(d301.pagadoCent).toBe(26622);

    const d502 = mapa.find((d) => d.dpto === 502)!;
    expect(d502.estado).toBeNull(); // sin cuota (mes en preparación)
    expect(d502.totalCent).toBeNull();
  });

  it("cuota pagada sin detalle de pagos → pagado = total (no muestra deuda falsa)", () => {
    const mapa = mapaEdificio(
      [cuota({ id: 9, dpto_id: 202, estado: "pagado", total_cent: 45813 })],
      new Map(),
    );
    expect(mapa.find((d) => d.dpto === 202)!.pagadoCent).toBe(45813);
  });
});
