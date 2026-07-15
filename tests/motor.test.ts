import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import junio from "./fixtures/junio_2026.json";
import julio from "./fixtures/julio_2026.json";

// Test dorado del motor de cálculo (ROADMAP 1.5). Corre la función real
// `generar_cuotas` de supabase/schema.sql contra un Postgres embebido (pglite),
// cargando los datos reales del edificio y comparando cuota por cuota.
//
// Regla de tolerancia (CLAUDE.md #7): 1 céntimo por dpto, salvo el dpto de
// mayor consumo (que absorbe el residuo de redondeo del agua), hasta 5 céntimos.
// Además la suma de cuotas debe cuadrar EXACTA con recibos + fijas + extras.

// Stub del esquema `auth` de Supabase (no existe en pglite) y de los roles que
// usan las políticas RLS del schema.
const PRELUDE = `
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text
);
create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role; end if;
end $$;
`;

const schemaSql = readFileSync(
  fileURLToPath(new URL("../supabase/schema.sql", import.meta.url)),
  "utf8",
);

type Fixture = typeof junio;
type FilaCuota = {
  dpto_id: number;
  agua_consumo_cent: number;
  total_cent: number;
};

// dpto que absorbe el residuo: mayor Δm3, empate → menor dpto_id (como el motor).
function dptoMayorConsumo(f: Fixture): number {
  let mejor = f.deptos[0]!;
  for (const d of f.deptos) {
    const varD = d.lectura_actual - d.lectura_anterior;
    const varMejor = mejor.lectura_actual - mejor.lectura_anterior;
    if (varD > varMejor || (varD === varMejor && d.dpto < mejor.dpto)) mejor = d;
  }
  return mejor.dpto;
}

async function correrMotor(f: Fixture, anio: number, mes: number): Promise<FilaCuota[]> {
  const db = new PGlite();
  await db.exec(PRELUDE);
  await db.exec(schemaSql);

  const per = await db.query<{ id: number }>(
    `insert into periodos (anio, mes, estado, saldo_inicial_cent)
     values ($1, $2, 'borrador', 0) returning id`,
    [anio, mes],
  );
  const periodoId = per.rows[0]!.id;

  await db.query(
    `insert into recibos_servicios (periodo_id, tipo, monto_cent)
     values ($1, 'agua', $2), ($1, 'luz', $3)`,
    [periodoId, f.recibo_agua_cent, f.recibo_luz_cent],
  );

  for (const d of f.deptos) {
    await db.query(
      `insert into lecturas_agua (periodo_id, dpto_id, lectura_anterior, lectura_actual)
       values ($1, $2, $3, $4)`,
      [periodoId, d.dpto, d.lectura_anterior, d.lectura_actual],
    );
  }

  // El "extra" del fixture se modela como ajustes con origen 'cuota_extra'.
  if (f.extra_dpto_cent !== 0) {
    for (const d of f.deptos) {
      await db.query(
        `insert into ajustes (periodo_id, dpto_id, concepto, monto_cent, origen)
         values ($1, $2, 'Cuota extra del mes', $3, 'cuota_extra')`,
        [periodoId, d.dpto, f.extra_dpto_cent],
      );
    }
  }

  await db.query(`select generar_cuotas($1)`, [periodoId]);

  const cuotas = await db.query<FilaCuota>(
    `select dpto_id, agua_consumo_cent::int as agua_consumo_cent, total_cent::int as total_cent
     from cuotas where periodo_id = $1 order by dpto_id`,
    [periodoId],
  );
  await db.close();
  return cuotas.rows;
}

function pruebasFixture(nombre: string, f: Fixture, anio: number, mes: number) {
  describe(`generar_cuotas · ${nombre}`, () => {
    let filas: FilaCuota[];
    const porDpto = new Map<number, FilaCuota>();
    const maxDpto = dptoMayorConsumo(f);

    beforeAll(async () => {
      filas = await correrMotor(f, anio, mes);
      for (const c of filas) porDpto.set(c.dpto_id, c);
    }, 60000);

    it("genera exactamente 10 cuotas", () => {
      expect(filas).toHaveLength(10);
    });

    it("agua consumo por dpto coincide (1c; 5c en el de mayor consumo)", () => {
      for (const d of f.deptos) {
        const fila = porDpto.get(d.dpto)!;
        const tol = d.dpto === maxDpto ? 5 : 1;
        expect(
          Math.abs(fila.agua_consumo_cent - d.esperado.agua_consumo_cent),
          `agua dpto ${d.dpto}`,
        ).toBeLessThanOrEqual(tol);
      }
    });

    it("total por dpto coincide con el Excel (1c; 5c en el de mayor consumo)", () => {
      for (const d of f.deptos) {
        const fila = porDpto.get(d.dpto)!;
        const tol = d.dpto === maxDpto ? 5 : 1;
        expect(
          Math.abs(fila.total_cent - d.esperado.total_cent),
          `total dpto ${d.dpto}`,
        ).toBeLessThanOrEqual(tol);
      }
    });

    it("invariante #1: Σ agua (consumo + común) = recibo de agua", () => {
      const sumaAgua = filas.reduce(
        (acc, c) => acc + c.agua_consumo_cent,
        0,
      );
      // agua común es 1500 por dpto × 10; consumo reparte (recibo − común total)
      expect(sumaAgua + f.agua_comun_dpto_cent * 10).toBe(f.recibo_agua_cent);
    });

    it("invariante #2: Σ totales = recibos + fijas + extras (exacto al céntimo)", () => {
      const sumaTotales = filas.reduce((acc, c) => acc + c.total_cent, 0);
      const derecha =
        f.recibo_agua_cent +
        f.recibo_luz_cent +
        f.vigilancia_total_cent +
        f.manto_total_cent +
        f.materiales_dpto_cent * 10 +
        f.extra_dpto_cent * 10;
      expect(sumaTotales).toBe(derecha);
    });
  });
}

pruebasFixture("junio 2026", junio, 2026, 6);
pruebasFixture("julio 2026", julio, 2026, 7);
