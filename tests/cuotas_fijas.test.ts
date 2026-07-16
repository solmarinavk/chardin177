import { describe, it, expect } from "vitest";
import { cuotaFijaVigente, type CuotaFija } from "@/lib/cuotas_fijas";

function fija(id: number, vigente_desde: string): CuotaFija {
  return {
    id,
    vigente_desde,
    vigilancia_total_cent: 200000,
    manto_total_cent: 137610,
    materiales_dpto_cent: 2000,
    agua_comun_dpto_cent: 1500,
    notas: null,
  };
}

describe("cuotaFijaVigente (selección de la versión vigente)", () => {
  const versiones = [
    fija(1, "2024-01-01"),
    fija(2, "2026-06-01"),
    fija(3, "2026-09-01"), // futura respecto a julio
  ];

  it("toma la de mayor vigente_desde que ya rige a la fecha", () => {
    expect(cuotaFijaVigente(versiones, "2026-07-16")?.id).toBe(2);
  });

  it("ignora versiones con fecha futura", () => {
    expect(cuotaFijaVigente(versiones, "2026-05-31")?.id).toBe(1);
  });

  it("toma la futura una vez llegada su fecha", () => {
    expect(cuotaFijaVigente(versiones, "2026-09-01")?.id).toBe(3);
  });

  it("devuelve null si ninguna rige todavía", () => {
    expect(cuotaFijaVigente(versiones, "2023-12-31")).toBeNull();
  });

  it("con misma fecha de vigencia, prefiere el id mayor (la más nueva)", () => {
    const empate = [fija(5, "2026-06-01"), fija(9, "2026-06-01"), fija(2, "2026-06-01")];
    expect(cuotaFijaVigente(empate, "2026-07-01")?.id).toBe(9);
  });

  it("lista vacía → null", () => {
    expect(cuotaFijaVigente([], "2026-07-01")).toBeNull();
  });
});
