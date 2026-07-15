import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import {
  crearDbConSchema,
  actuarComo,
  actuarComoServidor,
} from "./helpers/pg";
import junio from "./fixtures/junio_2026.json";

// Tests de permisos por rol (ROADMAP 0.6 / CLAUDE.md rls.test.ts). Simulan
// usuarios reales con el rol `authenticated` + JWT, exactamente como opera la
// app en producción. Cubren la regresión del bug de producción:
// "stack depth limit exceeded" al crear un periodo (mi_rol() recursivo), y los
// triggers de auditoría/estado que fallaban bajo RLS.

const UID = {
  admin: "00000000-0000-0000-0000-0000000000a1",
  tesoreria: "00000000-0000-0000-0000-0000000000a2",
  porteria: "00000000-0000-0000-0000-0000000000a3",
  residente: "00000000-0000-0000-0000-0000000000a4",
} as const;

let db: PGlite;
let periodoId: number;

beforeAll(async () => {
  db = await crearDbConSchema();
  await db.exec(`
    insert into auth.users (id, email) values
      ('${UID.admin}', 'admin@chardin177.pe'),
      ('${UID.tesoreria}', 'tesoreria@chardin177.pe'),
      ('${UID.porteria}', 'porteria@chardin177.pe'),
      ('${UID.residente}', 'vecinos@chardin177.pe');
    insert into perfiles (user_id, nombre, rol) values
      ('${UID.admin}', 'Administración', 'admin'),
      ('${UID.tesoreria}', 'Tesorería', 'tesoreria'),
      ('${UID.porteria}', 'Portería', 'porteria'),
      ('${UID.residente}', 'Vecinos', 'residente');
  `);
}, 60000);

afterAll(async () => {
  await db?.close();
});

