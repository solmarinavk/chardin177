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
 *   # opciones:
 *   #   --hasta 2026-06      solo hasta ese mes inclusive (excluye los posteriores)
 *   #   --empalmar 2026-07   además, fija el saldo inicial de ese periodo ya
 *   #                        existente con el saldo final del último mes histórico
 *   npm run migrar:excel -- ./Chardin_177_Historico.xlsx historico.sql --hasta 2026-06 --empalmar 2026-07
 *
 * Los montos del Excel están en SOLES; aquí se pasan a céntimos enteros.
 */
import ExcelJS from "exceljs";
import { writeFileSync } from "node:fs";
import { aCentimos } from "../lib/centimos";
import {
  validarMigracion,
  generarSqlMigracion,
  type FilaCuotaHist,
  type SaldoMesHist,
  type Empalme,
} from "../lib/migracion";

// ————————————————— CONFIG (ajusta si tus encabezados difieren) —————————————————
const HOJA_CUOTAS = "Cuotas";
const HOJA_CAJA = "Caja";

const ALIAS = {
  anio: ["anio", "año", "ano", "year"],
  mes: ["mes", "month"],
  periodo: ["periodo", "período", "fecha", "mes/año", "mes-año"],
  dpto: ["dpto", "departamento", "depto", "unidad"],
  total: ["total", "cuota", "monto", "importe"],
  saldoInicial: ["saldo inicial", "saldo_inicial", "inicial", "saldo anterior"],
  saldoFinal: ["saldo final", "saldo_final", "final", "saldo cierre"],
};
// ———————————————————————————————————————————————————————————————————————————————

const MESES_ES: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7,
  agosto: 8, setiembre: 9, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

const normal = (s: string) =>
  s.toString().trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

type Mapa = Map<string, number>;

function encabezados(ws: ExcelJS.Worksheet): Mapa {
  const mapa: Mapa = new Map();
  ws.getRow(1).eachCell((cell, col) => {
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
  if (typeof v === "object" && v && "result" in v)
    return numeroCelda((v as { result: ExcelJS.CellValue }).result);
  const limpio = String(v).replace(/[^0-9.,-]/g, "").replace(/,/g, "");
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

// Mes desde una celda: número (1-12) o nombre en español ("Febrero", "Setiembre").
function mesNumero(v: ExcelJS.CellValue): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = numeroCelda(v);
  if (n !== null && Number.isInteger(n) && n >= 1 && n <= 12) return n;
  return MESES_ES[normal(String(v))] ?? null;
}

function centimosCelda(v: ExcelJS.CellValue): number | null {
  const n = numeroCelda(v);
  return n === null ? null : aCentimos(n);
}

const orden = (anio: number, mes: number) => anio * 12 + mes;

function leerMes(
  fila: ExcelJS.Row,
  colAnio: number | null,
  colMes: number | null,
  colPeriodo: number | null,
): { anio: number; mes: number } | null {
  if (colAnio && colMes) {
    const a = numeroCelda(fila.getCell(colAnio).value);
    const m = mesNumero(fila.getCell(colMes).value);
    if (a && m) return { anio: a, mes: m };
  }
  if (colPeriodo) {
    const cell = fila.getCell(colPeriodo).value;
    if (cell instanceof Date) return { anio: cell.getUTCFullYear(), mes: cell.getUTCMonth() + 1 };
    const s = String(cell ?? "").trim();
    let m = /(\d{4})[-/](\d{1,2})/.exec(s);
    if (m) return { anio: Number(m[1]), mes: Number(m[2]) };
    m = /(\d{1,2})[-/](\d{4})/.exec(s);
    if (m) return { anio: Number(m[2]), mes: Number(m[1]) };
  }
  return null;
}

// AAAA-MM → {anio, mes}
function parseMesFlag(s: string | undefined, nombre: string): Empalme | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{1,2})$/.exec(s.trim());
  if (!m) abortar(`${nombre} inválido: "${s}". Usa AAAA-MM (ej. 2026-06).`);
  return { anio: Number(m![1]), mes: Number(m![2]) };
}

