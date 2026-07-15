import { describe, it, expect } from "vitest";
import {
  redondearCentimo,
  aCentimos,
  aSoles,
  formatoPEN,
  prorratear,
} from "@/lib/centimos";
import junio from "./fixtures/junio_2026.json";
import julio from "./fixtures/julio_2026.json";

describe("redondearCentimo (half away from zero, como Postgres)", () => {
  it("redondea .5 hacia afuera del cero", () => {
    expect(redondearCentimo(2.5)).toBe(3);
    expect(redondearCentimo(-2.5)).toBe(-3);
    expect(redondearCentimo(2.4)).toBe(2);
    expect(redondearCentimo(-2.4)).toBe(-2);
    expect(redondearCentimo(0)).toBe(0);
  });
});

describe("aCentimos", () => {
  it("convierte soles a céntimos enteros", () => {
    expect(aCentimos(1234.56)).toBe(123456);
    expect(aCentimos(0)).toBe(0);
    expect(aCentimos(0.1)).toBe(10);
    expect(aCentimos(508.9)).toBe(50890);
  });

  it("mata la cola de decimales del float", () => {
    // 19.99 * 100 = 1998.9999999999998 en float
    expect(aCentimos(19.99)).toBe(1999);
    expect(aCentimos(0.29)).toBe(29);
    expect(aCentimos(443.7)).toBe(44370);
  });
});

describe("aSoles", () => {
  it("convierte céntimos a soles", () => {
    expect(aSoles(123456)).toBe(1234.56);
    expect(aSoles(50890)).toBe(508.9);
    expect(aSoles(0)).toBe(0);
  });
});

describe("formatoPEN", () => {
  it("formatea al estilo peruano S/ 1,234.56", () => {
    expect(formatoPEN(123456)).toBe("S/ 1,234.56");
    expect(formatoPEN(0)).toBe("S/ 0.00");
    expect(formatoPEN(5)).toBe("S/ 0.05");
    expect(formatoPEN(100)).toBe("S/ 1.00");
    expect(formatoPEN(50890)).toBe("S/ 508.90");
    expect(formatoPEN(1000000)).toBe("S/ 10,000.00");
    expect(formatoPEN(123456789)).toBe("S/ 1,234,567.89");
  });

  it("muestra negativos con el signo delante", () => {
    expect(formatoPEN(-50)).toBe("-S/ 0.50");
    expect(formatoPEN(-123456)).toBe("-S/ 1,234.56");
  });
});

describe("prorratear (regla del residuo al mayor consumo)", () => {
  it("reparte proporcionalmente y cuadra exacto", () => {
    expect(prorratear(100, [1, 1, 1, 1])).toEqual([25, 25, 25, 25]);
  });

  it("asigna el residuo positivo al mayor peso", () => {
    // 10/3 = 3.33 → [3,3,3] suma 9, residuo +1 al mayor.
    // Con pesos iguales, el mayor es el primero (índice 0).
    expect(prorratear(10, [1, 1, 1])).toEqual([4, 3, 3]);
    // Aquí el mayor peso es el del medio.
    expect(prorratear(10, [1, 5, 1])).toEqual([1, 8, 1]);
  });

  it("asigna el residuo negativo al mayor peso", () => {
    // 8/3 = 2.67 → [3,3,3] suma 9, residuo -1 al mayor (índice 0).
    expect(prorratear(8, [1, 1, 1])).toEqual([2, 3, 3]);
  });

  it("caso borde Σ pesos = 0: reparte en partes iguales", () => {
    expect(prorratear(100, [0, 0, 0, 0])).toEqual([25, 25, 25, 25]);
    // 100/3 = 33.33 → [33,33,33] suma 99, residuo +1 al índice 0
    expect(prorratear(100, [0, 0, 0])).toEqual([34, 33, 33]);
  });

  it("la suma SIEMPRE es exactamente el total (invariante)", () => {
    const casos: Array<[number, number[]]> = [
      [33870, [4, 16, 13, 16, 9, 6, 4, 15, 20, 13]],
      [31170, [3, 16, 12, 12, 7, 6, 4, 15, 21, 12]],
      [12345, [1, 2, 3, 4, 5]],
      [99999, [7, 7, 7, 7, 7, 7, 7]],
      [-500, [2, 3, 5]],
    ];
    for (const [total, pesos] of casos) {
      const r = prorratear(total, pesos);
      expect(r.reduce((a, b) => a + b, 0)).toBe(total);
      expect(r).toHaveLength(pesos.length);
    }
  });

  it("arreglo vacío devuelve vacío", () => {
    expect(prorratear(1000, [])).toEqual([]);
  });
});

