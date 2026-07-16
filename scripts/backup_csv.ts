/**
 * Backup semanal (tarea 4.3): exporta todas las tablas a CSV.
 *
 * Lo corre la GitHub Action .github/workflows/backup.yml (semanal), que luego
 * sube los CSV a la rama `backups`. Usa la SERVICE ROLE key (lee todo, salta
 * RLS) — por eso solo corre en el servidor de CI o en tu compu, NUNCA en el
 * navegador.
 *
 * Uso local:  npx tsx scripts/backup_csv.ts ./carpeta_salida
 */
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import type { Database } from "../lib/database.types";

loadEnv({ path: ".env.local" }); // en local; en CI las llaves vienen del entorno

const URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("\n❌ Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY.\n");
  process.exit(1);
}

// Todas las tablas del dominio (el backup es un volcado completo).
const TABLAS = [
  "departamentos",
  "perfiles",
  "residentes",
  "cuotas_fijas",
  "periodos",
  "lecturas_agua",
  "recibos_servicios",
  "ajustes",
  "cuotas",
  "pagos",
  "categorias_egreso",
  "egresos",
  "provisiones",
  "movimientos_provision",
  "conciliaciones_agua",
  "documentos",
  "constancias_pago",
  "audit_log",
] as const;

const OUT = process.argv[2] ?? "backup_csv";

function celdaCSV(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function aCSV(filas: Array<Record<string, unknown>>): string {
  if (filas.length === 0) return "";
  const cols = Object.keys(filas[0]!);
  const encabezado = cols.join(",");
  const cuerpo = filas
    .map((f) => cols.map((c) => celdaCSV(f[c])).join(","))
    .join("\n");
  return `${encabezado}\n${cuerpo}\n`;
}

async function main() {
  const s = createClient<Database>(URL!, KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  mkdirSync(OUT, { recursive: true });

  let ok = 0;
  for (const t of TABLAS) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await s.from(t as any).select("*");
    if (error) {
      console.error(`⚠️  ${t}: ${error.message}`);
      continue;
    }
    const filas = (data ?? []) as unknown as Array<Record<string, unknown>>;
    writeFileSync(`${OUT}/${t}.csv`, aCSV(filas), "utf8");
    console.log(`✅ ${t}: ${filas.length} filas`);
    ok += 1;
  }
  console.log(`\nBackup listo en ${OUT} (${ok}/${TABLAS.length} tablas).\n`);
}

main().catch((e) => {
  console.error("\n❌ Error inesperado:", e instanceof Error ? e.message : e, "\n");
  process.exit(1);
});