async function main() {
  // Parseo de argumentos: posicionales (ruta, salida) + flags.
  const args = process.argv.slice(2);
  const posic: string[] = [];
  let hastaStr: string | undefined;
  let empalmarStr: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === "--hasta") hastaStr = args[++i];
    else if (a.startsWith("--hasta=")) hastaStr = a.slice(8);
    else if (a === "--empalmar") empalmarStr = args[++i];
    else if (a.startsWith("--empalmar=")) empalmarStr = a.slice(11);
    else posic.push(a);
  }
  const ruta = posic[0];
  const salida = posic[1] ?? "historico_generado.sql";
  if (!ruta) abortar("Falta la ruta del Excel. Uso: npm run migrar:excel -- ./Chardin_177_Historico.xlsx");

  const hasta = parseMesFlag(hastaStr, "--hasta");
  const empalmar = parseMesFlag(empalmarStr, "--empalmar");
  const dentroDelCorte = (anio: number, mes: number) =>
    !hasta || orden(anio, mes) <= orden(hasta.anio, hasta.mes);

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
    abortar(`En "${HOJA_CUOTAS}" faltan columnas. Vi: [${[...hc.keys()].join(", ")}].`);

  let excluidasCuotas = 0;
  const cuotas: FilaCuotaHist[] = [];
  wsCuotas!.eachRow((fila, n) => {
    if (n === 1) return;
    const mes = leerMes(fila, cAnio, cMes, cPer);
    const dpto = numeroCelda(fila.getCell(cDpto!).value);
    const total = centimosCelda(fila.getCell(cTotal!).value);
    if (!mes || !dpto || total === null) return;
    if (!dentroDelCorte(mes.anio, mes.mes)) {
      excluidasCuotas++;
      return;
    }
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
    abortar(`En "${HOJA_CAJA}" faltan columnas. Vi: [${[...hj.keys()].join(", ")}].`);

  const caja = new Map<number, { anio: number; mes: number; ini: number | null; fin: number }>();
  let excluidasCaja = 0;
  wsCaja!.eachRow((fila, n) => {
    if (n === 1) return;
    const mes = leerMes(fila, jAnio, jMes, jPer);
    const fin = centimosCelda(fila.getCell(jFin!).value);
    if (!mes || fin === null) return;
    if (!dentroDelCorte(mes.anio, mes.mes)) {
      excluidasCaja++;
      return;
    }
    const ini = jIni ? centimosCelda(fila.getCell(jIni).value) : null;
    caja.set(orden(mes.anio, mes.mes), { anio: mes.anio, mes: mes.mes, ini, fin });
  });

  // ——— Periodos = unión de meses con cuotas y meses con caja ———
  const clavesMeses = new Set<number>([
    ...cuotas.map((c) => orden(c.anio, c.mes)),
    ...caja.keys(),
  ]);
  const meses: SaldoMesHist[] = [...clavesMeses]
    .sort((a, b) => a - b)
    .map((k) => {
      const anio = Math.floor((k - 1) / 12);
      const mes = k - anio * 12;
      const c = caja.get(k);
      return {
        anio,
        mes,
        saldo_inicial_cent: c ? c.ini : null,
        saldo_final_cent: c ? c.fin : null,
      };
    });

  // ——— Validar ———
  const val = validarMigracion({ meses, cuotas });
  console.log(`\n📄 Leído: ${val.totalMeses} periodos, ${val.totalCuotas} cuotas.`);
  if (hasta) console.log(`   Corte en ${hasta.anio}-${String(hasta.mes).padStart(2, "0")}: excluí ${excluidasCuotas} cuotas y ${excluidasCaja} filas de caja posteriores.`);
  const conCaja = meses.filter((m) => m.saldo_final_cent !== null).length;
  console.log(`   Periodos con saldo de caja: ${conCaja}; sin caja (saldos null): ${meses.length - conCaja}.`);
  if (val.advertencias.length) {
    console.log("\n⚠️  Advertencias (no bloquean):");
    for (const a of val.advertencias.slice(0, 12)) console.log("   - " + a);
    if (val.advertencias.length > 12) console.log(`   … y ${val.advertencias.length - 12} más.`);
  }
  if (!val.ok) {
    console.error("\n❌ Errores que BLOQUEAN la migración (no se generó nada):");
    for (const e of val.errores) console.error("   - " + e);
    process.exit(1);
  }

  const sql = generarSqlMigracion({ meses, cuotas }, empalmar ? { empalmarCon: empalmar } : {});
  writeFileSync(salida, sql, "utf8");

  console.log(`\n✅ SQL generado: ${salida}`);
  console.log(`   Último mes histórico: ${val.ultimoMes?.mes}/${val.ultimoMes?.anio}`);
  console.log(`   Saldo final para el empalme: ${val.saldoFinalUltimoCent} céntimos (S/ ${((val.saldoFinalUltimoCent ?? 0) / 100).toFixed(2)})`);
  if (empalmar) console.log(`   Fijará el saldo inicial de ${empalmar.anio}-${String(empalmar.mes).padStart(2, "0")} (no lo duplica: es un UPDATE).`);
  console.log(`\n   Revísalo y pégalo en Supabase → SQL Editor.\n`);
}

main().catch((e) => {
  console.error("\n❌ Error inesperado:", e instanceof Error ? e.message : e, "\n");
  process.exit(1);
});
