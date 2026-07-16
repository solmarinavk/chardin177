/**
 * Migración histórica (tarea 4.1) · Chardin 177
 *
 * Lee el Excel auditado `Chardin_177_Historico.xlsx` y genera un archivo .sql
 * con los periodos históricos (CERRADOS), sus cuotas por depto y los saldos de
 * caja arrastrados. NO recalcula con el motor: es un volcado fiel del Excel.
 *
 * Forma recomendada (la más simple para ti): esto SOLO lee el Excel y escribe
 * un .sql que tú revisas y pegas en Supabase → SQL Editor. No toca la base.
 *
 * Uso (en tu compu, no en el navegador):
 *   npm run migrar:excel -- ./Chardin_177_Historico.xlsx
 *   # opcional, otro nombre de salida:
 *   npm run migrar:excel -- ./Chardin_177_Historico.xlsx ./historico.sql
 *
 * Los montos del Excel están en SOLES; aquí se pasan a céntimos enteros.
 * Si el script no encuentra una columna, te muestra los encabezados que vio
 * para que ajustes los alias en la sección CONFIG de abajo.
 */
import ExcelJS from "exceljs";
import { writeFileSync } from "node:fs";
import { aCentimos } from "../lib/centimos";
import {
  validarMigracion,
  generarSqlMigracion,
  type FilaCuotaHist,
  type SaldoMesHist,
} from "../lib/migracion";

// ————————————————— CONFIG (ajusta si tus encabezados difieren) —————————————————
const HOJA_CUOTAS = "Cuotas";
const HOJA_CAJA = "Caja";

// Alias aceptados por columna (sin distinguir mayúsculas ni tildes).
const ALIAS = {
  anio: ["anio", "año", "ano", "year"],
  mes: ["mes", "month"],
  periodo: ["periodo", "período", "fecha", "mes/año", "mes-año"],
  dpto: ["dpto", "departamento", "depto", "unidad"],
  total: ["total", "cuota", "monto", "importe", "total_cent", "total s/"],
  saldoInicial: ["saldo inicial", "saldo_inicial", "inicial", "saldo anterior"],
  saldoFinal: ["saldo final", "saldo_final", "final", "saldo", "saldo cierre"],
};
// ———————————————————————————————————————————————————————————————————————————————

const normal = (s: string) =>
  s
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // quita tildes/diacríticos

type Mapa = Map<string, number>; // encabezado normalizado → índice de columna (1-based)

function encabezados(ws: ExcelJS.Worksheet): Mapa {
  const fila = ws.getRow(1);
  const mapa: Mapa = new Map();
  fila.eachCell((cell, col) => {
    const t = normal(cell.text || String(cell.value ?? ""));
    if (t) mapa.set(t, col);
  });
  return mapa;
}

function buscarCol(mapa: Mapa, alias: string[]): number | null {
  for (const a of alias) {
    const col = mapa.get(normal(a));
    if (col) return col;
  }
  return null;
}

