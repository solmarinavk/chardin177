import { describe, it, expect } from "vitest";
import { repartirBarra, menuPara } from "@/lib/navegacion";

// 6.12 · La barra inferior del celular: caben 5 pestañas. Tesorería tiene 8
// secciones y Caja era la sexta: no se podía abrir desde el celular.

describe("repartirBarra", () => {
  it("con 5 o menos, van todas y no hay 'Más'", () => {
    expect(repartirBarra(["a", "b", "c"])).toEqual({ principales: ["a", "b", "c"], resto: [] });
    expect(repartirBarra(["a", "b", "c", "d", "e"])).toEqual({
      principales: ["a", "b", "c", "d", "e"],
      resto: [],
    });
    expect(repartirBarra([])).toEqual({ principales: [], resto: [] });
  });

  it("con más de 5, van las 4 primeras y el resto a 'Más'", () => {
    expect(repartirBarra(["a", "b", "c", "d", "e", "f"])).toEqual({
      principales: ["a", "b", "c", "d"],
      resto: ["e", "f"],
    });
  });
});

describe("menú por rol en el celular", () => {
  it("tesorería y admin: Inicio, Lecturas, Periodos y Caja en la barra; Cuenta y Cuaderno en 'Más'", () => {
    for (const rol of ["tesoreria", "admin"] as const) {
      const { principales, resto } = repartirBarra(menuPara(rol).filter((m) => m.activo));
      expect(principales.map((m) => m.href)).toEqual([
        "/inicio",
        "/lecturas",
        "/periodos",
        "/caja",
      ]);
      expect(resto.map((m) => m.href)).toEqual(
        expect.arrayContaining(["/estado-cuenta", "/ocurrencias", "/exportar", "/documentos"]),
      );
    }
  });

  it("portería: sus 3 pestañas de siempre, sin 'Más'", () => {
    const { principales, resto } = repartirBarra(menuPara("porteria").filter((m) => m.activo));
    expect(principales.map((m) => m.href)).toEqual(["/inicio", "/lecturas", "/ocurrencias", "/ayuda"]);
    expect(resto).toEqual([]);
  });
});
