import { describe, it, expect } from "vitest";
import {
  normalizarConcepto,
  gastosFrecuentes,
  clasificarGasto,
  presetPara,
  esTipoGasto,
} from "@/lib/gastos-frecuentes";

// Gastos frecuentes de un toque (6.8): los botones salen del propio
// historial, así que aquí se prueba con los gastos reales de agosto/setiembre.

const e = (
  id: number,
  concepto: string,
  monto_cent: number,
  fecha: string,
  categoria_id: number | null = null,
) => ({ id, concepto, monto_cent, fecha, categoria_id });

const HISTORIAL = [
  e(1, "Pago del ascensor", 47454, "2026-08-10", 4),
  e(2, "Quincena vigilancia ( Perci)", 75000, "2026-08-16", 1),
  e(3, "Pago quincena Vigilacia Perci", 75000, "2026-08-31", 1),
  e(4, "Sedapal", 43440, "2026-09-04", 2),
  e(5, "Sedapal", 43440, "2026-09-04", 2),
  e(6, "Gatwick", 35000, "2026-09-04", 5),
  e(7, "Luz del sur", 110160, "2026-09-04", 3),
  e(8, "Corrección: Sedapal de agosto registrado dos veces", -43440, "2026-09-05", 2),
];

describe("normalizarConcepto", () => {
  it("quita tildes, mayúsculas y signos", () => {
    expect(normalizarConcepto("  Pago  quincena Vigilancia (Perci) ")).toBe(
      "pago quincena vigilancia perci",
    );
    expect(normalizarConcepto("Reparación de bomba")).toBe("reparacion de bomba");
  });
});

describe("gastosFrecuentes", () => {
  it("agrupa por concepto y pone primero el más repetido", () => {
    const f = gastosFrecuentes(HISTORIAL);
    expect(f[0]).toMatchObject({ concepto: "Sedapal", veces: 2, monto_cent: 43440 });
  });

  it("las correcciones (negativas) no aparecen como gasto frecuente", () => {
    const f = gastosFrecuentes(HISTORIAL);
    expect(f.some((g) => g.concepto.startsWith("Corrección"))).toBe(false);
    expect(f.every((g) => g.monto_cent > 0)).toBe(true);
  });

  it("usa la categoría y el monto de la última vez", () => {
    const f = gastosFrecuentes([
      e(1, "Sedapal", 46170, "2026-07-05", null),
      e(2, "Sedapal", 43440, "2026-08-05", 2),
    ]);
    expect(f[0]).toMatchObject({ monto_cent: 43440, categoria_id: 2, veces: 2 });
  });

  it("a igual frecuencia, primero el más reciente", () => {
    const f = gastosFrecuentes(HISTORIAL);
    const soloUnaVez = f.filter((g) => g.veces === 1).map((g) => g.ultimaFecha);
    expect(soloUnaVez).toEqual([...soloUnaVez].sort().reverse());
  });

  it("respeta el máximo", () => {
    expect(gastosFrecuentes(HISTORIAL, 3)).toHaveLength(3);
  });

  it("no revienta con una lista vacía", () => {
    expect(gastosFrecuentes([])).toEqual([]);
  });
});

describe("clasificarGasto", () => {
  it("por categoría", () => {
    expect(clasificarGasto("lo que sea", "Vigilancia")).toBe("portero");
    expect(clasificarGasto("lo que sea", "Agua")).toBe("agua");
    expect(clasificarGasto("lo que sea", "Luz")).toBe("luz");
  });

  it("por concepto cuando la categoría no ayuda", () => {
    expect(clasificarGasto("Pago quincena Vigilacia Perci", "Otros")).toBe("portero");
    expect(clasificarGasto("Sueldo Percy", null)).toBe("portero");
    expect(clasificarGasto("Sedapal", "Otros")).toBe("agua");
    expect(clasificarGasto("Luz del sur", null)).toBe("luz");
  });

  it("lo que no es fijo del mes queda sin clasificar", () => {
    expect(clasificarGasto("Pago del ascensor", "Ascensor")).toBeNull();
    expect(clasificarGasto("Gatwick", "Montavehículo")).toBeNull();
  });
});

describe("presetPara", () => {
  const categorias = new Map([
    [1, "Vigilancia"],
    [2, "Agua"],
    [3, "Luz"],
  ]);

  it("encuentra el botón que corresponde a cada tipo", () => {
    const f = gastosFrecuentes(HISTORIAL);
    expect(presetPara("agua", f, categorias)?.concepto).toBe("Sedapal");
    expect(presetPara("luz", f, categorias)?.concepto).toBe("Luz del sur");
    expect(presetPara("portero", f, categorias)?.monto_cent).toBe(75000);
  });

  it("null si nunca se registró uno así", () => {
    expect(presetPara("luz", gastosFrecuentes([HISTORIAL[0]!]), categorias)).toBeNull();
  });
});

describe("esTipoGasto", () => {
  it("solo acepta los tres tipos", () => {
    expect(esTipoGasto("agua")).toBe(true);
    expect(esTipoGasto("ascensor")).toBe(false);
    expect(esTipoGasto(undefined)).toBe(false);
  });
});
