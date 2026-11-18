import { describe, it, expect } from "vitest";
import {
  avisoConsumo,
  motivosRecalcular,
  listaDptos,
  type CuotaRevisable,
  type LecturaRevisable,
  type AjusteRevisable,
} from "@/lib/revision-cuotas";

// 6.11 · Lo del 17/11/2026: las 10 lecturas de noviembre quedaron en consumo 0,
// el motor repartió el agua en partes iguales (regla 8) y se emitieron 10
// cuotas idénticas sin aviso. La regla 8 también manda alertar.

// Un borrador coherente de 3 dptos: agua 531.40 (común 15 c/u, pool 486.40
// repartido por consumo 2/18/12 m³), luz 595.40 (en 3 partes, residuo al mayor).
const LECTURAS: LecturaRevisable[] = [
  { dpto_id: 101, lectura_anterior: 128, lectura_actual: 130 },
  { dpto_id: 102, lectura_anterior: 439, lectura_actual: 457 },
  { dpto_id: 201, lectura_anterior: 535, lectura_actual: 547 },
];
const AJUSTES: AjusteRevisable[] = [
  { dpto_id: 101, monto_cent: 16000, origen: "cuota_extra" },
  { dpto_id: 102, monto_cent: 16000, origen: "cuota_extra" },
  { dpto_id: 201, monto_cent: 16000, origen: "cuota_extra" },
  { dpto_id: 201, monto_cent: -4000, origen: "manual" },
];
const RECIBOS = { aguaCent: 53140, luzCent: 59540 };
const CUOTAS: CuotaRevisable[] = [
  { dpto_id: 101, m3_variacion: 2, agua_consumo_cent: 3040, agua_comun_cent: 1500, luz_cent: 19847, extra_cent: 16000, ajuste_cent: 0 },
  { dpto_id: 102, m3_variacion: 18, agua_consumo_cent: 27360, agua_comun_cent: 1500, luz_cent: 19846, extra_cent: 16000, ajuste_cent: 0 },
  { dpto_id: 201, m3_variacion: 12, agua_consumo_cent: 18240, agua_comun_cent: 1500, luz_cent: 19847, extra_cent: 16000, ajuste_cent: -4000 },
];

describe("avisoConsumo (regla 8: Σ Δm³ = 0 → alertar)", () => {
  it("todas las lecturas en 0: BLOQUEA y explica que las cuotas salen idénticas", () => {
    const aviso = avisoConsumo(CUOTAS.map((c) => ({ ...c, m3_variacion: 0 })));
    expect(aviso?.nivel).toBe("bloquea");
    expect(aviso?.texto).toMatch(/partes iguales/);
    expect(aviso?.texto).toMatch(/idénticas/);
    expect(aviso?.texto).toMatch(/Lecturas de agua/);
  });

  it("solo algunas en 0: AVISA nombrando los dptos", () => {
    const aviso = avisoConsumo([
      CUOTAS[0]!,
      { ...CUOTAS[1]!, m3_variacion: 0 },
      { ...CUOTAS[2]!, m3_variacion: 0 },
    ]);
    expect(aviso?.nivel).toBe("avisa");
    expect(aviso?.texto).toMatch(/Los dptos 102 y 201 tienen consumo 0/);
  });

  it("un solo dpto en 0: singular", () => {
    const aviso = avisoConsumo([CUOTAS[0]!, CUOTAS[1]!, { ...CUOTAS[2]!, m3_variacion: 0 }]);
    expect(aviso?.texto).toMatch(/El dpto 201 tiene consumo 0/);
    expect(aviso?.texto).toMatch(/está vacío/);
  });

  it("con consumo en todos: nada que avisar; sin cuotas: nada", () => {
    expect(avisoConsumo(CUOTAS)).toBeNull();
    expect(avisoConsumo([])).toBeNull();
  });
});

describe("motivosRecalcular (el borrador contra los datos de hoy)", () => {
  it("todo al día: sin motivos", () => {
    expect(motivosRecalcular(CUOTAS, LECTURAS, RECIBOS, AJUSTES)).toEqual([]);
  });

  it("sin cuotas calculadas no hay nada que comparar", () => {
    expect(motivosRecalcular([], LECTURAS, RECIBOS, AJUSTES)).toEqual([]);
  });

  it("Percy corrigió una lectura después de calcular: lo dice con el dpto", () => {
    const lect = LECTURAS.map((l) =>
      l.dpto_id === 102 ? { ...l, lectura_actual: 460 } : l,
    );
    expect(motivosRecalcular(CUOTAS, lect, RECIBOS, AJUSTES)).toEqual([
      "las lecturas de agua cambiaron (dpto 102)",
    ]);
  });

  it("el caso real: cuotas con 0 m³ y lecturas ya corregidas → los 10 cambiaron", () => {
    const viejas = CUOTAS.map((c) => ({ ...c, m3_variacion: 0 }));
    expect(motivosRecalcular(viejas, LECTURAS, RECIBOS, AJUSTES)).toEqual([
      "las lecturas de agua cambiaron (dpto 101, 102 y 201)",
    ]);
  });

  it("cambió el recibo de agua o el de luz", () => {
    expect(motivosRecalcular(CUOTAS, LECTURAS, { ...RECIBOS, aguaCent: 55000 }, AJUSTES)).toEqual([
      "el recibo de agua cambió",
    ]);
    expect(motivosRecalcular(CUOTAS, LECTURAS, { ...RECIBOS, luzCent: 57390 }, AJUSTES)).toEqual([
      "el recibo de luz cambió",
    ]);
  });

  it("falta un recibo (se calculó y después desapareció)", () => {
    expect(motivosRecalcular(CUOTAS, LECTURAS, { aguaCent: null, luzCent: null }, AJUSTES)).toEqual([
      "falta el recibo de agua",
      "falta el recibo de luz",
    ]);
  });

  it("se agregó o quitó una derrama después de calcular", () => {
    expect(
      motivosRecalcular(CUOTAS, LECTURAS, RECIBOS, AJUSTES.filter((a) => a.origen !== "cuota_extra")),
    ).toEqual(["la derrama cambió"]);
    expect(
      motivosRecalcular(CUOTAS, LECTURAS, RECIBOS, [
        ...AJUSTES,
        { dpto_id: 101, monto_cent: 5000, origen: "cuota_extra" },
      ]),
    ).toEqual(["la derrama cambió"]);
  });

  it("cambió un ajuste (no derrama)", () => {
    expect(
      motivosRecalcular(CUOTAS, LECTURAS, RECIBOS, AJUSTES.filter((a) => a.origen !== "manual")),
    ).toEqual(["los ajustes cambiaron"]);
  });

  it("varias cosas a la vez, en orden", () => {
    const lect = LECTURAS.map((l) => (l.dpto_id === 101 ? { ...l, lectura_actual: 135 } : l));
    expect(motivosRecalcular(CUOTAS, lect, { ...RECIBOS, luzCent: 1 }, [])).toEqual([
      "las lecturas de agua cambiaron (dpto 101)",
      "el recibo de luz cambió",
      "la derrama cambió",
      "los ajustes cambiaron",
    ]);
  });
});

describe("listaDptos", () => {
  it("ordena y une con 'y'", () => {
    expect(listaDptos([302, 201])).toBe("201 y 302");
    expect(listaDptos([101])).toBe("101");
    expect(listaDptos([501, 101, 302])).toBe("101, 302 y 501");
    expect(listaDptos([])).toBe("");
  });
});
