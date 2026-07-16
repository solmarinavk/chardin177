import { describe, it, expect } from "vitest";
import { textoResumenMes } from "@/lib/recibo";
import type { Cuota } from "@/lib/periodos";

function cuota(
  id: number,
  dpto: number,
  total: number,
  estado: Cuota["estado"],
): Cuota {
  return {
    id,
    periodo_id: 1,
    dpto_id: dpto,
    m3_variacion: 0,
    agua_consumo_cent: 0,
    agua_comun_cent: 0,
    luz_cent: 0,
    vigilancia_cent: 0,
    manto_cent: 0,
    materiales_cent: 0,
    extra_cent: 0,
    ajuste_cent: 0,
    total_cent: total,
    estado,
  } as Cuota;
}

const CUOTAS = [
  cuota(3, 301, 44370, "parcial"),
  cuota(1, 101, 43216, "pendiente"),
  cuota(2, 201, 45813, "pagado"),
];
const PAGADO = new Map([
  [2, 45813],
  [3, 26622],
]);

describe("resumen del mes para WhatsApp", () => {
  const texto = textoResumenMes(2026, 7, CUOTAS, PAGADO);

  it("encabezado en negrita de WhatsApp con mes y año", () => {
    expect(texto).toContain("*CHARDIN 177 · Cuotas Julio 2026*");
  });

  it("una línea por dpto, ordenadas por número aunque lleguen desordenadas", () => {
    const i101 = texto.indexOf("Dpto 101");
    const i201 = texto.indexOf("Dpto 201");
    const i301 = texto.indexOf("Dpto 301");
    expect(i101).toBeGreaterThan(-1);
    expect(i101).toBeLessThan(i201);
    expect(i201).toBeLessThan(i301);
  });

  it("estados con su formato: pagado ✓, parcial con deuda, pendiente con total", () => {
    expect(texto).toContain("Dpto 201: S/ 458.13 — PAGADO ✓");
    expect(texto).toContain("Dpto 301: debe S/ 177.48 de S/ 443.70 — PARCIAL");
    expect(texto).toContain("Dpto 101: S/ 432.16 — PENDIENTE");
  });

  it("recaudado en negrita + conteo con emojis", () => {
    // 45813 + 26622 = 72435 de 133399
    expect(texto).toContain("*Recaudado: S/ 724.35 de S/ 1,333.99*");
    expect(texto).toContain("✅ 1 al día · 🟡 1 parcial · 🔴 1 pendiente");
  });

  it("termina invitando al enlace (el navegador lo agrega al compartir)", () => {
    expect(texto.trimEnd().endsWith("Consulta el detalle en:")).toBe(true);
  });

  it("con vence:true agrega la línea de vencimiento; sin ella no", () => {
    const conVence = textoResumenMes(2026, 7, CUOTAS, PAGADO, { vence: true });
    expect(conVence).toContain("Vence: fin de mes.");
    expect(texto).not.toContain("Vence:");
  });

  it("cuota pagada sin detalle de pagos cuenta como recaudada (sin deuda falsa)", () => {
    const t = textoResumenMes(2026, 7, [cuota(9, 102, 46968, "pagado")], new Map());
    expect(t).toContain("Dpto 102: S/ 469.68 — PAGADO ✓");
    expect(t).toContain("*Recaudado: S/ 469.68 de S/ 469.68*");
  });
});
