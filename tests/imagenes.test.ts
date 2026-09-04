import { describe, it, expect } from "vitest";
import {
  dimensionesDestino,
  LADO_MAX,
  LIMITE_SUBIDA_BYTES,
  pesoTotal,
  excedeLimite,
  enMB,
} from "@/lib/imagenes";

const MB = 1024 * 1024;

// Las fotos de cámara (3–5 MB) hacían fallar la subida por el límite del
// Server Action y el tope de Netlify. Se redimensionan antes de enviarlas;
// aquí se verifica el cálculo del tamaño destino (la parte pura).

describe("dimensionesDestino", () => {
  it("no toca una imagen que ya es más chica que el máximo", () => {
    expect(dimensionesDestino(800, 600)).toEqual({ ancho: 800, alto: 600 });
  });

  it("no toca una imagen exactamente del tamaño máximo", () => {
    expect(dimensionesDestino(LADO_MAX, 900)).toEqual({ ancho: LADO_MAX, alto: 900 });
  });

  it("achica una foto horizontal conservando la proporción", () => {
    // 4000×3000 (4:3) → el lado mayor baja a 1600 y el otro a 1200
    expect(dimensionesDestino(4000, 3000)).toEqual({ ancho: 1600, alto: 1200 });
  });

  it("achica una foto vertical conservando la proporción", () => {
    // 3000×4000 (foto de celular en vertical, el caso del portero)
    expect(dimensionesDestino(3000, 4000)).toEqual({ ancho: 1200, alto: 1600 });
  });

  it("achica una cuadrada a un cuadrado del máximo", () => {
    expect(dimensionesDestino(3000, 3000)).toEqual({ ancho: 1600, alto: 1600 });
  });

  it("nunca devuelve un lado en cero (imágenes muy alargadas)", () => {
    const r = dimensionesDestino(10000, 3);
    expect(r.ancho).toBe(1600);
    expect(r.alto).toBeGreaterThanOrEqual(1);
  });

  it("tolera dimensiones inválidas sin romper", () => {
    expect(dimensionesDestino(0, 0)).toEqual({ ancho: 0, alto: 0 });
  });

  it("respeta un lado máximo distinto", () => {
    expect(dimensionesDestino(2000, 1000, 500)).toEqual({ ancho: 500, alto: 250 });
  });
});

describe("límite de subida", () => {
  it("suma el peso de varias fotos", () => {
    expect(pesoTotal([{ size: 100 }, { size: 250 }])).toBe(350);
    expect(pesoTotal([])).toBe(0);
  });

  it("varias fotos ya comprimidas entran sin problema", () => {
    // 6 fotos de ~350 KB (lo típico tras comprimir) ≈ 2 MB
    const fotos = Array.from({ length: 6 }, () => ({ size: 350 * 1024 }));
    expect(excedeLimite(fotos)).toBe(false);
  });

  it("detecta el caso que rompía: fotos de cámara sin comprimir", () => {
    // 3 fotos de 4 MB = 12 MB → hay que avisar ANTES de enviar
    const fotos = Array.from({ length: 3 }, () => ({ size: 4 * MB }));
    expect(excedeLimite(fotos)).toBe(true);
  });

  it("el límite queda por debajo del corte de Netlify (~6 MB)", () => {
    expect(LIMITE_SUBIDA_BYTES).toBeLessThan(6 * MB);
  });

  it("muestra el peso en MB, legible para la persona", () => {
    expect(enMB(2 * MB)).toBe("2.0 MB");
    expect(enMB(0)).toBe("0.0 MB");
  });
});
