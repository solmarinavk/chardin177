import { describe, it, expect } from "vitest";
import { crearDbConSchema, sembrarBorrador } from "./helpers/pg";
import junio from "./fixtures/junio_2026.json";

async function emitirJunio() {
  const db = await crearDbConSchema();
  const periodoId = await sembrarBorrador(db, junio, 2026, 6);
  await db.query(`select generar_cuotas($1)`, [periodoId]);
  await db.query(`select emitir_periodo($1)`, [periodoId]);
  return { db, periodoId };
}

describe("ciclo de vida del periodo", () => {
  it("solo permite un periodo en borrador a la vez", async () => {
    const db = await crearDbConSchema();
    await sembrarBorrador(db, junio, 2026, 6);
    await expect(
      db.query(`insert into periodos (anio, mes, estado) values (2026, 7, 'borrador')`),
    ).rejects.toThrow();
    await db.close();
  }, 60000);

  it("un periodo emitido es inmutable (lecturas y recibos bloqueados)", async () => {
    const { db, periodoId } = await emitirJunio();

    await expect(
      db.query(
        `update lecturas_agua set lectura_actual = lectura_actual + 1 where periodo_id = $1`,
        [periodoId],
      ),
    ).rejects.toThrow();

    await expect(
      db.query(
        `update recibos_servicios set monto_cent = 1 where periodo_id = $1 and tipo = 'agua'`,
        [periodoId],
      ),
    ).rejects.toThrow();

    // Y no se pueden recalcular cuotas fuera de borrador.
    await expect(db.query(`select generar_cuotas($1)`, [periodoId])).rejects.toThrow();

    await db.close();
  }, 60000);

  it("registrar pagos actualiza el estado de la cuota (pendiente→parcial→pagado)", async () => {
    const { db, periodoId } = await emitirJunio();

    const c = await db.query<{ id: number; total_cent: number; estado: string }>(
      `select id, total_cent::int as total_cent, estado from cuotas
       where periodo_id = $1 order by dpto_id limit 1`,
      [periodoId],
    );
    const cuota = c.rows[0]!;
    expect(cuota.estado).toBe("pendiente");

    // Pago parcial
    await db.query(
      `insert into pagos (cuota_id, monto_cent, fecha_pago, medio) values ($1, $2, '2026-06-10', 'yape')`,
      [cuota.id, cuota.total_cent - 100],
    );
    let e = await db.query<{ estado: string }>(`select estado from cuotas where id = $1`, [cuota.id]);
    expect(e.rows[0]!.estado).toBe("parcial");

    // Completa el pago
    await db.query(
      `insert into pagos (cuota_id, monto_cent, fecha_pago, medio) values ($1, 100, '2026-06-11', 'efectivo')`,
      [cuota.id],
    );
    e = await db.query<{ estado: string }>(`select estado from cuotas where id = $1`, [cuota.id]);
    expect(e.rows[0]!.estado).toBe("pagado");

    // Borra los pagos → vuelve a pendiente
    await db.query(`delete from pagos where cuota_id = $1`, [cuota.id]);
    e = await db.query<{ estado: string }>(`select estado from cuotas where id = $1`, [cuota.id]);
    expect(e.rows[0]!.estado).toBe("pendiente");

    await db.close();
  }, 60000);

  it("cerrar_periodo cuadra la caja y arrastra el saldo al mes siguiente", async () => {
    const { db, periodoId } = await emitirJunio();

    // Paga dos cuotas completas
    const cuotas = await db.query<{ id: number; total_cent: number }>(
      `select id, total_cent::int as total_cent from cuotas where periodo_id = $1 order by dpto_id limit 2`,
      [periodoId],
    );
    for (const c of cuotas.rows) {
      await db.query(
        `insert into pagos (cuota_id, monto_cent, fecha_pago, medio) values ($1, $2, '2026-06-15', 'transferencia')`,
        [c.id, c.total_cent],
      );
    }

    // Un egreso pagado
    await db.query(
      `insert into egresos (periodo_id, concepto, monto_cent, fecha, pagado) values ($1, 'Vigilancia', 50000, '2026-06-20', true)`,
      [periodoId],
    );

    const ing = cuotas.rows.reduce((a, c) => a + c.total_cent, 0);
    const egr = 50000;
    const esperadoFinal = 0 + ing - egr; // saldo_inicial era 0

    const res = await db.query<{ cerrar_periodo: number }>(`select cerrar_periodo($1)`, [periodoId]);
    const siguienteId = res.rows[0]!.cerrar_periodo;

    const cerrado = await db.query<{ estado: string; saldo_final_cent: number }>(
      `select estado, saldo_final_cent::int as saldo_final_cent from periodos where id = $1`,
      [periodoId],
    );
    expect(cerrado.rows[0]!.estado).toBe("cerrado");
    expect(cerrado.rows[0]!.saldo_final_cent).toBe(esperadoFinal);

    const siguiente = await db.query<{ anio: number; mes: number; saldo_inicial_cent: number }>(
      `select anio, mes, saldo_inicial_cent::int as saldo_inicial_cent from periodos where id = $1`,
      [siguienteId],
    );
    expect(siguiente.rows[0]!.anio).toBe(2026);
    expect(siguiente.rows[0]!.mes).toBe(7);
    expect(siguiente.rows[0]!.saldo_inicial_cent).toBe(esperadoFinal);

    await db.close();
  }, 60000);
});
