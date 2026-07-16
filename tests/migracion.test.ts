import { describe, it, expect } from "vitest";
import {
  validarMigracion,
  generarSqlMigracion,
  type PlanMigracion,
} from "@/lib/migracion";

const planOk: PlanMigracion = {
  meses: [
    { anio: 2024, mes: 2, saldo_inicial_cent: 100000, saldo_final_cent: 105000 },
    { anio: 2024, mes: 3, saldo_inicial_cent: 105000, saldo_final_cent: 110500 },
  ],
  cuotas: [
    { anio: 2024, mes: 2, dpto: 101, total_cent: 43216 },
    { anio: 2024, mes: 2, dpto: 102, total_cent: 46968 },
    { anio: 2024, mes: 3, dpto: 101, total_cent: 44000 },
  ],
};

describe("migración histórica (4.1)", () => {
  it("valida un plan correcto y reporta el saldo de empalme", () => {
    const v = validarMigracion(planOk);
    expect(v.ok).toBe(true);
    expect(v.errores).toEqual([]);
    expect(v.saldoFinalUltimoCent).toBe(110500); // el que empalma con lo operativo
    expect(v.ultimoMes).toEqual({ anio: 2024, mes: 3 });
    expect(v.totalMeses).toBe(2);
    expect(v.totalCuotas).toBe(3);
  });

  it("ABORTA si la cadena de saldos tiene un salto (empalme roto)", () => {
    const roto: PlanMigracion = {
      meses: [
        { anio: 2024, mes: 2, saldo_inicial_cent: 100000, saldo_final_cent: 105000 },
        { anio: 2024, mes: 3, saldo_inicial_cent: 999999, saldo_final_cent: 110500 },
      ],
      cuotas: [],
    };
    const v = validarMigracion(roto);
    expect(v.ok).toBe(false);
    expect(v.errores.join(" ")).toMatch(/salto de saldo/i);
  });

  it("rechaza montos que no son céntimos enteros (nada de floats)", () => {
    const conFloat: PlanMigracion = {
      meses: [{ anio: 2024, mes: 2, saldo_inicial_cent: 100000, saldo_final_cent: 105000.5 }],
      cuotas: [{ anio: 2024, mes: 2, dpto: 101, total_cent: 43216.7 }],
    };
    const v = validarMigracion(conFloat);
    expect(v.ok).toBe(false);
    expect(v.errores.length).toBeGreaterThanOrEqual(2);
  });

  it("advierte (sin bloquear) si un mes no tiene 10 dptos", () => {
    const v = validarMigracion(planOk); // 2 y 1 dptos
    expect(v.ok).toBe(true);
    expect(v.advertencias.join(" ")).toMatch(/dptos/i);
  });

  it("genera SQL transaccional con periodos cerrados, cuotas, pagos y chequeo de empalme", () => {
    const sql = generarSqlMigracion(planOk);
    expect(sql).toContain("begin;");
    expect(sql).toContain("commit;");
    expect(sql).toContain("insert into periodos");
    expect(sql).toContain("'cerrado'");
    expect(sql).toContain("insert into cuotas");
    expect(sql).toContain("insert into pagos");
    // el chequeo de empalme usa el saldo final del último mes
    expect(sql).toContain("110500");
    expect(sql).toMatch(/raise exception 'Empalme roto/);
    // un valor de cuota concreto aparece
    expect(sql).toContain("43216");
    // periodos con saldos arrastrados
    expect(sql).toContain("(2024, 2, 'cerrado', 100000, 105000");
  });

  it("acepta meses sin saldo de caja (null) sin romper la cadena", () => {
    const plan: PlanMigracion = {
      meses: [
        { anio: 2024, mes: 2, saldo_inicial_cent: null, saldo_final_cent: null },
        { anio: 2025, mes: 7, saldo_inicial_cent: 300000, saldo_final_cent: 305000 },
        { anio: 2025, mes: 8, saldo_inicial_cent: 305000, saldo_final_cent: 310000 },
      ],
      cuotas: [],
    };
    const v = validarMigracion(plan);
    expect(v.ok).toBe(true);
    expect(v.saldoFinalUltimoCent).toBe(310000);
    expect(generarSqlMigracion(plan)).toContain("(2024, 2, 'cerrado', null, null");
  });

  it("con empalmarCon: UPDATE al periodo operativo (no lo inserta ni lo duplica)", () => {
    const sql = generarSqlMigracion(planOk, { empalmarCon: { anio: 2026, mes: 7 } });
    expect(sql).toContain(
      "update periodos set saldo_inicial_cent = 110500 where anio = 2026 and mes = 7",
    );
    expect(sql).toMatch(/no se puede empalmar/); // aborta si julio no existe
    expect(sql).toMatch(/Empalme roto: 2026-7 ya tiene saldo inicial/); // aborta si difiere
  });

  it("plan vacío → SQL inofensivo", () => {
    expect(generarSqlMigracion({ meses: [], cuotas: [] })).toContain("Sin meses que migrar");
  });
});
