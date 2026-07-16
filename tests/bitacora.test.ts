import { describe, it, expect } from "vitest";
import {
  camposCambiados,
  resumenAuditoria,
  type Auditoria,
} from "@/lib/bitacora";

function fila(parcial: Partial<Auditoria>): Auditoria {
  return {
    id: 1,
    tabla: "pagos",
    registro_id: "5",
    accion: "UPDATE",
    usuario: null,
    antes: null,
    despues: null,
    creado_en: "2026-07-16T14:00:00Z",
    ...parcial,
  };
}

describe("bitácora (4.2)", () => {
  it("camposCambiados detecta solo lo que cambió", () => {
    const antes = { id: 5, estado: "pendiente", monto_cent: 1000 };
    const despues = { id: 5, estado: "pagado", monto_cent: 1000 };
    expect(camposCambiados(antes, despues)).toEqual(["estado"]);
  });

  it("camposCambiados con objetos vacíos o nulos → []", () => {
    expect(camposCambiados(null, null)).toEqual([]);
    expect(camposCambiados({ a: 1 }, { a: 1 })).toEqual([]);
  });

  it("resumen de una creación", () => {
    expect(resumenAuditoria(fila({ accion: "INSERT", tabla: "egresos" }))).toBe(
      "Creó un registro en egresos",
    );
  });

  it("resumen de una eliminación", () => {
    expect(resumenAuditoria(fila({ accion: "DELETE", tabla: "pagos" }))).toBe(
      "Eliminó un registro de pagos",
    );
  });

  it("resumen de un cambio lista los campos (ignorando id)", () => {
    const f = fila({
      accion: "UPDATE",
      tabla: "cuotas",
      antes: { id: 5, estado: "pendiente" },
      despues: { id: 5, estado: "pagado" },
    });
    expect(resumenAuditoria(f)).toBe("Cambió estado en cuotas");
  });
});
