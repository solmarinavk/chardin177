import { describe, it, expect } from "vitest";
import { crearDbConSchema, sembrarBorrador } from "./helpers/pg";
import junio from "./fixtures/junio_2026.json";
import julio from "./fixtures/julio_2026.json";

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

  it("caja real: un pago atrasado de un mes cerrado entra al cierre del mes siguiente", async () => {
    const db = await crearDbConSchema();

    // Junio: emitir, pagar UNA cuota completa y cerrar.
    const junioId = await sembrarBorrador(db, junio, 2026, 6);
    await db.query(`select generar_cuotas($1)`, [junioId]);
    await db.query(`select emitir_periodo($1)`, [junioId]);

    const cuotasJunio = await db.query<{ id: number; total_cent: number }>(
      `select id, total_cent::int as total_cent from cuotas where periodo_id = $1 order by dpto_id`,
      [junioId],
    );
    const pagadaJunio = cuotasJunio.rows[0]!;
    const morosaJunio = cuotasJunio.rows[1]!;
    await db.query(
      `insert into pagos (cuota_id, monto_cent, fecha_pago, medio) values ($1, $2, '2026-06-15', 'yape')`,
      [pagadaJunio.id, pagadaJunio.total_cent],
    );

    const cierreJunio = await db.query<{ cerrar_periodo: number }>(
      `select cerrar_periodo($1)`,
      [junioId],
    );
    const julioId = cierreJunio.rows[0]!.cerrar_periodo;
    const saldoJunio = pagadaJunio.total_cent; // inicial 0 + 1 pago − 0 egresos

    // El pago de junio quedó contabilizado en el cierre de junio.
    const contab = await db.query<{ n: number }>(
      `select count(*)::int as n from pagos where contabilizado_en_periodo = $1`,
      [junioId],
    );
    expect(contab.rows[0]!.n).toBe(1);

    // Julio (creado por el cierre, con saldo arrastrado): completarlo y emitirlo.
    for (const d of julio.deptos) {
      await db.query(
        `insert into lecturas_agua (periodo_id, dpto_id, lectura_anterior, lectura_actual)
         values ($1, $2, $3, $4)`,
        [julioId, d.dpto, d.lectura_anterior, d.lectura_actual],
      );
    }
    await db.query(
      `insert into recibos_servicios (periodo_id, tipo, monto_cent) values ($1,'agua',$2), ($1,'luz',$3)`,
      [julioId, julio.recibo_agua_cent, julio.recibo_luz_cent],
    );
    await db.query(`select generar_cuotas($1)`, [julioId]);
    await db.query(`select emitir_periodo($1)`, [julioId]);

    // El moroso de JUNIO paga en julio (junio ya está cerrado): permitido.
    await db.query(
      `insert into pagos (cuota_id, monto_cent, fecha_pago, medio) values ($1, $2, '2026-07-20', 'transferencia')`,
      [morosaJunio.id, morosaJunio.total_cent],
    );
    // Y una cuota de julio también se paga.
    const cuotaJulio = await db.query<{ id: number; total_cent: number }>(
      `select id, total_cent::int as total_cent from cuotas where periodo_id = $1 order by dpto_id limit 1`,
      [julioId],
    );
    await db.query(
      `insert into pagos (cuota_id, monto_cent, fecha_pago, medio) values ($1, $2, '2026-07-21', 'yape')`,
      [cuotaJulio.rows[0]!.id, cuotaJulio.rows[0]!.total_cent],
    );

    // Cerrar julio: la caja recoge el pago atrasado de junio + el de julio.
    await db.query(`select cerrar_periodo($1)`, [julioId]);
    const julioCerrado = await db.query<{ saldo_final_cent: number }>(
      `select saldo_final_cent::int as saldo_final_cent from periodos where id = $1`,
      [julioId],
    );
    expect(julioCerrado.rows[0]!.saldo_final_cent).toBe(
      saldoJunio + morosaJunio.total_cent + cuotaJulio.rows[0]!.total_cent,
    );

    await db.close();
  }, 60000);

  it("un pago ya contabilizado en un cierre es inmutable", async () => {
    const db = await crearDbConSchema();
    const junioId = await sembrarBorrador(db, junio, 2026, 6);
    await db.query(`select generar_cuotas($1)`, [junioId]);
    await db.query(`select emitir_periodo($1)`, [junioId]);

    const cuota = await db.query<{ id: number; total_cent: number }>(
      `select id, total_cent::int as total_cent from cuotas where periodo_id = $1 limit 1`,
      [junioId],
    );
    await db.query(
      `insert into pagos (cuota_id, monto_cent, fecha_pago) values ($1, $2, '2026-06-15')`,
      [cuota.rows[0]!.id, cuota.rows[0]!.total_cent],
    );
    await db.query(`select cerrar_periodo($1)`, [junioId]);

    await expect(
      db.query(`delete from pagos where cuota_id = $1`, [cuota.rows[0]!.id]),
    ).rejects.toThrow(/ya entró al cierre/);
    await expect(
      db.query(`update pagos set monto_cent = 1 where cuota_id = $1`, [cuota.rows[0]!.id]),
    ).rejects.toThrow(/ya entró al cierre/);

    await db.close();
  }, 60000);

  it("no se pueden registrar ni tocar egresos de un periodo cerrado", async () => {
    const db = await crearDbConSchema();
    const junioId = await sembrarBorrador(db, junio, 2026, 6);
    await db.query(`select generar_cuotas($1)`, [junioId]);
    await db.query(`select emitir_periodo($1)`, [junioId]);

    // En emitido SÍ se puede registrar egresos.
    await db.query(
      `insert into egresos (periodo_id, concepto, monto_cent, fecha, pagado) values ($1, 'Vigilancia junio', 50000, '2026-06-20', true)`,
      [junioId],
    );

    await db.query(`select cerrar_periodo($1)`, [junioId]);

    await expect(
      db.query(
        `insert into egresos (periodo_id, concepto, monto_cent, fecha) values ($1, 'tarde', 1, '2026-07-01')`,
        [junioId],
      ),
    ).rejects.toThrow(/ya está cerrado/);
    await expect(
      db.query(`update egresos set monto_cent = 1 where periodo_id = $1`, [junioId]),
    ).rejects.toThrow(/ya está cerrado/);
    await expect(
      db.query(`delete from egresos where periodo_id = $1`, [junioId]),
    ).rejects.toThrow(/ya está cerrado/);

    await db.close();
  }, 60000);
});