describe("RLS por rol (flujo real del mes)", () => {
  it("tesorería PUEDE crear un periodo (regresión: stack depth limit exceeded)", async () => {
    await actuarComo(db, UID.tesoreria);
    const r = await db.query<{ id: number }>(
      `insert into periodos (anio, mes, estado) values (2026, 6, 'borrador') returning id`,
    );
    periodoId = r.rows[0]!.id;
    expect(periodoId).toBeGreaterThan(0);
    await actuarComoServidor(db);
  });

  it("tesorería PUEDE registrar los recibos del mes", async () => {
    await actuarComo(db, UID.tesoreria);
    await db.query(
      `insert into recibos_servicios (periodo_id, tipo, monto_cent)
       values ($1, 'agua', $2), ($1, 'luz', $3)`,
      [periodoId, junio.recibo_agua_cent, junio.recibo_luz_cent],
    );
    await actuarComoServidor(db);
    const n = await db.query<{ n: number }>(
      `select count(*)::int as n from recibos_servicios where periodo_id = $1`,
      [periodoId],
    );
    expect(n.rows[0]!.n).toBe(2);
  });

  it("portería NO puede crear periodos, recibos ni egresos", async () => {
    await actuarComo(db, UID.porteria);
    await expect(
      db.query(`insert into periodos (anio, mes) values (2030, 1)`),
    ).rejects.toThrow(/row-level security/);
    await expect(
      db.query(
        `insert into recibos_servicios (periodo_id, tipo, monto_cent) values ($1, 'agua', 1)`,
        [periodoId],
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      db.query(
        `insert into egresos (periodo_id, concepto, monto_cent, fecha) values ($1, 'x', 1, '2026-06-01')`,
        [periodoId],
      ),
    ).rejects.toThrow(/row-level security/);
    await actuarComoServidor(db);
  });

  it("portería SÍ puede registrar lecturas y queda en la bitácora (regresión: fn_audit bajo RLS)", async () => {
    await actuarComo(db, UID.porteria);
    for (const d of junio.deptos) {
      await db.query(
        `insert into lecturas_agua (periodo_id, dpto_id, lectura_anterior, lectura_actual, registrado_por)
         values ($1, $2, $3, $4, $5)`,
        [periodoId, d.dpto, d.lectura_anterior, d.lectura_actual, UID.porteria],
      );
    }
    await actuarComoServidor(db);
    const filas = await db.query<{ n: number }>(
      `select count(*)::int as n from lecturas_agua where periodo_id = $1`,
      [periodoId],
    );
    expect(filas.rows[0]!.n).toBe(10);

    const audit = await db.query<{ n: number }>(
      `select count(*)::int as n from audit_log where tabla = 'lecturas_agua' and usuario = $1`,
      [UID.porteria],
    );
    expect(audit.rows[0]!.n).toBe(10);
  });

  it("residente NO puede escribir nada (lecturas, pagos, egresos, periodos, ajustes)", async () => {
    await actuarComo(db, UID.residente);
    await expect(
      db.query(
        `insert into lecturas_agua (periodo_id, dpto_id, lectura_anterior, lectura_actual) values ($1, 101, 0, 1)`,
        [periodoId],
      ),
    ).rejects.toThrow(/row-level security|unicidad|duplicate/);
    await expect(
      db.query(`insert into periodos (anio, mes) values (2031, 1)`),
    ).rejects.toThrow(/row-level security/);
    await expect(
      db.query(
        `insert into egresos (periodo_id, concepto, monto_cent, fecha) values ($1, 'x', 1, '2026-06-01')`,
        [periodoId],
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      db.query(
        `insert into ajustes (periodo_id, dpto_id, concepto, monto_cent) values ($1, 101, 'x', 1)`,
        [periodoId],
      ),
    ).rejects.toThrow(/row-level security/);
    await actuarComoServidor(db);
  });

  it("tesorería PUEDE correr el motor y emitir (funciones bajo RLS)", async () => {
    await actuarComo(db, UID.tesoreria);
    await db.query(`select generar_cuotas($1)`, [periodoId]);
    const cuotas = await db.query<{ n: number }>(
      `select count(*)::int as n from cuotas where periodo_id = $1`,
      [periodoId],
    );
    expect(cuotas.rows[0]!.n).toBe(10);
    await db.query(`select emitir_periodo($1)`, [periodoId]);
    await actuarComoServidor(db);
    const p = await db.query<{ estado: string }>(
      `select estado from periodos where id = $1`,
      [periodoId],
    );
    expect(p.rows[0]!.estado).toBe("emitido");
  });

  it("tesorería registra un pago y la cuota pasa a 'pagado' (regresión: trigger de estado bajo RLS)", async () => {
    await actuarComo(db, UID.tesoreria);
    const c = await db.query<{ id: number; total_cent: number }>(
      `select id, total_cent::int as total_cent from cuotas
       where periodo_id = $1 order by dpto_id limit 1`,
      [periodoId],
    );
    const cuota = c.rows[0]!;
    await db.query(
      `insert into pagos (cuota_id, monto_cent, fecha_pago, medio, registrado_por)
       values ($1, $2, '2026-06-15', 'yape', $3)`,
      [cuota.id, cuota.total_cent, UID.tesoreria],
    );
    const e = await db.query<{ estado: string }>(
      `select estado from cuotas where id = $1`,
      [cuota.id],
    );
    expect(e.rows[0]!.estado).toBe("pagado");
    await actuarComoServidor(db);
  });

  it("residente NO puede registrar pagos ni tocar cuotas directo", async () => {
    await actuarComo(db, UID.residente);
    const c = await db.query<{ id: number }>(
      `select id from cuotas where periodo_id = $1 order by dpto_id desc limit 1`,
      [periodoId],
    );
    const cuotaId = c.rows[0]!.id;
    await expect(
      db.query(
        `insert into pagos (cuota_id, monto_cent, fecha_pago) values ($1, 1, '2026-06-15')`,
        [cuotaId],
      ),
    ).rejects.toThrow(/row-level security/);

    // UPDATE sin política: no da error, simplemente no afecta ninguna fila.
    await db.query(`update cuotas set estado = 'pagado' where id = $1`, [cuotaId]);
    await actuarComoServidor(db);
    const e = await db.query<{ estado: string }>(
      `select estado from cuotas where id = $1`,
      [cuotaId],
    );
    expect(e.rows[0]!.estado).toBe("pendiente");
  });

  it("la bitácora solo la lee admin (portería ve 0 filas)", async () => {
    await actuarComo(db, UID.porteria);
    const comoPorteria = await db.query<{ n: number }>(
      `select count(*)::int as n from audit_log`,
    );
    expect(comoPorteria.rows[0]!.n).toBe(0);
    await actuarComoServidor(db);

    await actuarComo(db, UID.admin);
    const comoAdmin = await db.query<{ n: number }>(
      `select count(*)::int as n from audit_log`,
    );
    expect(comoAdmin.rows[0]!.n).toBeGreaterThan(0);
    await actuarComoServidor(db);
  });
});