// ---------- Verificación contra datos reales del edificio ----------
// Previa en JS del reparto de agua del motor. El test dorado completo (en
// Postgres) llega en la Fase 1; aquí ya fijamos la aritmética con los fixtures.
type Fixture = typeof junio;

function indiceMayor(pesos: number[]): number {
  let idx = 0;
  for (let i = 1; i < pesos.length; i++) {
    if ((pesos[i] as number) > (pesos[idx] as number)) idx = i;
  }
  return idx;
}

function verificarAguaFixture(nombre: string, f: Fixture) {
  describe(`agua consumo · ${nombre}`, () => {
    const pool = f.recibo_agua_cent - f.agua_comun_dpto_cent * 10;
    const deltas = f.deptos.map((d) => d.lectura_actual - d.lectura_anterior);
    const esperado = f.deptos.map((d) => d.esperado.agua_consumo_cent);
    const resultado = prorratear(pool, deltas);
    const idxMax = indiceMayor(deltas);

    it("el pool de agua se reparte completo (suma = recibo − agua común)", () => {
      expect(resultado.reduce((a, b) => a + b, 0)).toBe(pool);
    });

    it("cada dpto coincide (tolerancia 1c; 5c en el que absorbe el residuo)", () => {
      for (let i = 0; i < resultado.length; i++) {
        const tolerancia = i === idxMax ? 5 : 1;
        expect(Math.abs((resultado[i] as number) - (esperado[i] as number))).toBeLessThanOrEqual(
          tolerancia,
        );
      }
    });
  });
}

verificarAguaFixture("junio 2026", junio);
verificarAguaFixture("julio 2026", julio);

// ---------- Cuota total por dpto (previa en JS del motor completo) ----------
function verificarTotalesFixture(nombre: string, f: Fixture) {
  describe(`cuota total · ${nombre}`, () => {
    const pool = f.recibo_agua_cent - f.agua_comun_dpto_cent * 10;
    const deltas = f.deptos.map((d) => d.lectura_actual - d.lectura_anterior);
    const agua = prorratear(pool, deltas);
    const idxMax = indiceMayor(deltas);

    const luz = redondearCentimo(f.recibo_luz_cent / 10);
    const vig = redondearCentimo(f.vigilancia_total_cent / 10);
    const man = redondearCentimo(f.manto_total_cent / 10);

    const totales = f.deptos.map((_, i) => {
      return (
        (agua[i] as number) +
        f.agua_comun_dpto_cent +
        luz +
        vig +
        man +
        f.materiales_dpto_cent +
        f.extra_dpto_cent
      );
    });

    it("cada total coincide con el Excel (tolerancia 1c; 5c en el residuo)", () => {
      for (let i = 0; i < totales.length; i++) {
        const tolerancia = i === idxMax ? 5 : 1;
        const esperado = f.deptos[i]!.esperado.total_cent;
        expect(Math.abs((totales[i] as number) - esperado)).toBeLessThanOrEqual(tolerancia);
      }
    });

    it("invariante #2: Σ totales = recibos + fijas + extras (exacto)", () => {
      const sumaTotales = totales.reduce((a, b) => a + b, 0);
      const derecha =
        f.recibo_agua_cent +
        f.recibo_luz_cent +
        f.vigilancia_total_cent +
        f.manto_total_cent +
        f.materiales_dpto_cent * 10 +
        f.extra_dpto_cent * 10;
      expect(sumaTotales).toBe(derecha);
    });
  });
}

verificarTotalesFixture("junio 2026", junio);
verificarTotalesFixture("julio 2026", julio);
