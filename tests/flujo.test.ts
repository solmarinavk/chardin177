import { describe, it, expect } from "vitest";
import {
  pasosDelMes,
  pasoActual,
  dptosPendientes,
  quincenasEsperadas,
  tareasRecurrentes,
} from "@/lib/flujo";

// El checklist del mes (6.8) existe para que la tesorera no tenga que
// recordar nada: qué falta, quién debe y qué gasto fijo no se ha registrado.

const periodo = { id: 9, anio: 2026, mes: 9, estado: "emitido" as const };

describe("dptosPendientes", () => {
  const cuotas = [
    { id: 1, dpto_id: 101, total_cent: 43405 },
    { id: 2, dpto_id: 102, total_cent: 46275 },
    { id: 3, dpto_id: 201, total_cent: 46536 },
  ];

  it("lista solo a los que deben, de menor a mayor dpto", () => {
    const pagado = new Map([
      [1, 43405], // 101 pagó todo
      [3, 10000], // 201 pagó una parte
    ]);
    expect(dptosPendientes(cuotas, pagado)).toEqual([
      { dpto: 102, debeCent: 46275, parcial: false },
      { dpto: 201, debeCent: 36536, parcial: true },
    ]);
  });

  it("vacío cuando todos pagaron", () => {
    const pagado = new Map([
      [1, 43405],
      [2, 46275],
      [3, 46536],
    ]);
    expect(dptosPendientes(cuotas, pagado)).toEqual([]);
  });

  it("pagar de más no lo deja como pendiente", () => {
    // El caso real del 202: pagó S/ 459.00 sobre S/ 458.13.
    const pagado = new Map([[2, 46300]]);
    expect(dptosPendientes([cuotas[1]!], pagado)).toEqual([]);
  });
});

describe("quincenasEsperadas", () => {
  const set = { anio: 2026, mes: 9 };
  it("antes del 15 no toca ninguna", () => {
    expect(quincenasEsperadas(set, "2026-09-08")).toBe(0);
  });
  it("del 15 al 27 toca la primera", () => {
    expect(quincenasEsperadas(set, "2026-09-15")).toBe(1);
    expect(quincenasEsperadas(set, "2026-09-27")).toBe(1);
  });
  it("desde el 28 tocan las dos", () => {
    expect(quincenasEsperadas(set, "2026-09-28")).toBe(2);
    expect(quincenasEsperadas(set, "2026-09-30")).toBe(2);
  });
  it("si el mes ya pasó, tocan las dos aunque sea día 1", () => {
    expect(quincenasEsperadas({ anio: 2026, mes: 8 }, "2026-09-01")).toBe(2);
  });
  it("un mes futuro no pide nada", () => {
    expect(quincenasEsperadas({ anio: 2026, mes: 10 }, "2026-09-30")).toBe(0);
  });
});

describe("tareasRecurrentes", () => {
  const set = { anio: 2026, mes: 9 };
  const egreso = (concepto: string, categoria: string | null, monto_cent = 75000) => ({
    concepto,
    categoria,
    monto_cent,
  });

  it("a principio de mes nada está pendiente todavía", () => {
    const t = tareasRecurrentes(set, [], "2026-09-08");
    expect(t.map((x) => x.estado)).toEqual(["despues", "despues", "despues"]);
  });

  it("el 16 sin quincena registrada: pendiente; agua y luz también", () => {
    const t = tareasRecurrentes(set, [], "2026-09-16");
    expect(t.find((x) => x.clave === "portero")).toMatchObject({
      estado: "pendiente",
      detalle: "0/2",
    });
    expect(t.find((x) => x.clave === "agua")?.estado).toBe("pendiente");
    expect(t.find((x) => x.clave === "luz")?.estado).toBe("pendiente");
  });

  it("con la primera quincena pagada el 16, la segunda aún no toca", () => {
    const t = tareasRecurrentes(
      set,
      [egreso("Quincena vigilancia ( Perci)", "Vigilancia")],
      "2026-09-20",
    );
    expect(t.find((x) => x.clave === "portero")).toMatchObject({
      estado: "despues",
      detalle: "1/2",
    });
  });

  it("reconoce la quincena aunque la categoría esté mal y el concepto tenga faltas", () => {
    // Lo que escribió la tesorera de verdad: "Pago quincena Vigilacia Perci"
    const t = tareasRecurrentes(
      set,
      [
        egreso("Pago quincena Vigilacia Perci", "Otros"),
        egreso("Quincena vigilancia ( Perci)", null),
      ],
      "2026-09-30",
    );
    expect(t.find((x) => x.clave === "portero")).toMatchObject({
      estado: "hecho",
      detalle: "2/2",
    });
  });

  it("reconoce Sedapal y Luz del Sur por el concepto", () => {
    const t = tareasRecurrentes(
      set,
      [egreso("Sedapal", "Otros", 43440), egreso("Luz del sur", null, 110160)],
      "2026-09-20",
    );
    expect(t.find((x) => x.clave === "agua")?.estado).toBe("hecho");
    expect(t.find((x) => x.clave === "luz")?.estado).toBe("hecho");
  });

  it("una corrección negativa no cuenta como recibo pagado", () => {
    const t = tareasRecurrentes(
      set,
      [egreso("Corrección: Sedapal de agosto registrado dos veces", "Agua", -43440)],
      "2026-09-20",
    );
    expect(t.find((x) => x.clave === "agua")?.estado).toBe("pendiente");
  });

  it("cada tarea pendiente lleva a registrar el gasto ya prellenado", () => {
    const t = tareasRecurrentes(set, [], "2026-09-20");
    expect(t.map((x) => x.href)).toEqual([
      "/caja?registrar=gasto&tipo=portero",
      "/caja?registrar=gasto&tipo=agua",
      "/caja?registrar=gasto&tipo=luz",
    ]);
  });
});

describe("pasosDelMes (el GPS que ya existía)", () => {
  it("en cobranza, el paso actual es 'pagos' y muestra el avance", () => {
    const pasos = pasosDelMes(periodo, {
      lecturas: 10,
      reciboAgua: true,
      reciboLuz: true,
      cuotas: 10,
      cuotasPagadas: 7,
    });
    expect(pasoActual(pasos)).toMatchObject({ clave: "pagos", detalle: "7/10" });
    expect(pasos.filter((p) => p.estado === "hecho")).toHaveLength(4);
  });

  it("con todos pagados, toca cerrar el mes", () => {
    const pasos = pasosDelMes(periodo, {
      lecturas: 10,
      reciboAgua: true,
      reciboLuz: true,
      cuotas: 10,
      cuotasPagadas: 10,
    });
    expect(pasoActual(pasos)?.clave).toBe("cerrar");
  });
});
