import ExcelJS from "exceljs";
import { aSoles } from "@/lib/centimos";

// Generador de Excel del lado servidor (tarea 4.6). REGLA: internamente todo es
// céntimos enteros; aquí se convierte a soles SOLO para el archivo, con formato
// de número "S/ #,##0.00" (los montos siguen siendo números, sumables en Excel).

export type TipoCol = "texto" | "dinero" | "fecha" | "entero";

export type ColumnaExcel = {
  encabezado: string;
  clave: string;
  tipo?: TipoCol; // por defecto "texto"
  ancho?: number;
};

export type HojaExcel = {
  nombre: string;
  columnas: ColumnaExcel[];
  filas: Array<Record<string, unknown>>;
};

const FMT_DINERO = '"S/ "#,##0.00';
const FMT_FECHA = "dd/mm/yyyy";

// Excel prohíbe estos caracteres en el nombre de hoja y lo limita a 31.
function nombreHojaValido(nombre: string): string {
  return nombre.replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 31) || "Hoja";
}

function anchoPorTipo(tipo?: TipoCol): number {
  if (tipo === "dinero") return 14;
  if (tipo === "fecha") return 12;
  if (tipo === "entero") return 10;
  return 22;
}

// "YYYY-MM-DD" → Date a mediodía UTC (evita que el huso corra el día en Excel).
function fechaDesdeISO(v: unknown): Date | null {
  if (v instanceof Date) return v;
  if (typeof v !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
}

function valorCelda(v: unknown, tipo?: TipoCol): unknown {
  if (v === null || v === undefined || v === "") return null;
  if (tipo === "dinero") return aSoles(Number(v)); // céntimos → soles (número)
  if (tipo === "fecha") return fechaDesdeISO(v);
  if (tipo === "entero") return Number(v);
  return v;
}

// Arma el libro (una hoja por elemento) y lo devuelve como Buffer .xlsx.
export async function construirLibro(hojas: HojaExcel[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Chardin 177";
  wb.created = new Date(Date.UTC(2026, 0, 1, 12));

  const usados = new Set<string>();
  for (const hoja of hojas) {
    // Nombres únicos y válidos (dos hojas no pueden llamarse igual).
    let nombre = nombreHojaValido(hoja.nombre);
    let i = 2;
    while (usados.has(nombre.toLowerCase())) {
      nombre = nombreHojaValido(`${hoja.nombre} ${i++}`);
    }
    usados.add(nombre.toLowerCase());

    const ws = wb.addWorksheet(nombre);
    ws.columns = hoja.columnas.map((c) => ({
      header: c.encabezado,
      key: c.clave,
      width: c.ancho ?? anchoPorTipo(c.tipo),
    }));
    const cabecera = ws.getRow(1);
    cabecera.font = { bold: true };
    cabecera.alignment = { vertical: "middle" };

    for (const fila of hoja.filas) {
      const valores: Record<string, unknown> = {};
      for (const c of hoja.columnas) valores[c.clave] = valorCelda(fila[c.clave], c.tipo);
      const nueva = ws.addRow(valores);
      hoja.columnas.forEach((c, idx) => {
        const celda = nueva.getCell(idx + 1);
        if (c.tipo === "dinero") celda.numFmt = FMT_DINERO;
        else if (c.tipo === "fecha") celda.numFmt = FMT_FECHA;
      });
    }

    ws.views = [{ state: "frozen", ySplit: 1 }]; // encabezado siempre visible
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// Nombre de archivo con fecha, seguro para descargas.
export function nombreArchivo(base: string, fechaISO: string): string {
  const limpio = base.replace(/[^a-z0-9_-]+/gi, "_").toLowerCase();
  return `chardin177_${limpio}_${fechaISO}.xlsx`;
}
