import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { crearDbConSchema, sembrarBorrador } from "./helpers/pg";
import julio from "./fixtures/julio_2026.json";
import { montoCorreccionCent, conceptoCorreccion } from "@/lib/duplicados";

// El caso real de setiembre 2026: el recibo de Sedapal (S/ 434.40) quedó
// registrado dos veces y el error se descubrió con agosto YA cerrado. Un mes
// cerrado es inmutable, así que el duplicado no se borra: se corrige con una
// línea nueva en el mes abierto. Aquí se verifica que esa corrección deja la
// caja exactamente donde debía estar, sin tocar el mes cerrado.

const SEDAPAL = 43440;

describe("corrección de caja de un mes ya cerrado", () => {
  let db: PGlite;
  let agosto: number;
  let setiembre: number;

  beforeAll(async () => {
    db = await crearDbConSchema();
    agosto = await sembrarBorrador(db, julio as never, 2026, 8);
    await db.query(`select generar_cuotas($1)`, [agosto]);
    await db.query(
      `update periodos set saldo_inicial_cent = 980914 where id = $1`,
      [agosto],
    );
    await db.query(`select emitir_periodo($1)`, [agosto]);

    // Gastos del mes... con el Sedapal cargado dos veces.
    await db.query(
      `insert into egresos (periodo_id, concepto, monto_cent, fecha) values
         ($1,'Quincena vigilancia',75000,'2026-08-16'),
         ($1,'Quincena vigilancia',75000,'2026-08-31'),
         ($1,'Sedapal',$2,'2026-09-04'),
         ($1,'Sedapal',$2,'2026-09-04')`,
      [agosto, SEDAPAL],
    );

    // Se cierra agosto sin haber notado el duplicado.
    const r = await db.query<{ cerrar_periodo: number }>(
      `select cerrar_periodo($1)`,
      [agosto],
    );
    setiembre = r.rows[0]!.cerrar_periodo;
  });

  afterAll(async () => {
    await db.close();
  });

  it("el mes cerrado no deja borrar el duplicado", async () => {
    await expect(
      db.query(
        `delete from egresos where periodo_id = $1 and monto_cent = $2`,
        [agosto, SEDAPAL],
      ),
    ).rejects.toThrow(/cerrado/i);
  });

  it("tampoco deja editarle el monto", async () => {
    await expect(
      db.query(
        `update egresos set monto_cent = 1 where periodo_id = $1 and monto_cent = $2`,
        [agosto, SEDAPAL],
      ),
    ).rejects.toThrow(/cerrado/i);
  });

  it("agosto cerró con el saldo mal: le falta el importe duplicado", async () => {
    const { rows } = await db.query<{ saldo_final_cent: number }>(
      `select saldo_final_cent from periodos where id = $1`,
      [agosto],
    );
    const cobrado = 0; // en este escenario nadie pagó aún
    const esperadoCorrecto = 980914 + cobrado - (75000 * 2 + SEDAPAL);
    expect(rows[0]!.saldo_final_cent).toBe(esperadoCorrecto - SEDAPAL);
  });

  it("setiembre arrastra ese saldo equivocado", async () => {
    const { rows } = await db.query<{ saldo_inicial_cent: number }>(
      `select saldo_inicial_cent from periodos where id = $1`,
      [setiembre],
    );
    const { rows: ago } = await db.query<{ saldo_final_cent: number }>(
      `select saldo_final_cent from periodos where id = $1`,
      [agosto],
    );
    expect(rows[0]!.saldo_inicial_cent).toBe(ago[0]!.saldo_final_cent);
  });

  it("la corrección en el mes abierto devuelve la plata y cuadra la caja", async () => {
    await db.query(
      `insert into egresos (periodo_id, concepto, monto_cent, fecha, pagado)
       values ($1, $2, $3, '2026-09-05', true)`,
      [
        setiembre,
        conceptoCorreccion("Sedapal de agosto registrado dos veces"),
        montoCorreccionCent("devolver", SEDAPAL),
      ],
    );

    const { rows } = await db.query<{
      inicial: number;
      egresos: number;
    }>(
      `select p.saldo_inicial_cent as inicial,
              coalesce((select sum(monto_cent) from egresos where periodo_id = p.id and pagado), 0)::int as egresos
         from periodos p where p.id = $1`,
      [setiembre],
    );

    const saldoReal = rows[0]!.inicial - rows[0]!.egresos;
    const saldoQueDeberia = 980914 - (75000 * 2 + SEDAPAL);
    expect(saldoReal).toBe(saldoQueDeberia);
  });

  it("el mes cerrado quedó intacto: sigue teniendo las dos filas", async () => {
    const { rows } = await db.query<{ n: number }>(
      `select count(*)::int as n from egresos where periodo_id = $1 and monto_cent = $2`,
      [agosto, SEDAPAL],
    );
    expect(rows[0]!.n).toBe(2);
  });

  it("la corrección se distingue en el libro por su concepto", async () => {
    const { rows } = await db.query<{ concepto: string; monto_cent: number }>(
      `select concepto, monto_cent from egresos where periodo_id = $1 and monto_cent < 0`,
      [setiembre],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.concepto).toMatch(/^Corrección:/);
    expect(rows[0]!.monto_cent).toBe(-SEDAPAL);
  });

  it("un egreso de 0 sigue prohibido", async () => {
    await expect(
      db.query(
        `insert into egresos (periodo_id, concepto, monto_cent, fecha)
         values ($1, 'nada', 0, '2026-09-05')`,
        [setiembre],
      ),
    ).rejects.toThrow();
  });
});
