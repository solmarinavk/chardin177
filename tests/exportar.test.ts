import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { construirLibro, nombreArchivo, type HojaExcel } from "@/lib/exportar";

// Vuelve a leer el .xlsx generado para verificar que lo que sale es correcto.
async function releer(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  return wb;
}

describe("exportador a Excel (4.6)", () => {
  const hojas: HojaExcel[] = [
    {
      nombre: "Pagos",
      columnas: [
        { encabezado: "Dpto", clave: "dpto", tipo: "entero" },
        { encabezado: "Concepto", clave: "concepto", tipo: "texto" },
        { encabezado: "Fecha", clave: "fecha", tipo: "fecha" },
        { encabezado: "Monto", clave: "monto_cent", tipo: "dinero" },
      ],
      filas: [
        { dpto: 201, concepto: "Cuota julio", fecha: "2026-07-12", monto_cent: 45813 },
        { dpto: 501, concepto: "Cuota julio", fecha: "2026-07-15", monto_cent: 1234567 },
      ],
    },
    {
      nombre: "Egresos",
      columnas: [
        { encabezado: "Concepto", clave: "concepto", tipo: "texto" },
        { encabezado: "Monto", clave: "monto_cent", tipo: "dinero" },
      ],
      filas: [{ concepto: "Vigilante", monto_cent: 200000 }],
    },
  ];

  it("genera un libro con una hoja por tipo de dato", async () => {
    const buf = await construirLibro(hojas);
    const wb = await releer(buf);
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Pagos", "Egresos"]);
  });

  it("los montos van en SOLES como número (sumables), no como texto", async () => {
    const wb = await releer(await construirLibro(hojas));
    const ws = wb.getWorksheet("Pagos")!;
    const celda = ws.getRow(2).getCell(4); // primera fila de datos, col Monto
    expect(typeof celda.value).toBe("number");
    expect(celda.value).toBeCloseTo(458.13, 5); // 45813 céntimos → S/ 458.13
    expect(celda.numFmt).toContain("S/");
  });

  it("convierte céntimos grandes exactamente (1234567 → 12345.67)", async () => {
    const wb = await releer(await construirLibro(hojas));
    const ws = wb.getWorksheet("Pagos")!;
    expect(ws.getRow(3).getCell(4).value).toBeCloseTo(12345.67, 5);
  });

  it("las fechas salen como fecha real con el día correcto (sin correrse por huso)", async () => {
    const wb = await releer(await construirLibro(hojas));
    const ws = wb.getWorksheet("Pagos")!;
    const v = ws.getRow(2).getCell(3).value;
    expect(v instanceof Date).toBe(true);
    expect((v as Date).getUTCFullYear()).toBe(2026);
    expect((v as Date).getUTCMonth()).toBe(6); // julio (0-based)
    expect((v as Date).getUTCDate()).toBe(12);
  });

  it("el encabezado va en negrita y congelado", async () => {
    const wb = await releer(await construirLibro(hojas));
    const ws = wb.getWorksheet("Pagos")!;
    expect(ws.getRow(1).getCell(1).font?.bold).toBe(true);
    expect(ws.views?.[0]?.state).toBe("frozen");
  });

  it("desambigua nombres de hoja repetidos", async () => {
    const repetidas: HojaExcel[] = [
      { nombre: "Caja", columnas: [{ encabezado: "X", clave: "x" }], filas: [{ x: "a" }] },
      { nombre: "Caja", columnas: [{ encabezado: "X", clave: "x" }], filas: [{ x: "b" }] },
    ];
    const wb = await releer(await construirLibro(repetidas));
    const nombres = wb.worksheets.map((w) => w.name);
    expect(nombres).toHaveLength(2);
    expect(new Set(nombres).size).toBe(2); // no se repiten
  });

  it("nombreArchivo arma un nombre seguro con fecha", () => {
    expect(nombreArchivo("Estado de cuenta", "2026-07-16")).toBe(
      "chardin177_estado_de_cuenta_2026-07-16.xlsx",
    );
  });
});
