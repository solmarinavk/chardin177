import { describe, it, expect } from "vitest";
import {
  gruposDuplicados,
  idsDuplicados,
  montoRepetidoCent,
  claveDuplicado,
  montoCorreccionCent,
  conceptoCorreccion,
  esDireccionCorreccion,
  PREFIJO_CORRECCION,
} from "@/lib/duplicados";

// El caso real: el recibo de Sedapal de S/ 434.40 quedó registrado dos veces el
// mismo día (04/09/2026) y nadie lo notó hasta revisar la base a mano.
const egreso = (
  id: number,
  monto_cent: number,
  fecha: string,
  periodo_id = 8,
) => ({ id, monto_cent, fecha, periodo_id });

describe("gruposDuplicados", () => {
  it("no marca nada cuando todos los gastos son distintos", () => {
    const lista = [
      egreso(1, 43440, "2026-09-04"),
      egreso(2, 35000, "2026-09-04"),
      egreso(3, 110160, "2026-09-04"),
    ];
    expect(gruposDuplicados(lista)).toEqual([]);
    expect(montoRepetidoCent(lista)).toBe(0);
  });

  it("detecta el Sedapal cargado dos veces el mismo día", () => {
    const lista = [
      egreso(1, 43440, "2026-09-04"),
      egreso(2, 43440, "2026-09-04"),
      egreso(3, 35000, "2026-09-04"),
    ];
    const grupos = gruposDuplicados(lista);
    expect(grupos).toHaveLength(1);
    expect(grupos[0]!.map((e) => e.id)).toEqual([1, 2]);
    expect(montoRepetidoCent(lista)).toBe(43440);
    expect([...idsDuplicados(lista)]).toEqual([1, 2]);
  });

  it("NO marca las dos quincenas del portero (mismo monto, fechas distintas)", () => {
    // Este es el falso positivo que hay que evitar: S/ 750 el 16 y S/ 750 el 31.
    const lista = [
      egreso(1, 75000, "2026-08-16"),
      egreso(2, 75000, "2026-08-31"),
    ];
    expect(gruposDuplicados(lista)).toEqual([]);
    expect(montoRepetidoCent(lista)).toBe(0);
  });

  it("no mezcla meses distintos aunque coincidan monto y fecha", () => {
    const lista = [
      egreso(1, 43440, "2026-09-04", 8),
      egreso(2, 43440, "2026-09-04", 9),
    ];
    expect(gruposDuplicados(lista)).toEqual([]);
  });

  it("cuenta bien cuando algo se registró tres veces", () => {
    const lista = [
      egreso(1, 43440, "2026-09-04"),
      egreso(2, 43440, "2026-09-04"),
      egreso(3, 43440, "2026-09-04"),
    ];
    expect(gruposDuplicados(lista)[0]).toHaveLength(3);
    // Sobran dos copias, no tres
    expect(montoRepetidoCent(lista)).toBe(86880);
  });

  it("suma el exceso de varios grupos a la vez", () => {
    const lista = [
      egreso(1, 43440, "2026-09-04"),
      egreso(2, 43440, "2026-09-04"),
      egreso(3, 35000, "2026-09-05"),
      egreso(4, 35000, "2026-09-05"),
    ];
    expect(gruposDuplicados(lista)).toHaveLength(2);
    expect(montoRepetidoCent(lista)).toBe(43440 + 35000);
  });

  it("la lista vacía no rompe nada", () => {
    expect(gruposDuplicados([])).toEqual([]);
    expect(montoRepetidoCent([])).toBe(0);
    expect(idsDuplicados([]).size).toBe(0);
  });

  it("la clave distingue mes, fecha y monto", () => {
    expect(claveDuplicado(egreso(1, 43440, "2026-09-04", 8))).toBe(
      "8|2026-09-04|43440",
    );
    expect(claveDuplicado(egreso(1, 43440, "2026-09-04", 8))).not.toBe(
      claveDuplicado(egreso(2, 43440, "2026-09-05", 8)),
    );
  });
});

// El duplicado de Sedapal se descubrió con agosto ya cerrado: no se puede
// borrar, se corrige con una línea en el mes abierto. Devolver plata a la caja
// es un egreso negativo, porque saldo = inicial + ingresos − egresos.
describe("correcciones de caja", () => {
  it("devolver plata a la caja da un monto negativo", () => {
    expect(montoCorreccionCent("devolver", 43440)).toBe(-43440);
  });

  it("sacar plata de la caja da un monto positivo", () => {
    expect(montoCorreccionCent("sacar", 43440)).toBe(43440);
  });

  it("ignora el signo que venga escrito y usa solo la dirección", () => {
    // La persona escribe 434.40, nunca un negativo; el signo lo pone la app.
    expect(montoCorreccionCent("devolver", -43440)).toBe(-43440);
    expect(montoCorreccionCent("sacar", -43440)).toBe(43440);
  });

  it("una corrección que devuelve compensa exacto al gasto duplicado", () => {
    const duplicado = 43440;
    expect(duplicado + montoCorreccionCent("devolver", duplicado)).toBe(0);
  });

  it("marca el concepto para distinguirlo de un gasto normal", () => {
    expect(conceptoCorreccion("Sedapal duplicado de agosto")).toBe(
      `${PREFIJO_CORRECCION}Sedapal duplicado de agosto`,
    );
  });

  it("no repite el prefijo si ya viene puesto", () => {
    const yaPuesto = `${PREFIJO_CORRECCION}Sedapal duplicado`;
    expect(conceptoCorreccion(yaPuesto)).toBe(yaPuesto);
  });

  it("recorta los espacios sobrantes del concepto", () => {
    expect(conceptoCorreccion("  Sedapal  ")).toBe(`${PREFIJO_CORRECCION}Sedapal`);
  });

  it("solo acepta las dos direcciones válidas", () => {
    expect(esDireccionCorreccion("devolver")).toBe(true);
    expect(esDireccionCorreccion("sacar")).toBe(true);
    expect(esDireccionCorreccion("otra")).toBe(false);
    expect(esDireccionCorreccion(null)).toBe(false);
    expect(esDireccionCorreccion(undefined)).toBe(false);
  });
});