function abortar(msg: string): never {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

function numeroCelda(v: ExcelJS.CellValue): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v;
  if (typeof v === "object" && v && "result" in v) return numeroCelda((v as { result: ExcelJS.CellValue }).result);
  const limpio = String(v).replace(/[^0-9.,-]/g, "").replace(/,/g, "");
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

// Céntimos desde una celda en soles (número o texto "S/ 1,234.56").
function centimosCelda(v: ExcelJS.CellValue): number | null {
  const n = numeroCelda(v);
  return n === null ? null : aCentimos(n);
}

// (anio, mes) de una fila: columnas separadas, o una sola de periodo/fecha.
function leerMes(
  fila: ExcelJS.Row,
  colAnio: number | null,
  colMes: number | null,
  colPeriodo: number | null,
): { anio: number; mes: number } | null {
  if (colAnio && colMes) {
    const a = numeroCelda(fila.getCell(colAnio).value);
    const m = numeroCelda(fila.getCell(colMes).value);
    if (a && m) return { anio: a, mes: m };
  }
  if (colPeriodo) {
    const cell = fila.getCell(colPeriodo).value;
    if (cell instanceof Date) return { anio: cell.getUTCFullYear(), mes: cell.getUTCMonth() + 1 };
    const s = String(cell ?? "").trim();
    let m = /(\d{4})[-/](\d{1,2})/.exec(s); // 2024-02
    if (m) return { anio: Number(m[1]), mes: Number(m[2]) };
    m = /(\d{1,2})[-/](\d{4})/.exec(s); // 02-2024
    if (m) return { anio: Number(m[2]), mes: Number(m[1]) };
  }
  return null;
}

async function main() {
  const ruta = process.argv[2];
  const salida = process.argv[3] ?? "historico_generado.sql";
  if (!ruta) abortar("Falta la ruta del Excel. Uso: npm run migrar:excel -- ./Chardin_177_Historico.xlsx");

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(ruta!);

  const wsCuotas = wb.getWorksheet(HOJA_CUOTAS);
  const wsCaja = wb.getWorksheet(HOJA_CAJA);
  if (!wsCuotas) abortar(`No encontré la hoja "${HOJA_CUOTAS}". Hojas: ${wb.worksheets.map((w) => w.name).join(", ")}`);
  if (!wsCaja) abortar(`No encontré la hoja "${HOJA_CAJA}". Hojas: ${wb.worksheets.map((w) => w.name).join(", ")}`);

  // ——— Hoja Cuotas ———
  const hc = encabezados(wsCuotas!);
  const cAnio = buscarCol(hc, ALIAS.anio);
  const cMes = buscarCol(hc, ALIAS.mes);
  const cPer = buscarCol(hc, ALIAS.periodo);
  const cDpto = buscarCol(hc, ALIAS.dpto);
  const cTotal = buscarCol(hc, ALIAS.total);
  if (!cDpto || !cTotal || (!cPer && !(cAnio && cMes)))
    abortar(
      `En "${HOJA_CUOTAS}" faltan columnas. Vi: [${[...hc.keys()].join(", ")}]. ` +
        `Necesito dpto, total y (periodo o anio+mes). Ajusta ALIAS en el script.`,
    );

  const cuotas: FilaCuotaHist[] = [];
  wsCuotas!.eachRow((fila, n) => {
    if (n === 1) return;
    const mes = leerMes(fila, cAnio, cMes, cPer);
    const dpto = numeroCelda(fila.getCell(cDpto!).value);
    const total = centimosCelda(fila.getCell(cTotal!).value);
    if (!mes || !dpto || total === null) return; // fila vacía o parcial
    cuotas.push({ anio: mes.anio, mes: mes.mes, dpto, total_cent: total });
  });

  // ——— Hoja Caja ———
  const hj = encabezados(wsCaja!);
  const jAnio = buscarCol(hj, ALIAS.anio);
  const jMes = buscarCol(hj, ALIAS.mes);
  const jPer = buscarCol(hj, ALIAS.periodo);
  const jIni = buscarCol(hj, ALIAS.saldoInicial);
  const jFin = buscarCol(hj, ALIAS.saldoFinal);
  if (!jFin || (!jPer && !(jAnio && jMes)))
    abortar(
      `En "${HOJA_CAJA}" faltan columnas. Vi: [${[...hj.keys()].join(", ")}]. ` +
        `Necesito saldo final y (periodo o anio+mes). Ajusta ALIAS en el script.`,
    );

  const crudos: Array<{ anio: number; mes: number; ini: number | null; fin: number }> = [];
  wsCaja!.eachRow((fila, n) => {
    if (n === 1) return;
    const mes = leerMes(fila, jAnio, jMes, jPer);
    const fin = centimosCelda(fila.getCell(jFin!).value);
    if (!mes || fin === null) return;
    const ini = jIni ? centimosCelda(fila.getCell(jIni).value) : null;
    crudos.push({ anio: mes.anio, mes: mes.mes, ini, fin });
  });
  crudos.sort((a, b) => a.anio * 12 + a.mes - (b.anio * 12 + b.mes));

  // Si no hay columna de saldo inicial, se encadena con el final del mes previo.
  const meses: SaldoMesHist[] = crudos.map((c, i) => ({
    anio: c.anio,
    mes: c.mes,
    saldo_inicial_cent: c.ini ?? (i > 0 ? crudos[i - 1]!.fin : c.fin),
    saldo_final_cent: c.fin,
  }));

  // ——— Validar ———
  const val = validarMigracion({ meses, cuotas });
  console.log(`\n📄 Leído: ${val.totalMeses} meses, ${val.totalCuotas} cuotas.`);
  if (val.advertencias.length) {
    console.log("\n⚠️  Advertencias (no bloquean):");
    for (const a of val.advertencias) console.log("   - " + a);
  }
  if (!val.ok) {
    console.error("\n❌ Errores que BLOQUEAN la migración (no se generó nada):");
    for (const e of val.errores) console.error("   - " + e);
    process.exit(1);
  }

  const sql = generarSqlMigracion({ meses, cuotas });
  writeFileSync(salida, sql, "utf8");

  console.log(`\n✅ SQL generado: ${salida}`);
  console.log(`   Último mes histórico: ${val.ultimoMes?.mes}/${val.ultimoMes?.anio}`);
  console.log(`   Saldo final (debe empalmar con el 1er mes operativo): ${val.saldoFinalUltimoCent} céntimos`);
  console.log(`\n   Revísalo y pégalo en Supabase → SQL Editor.\n`);
}

main().catch((e) => {
  console.error("\n❌ Error inesperado:", e instanceof Error ? e.message : e, "\n");
  process.exit(1);
});
