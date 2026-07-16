import { describe, it, expect, beforeAll } from "vitest";
import { crearDbConSchema, sembrarBorrador } from "./helpers/pg";
import junio from "./fixtures/junio_2026.json";
import julio from "./fixtures/julio_2026.json";

// Test dorado del motor de cálculo (ROADMAP 1.5). Corre la función real
// `generar_cuotas` de supabase/schema.sql contra un Postgres embebido (pglite),
// cargando los datos reales del edificio y comparando cuota por cuota.
//
// Regla de tolerancia (CLAUDE.md #7): 1 céntimo por dpto, salvo el dpto de
// mayor consumo (que absorbe el residuo de redondeo del agua), hasta 5 céntimos.
// Además la suma de cuotas debe cuadrar EXACTA con recibos + fijas + extras.

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
  const db = await crearDbConSchema();
  const periodoId = await sembrarBorrador(db, f, anio, mes);

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
