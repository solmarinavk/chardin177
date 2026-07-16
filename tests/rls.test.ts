import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import {
  crearDbConSchema,
  actuarComo,
  actuarComoAnon,
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

  it("anular pago: residente NO puede (silencioso), tesorería SÍ y la cuota vuelve a pendiente", async () => {
    const pago = await db.query<{ id: number; cuota_id: number }>(
      `select id, cuota_id from pagos limit 1`,
    );
    const { id: pagoId, cuota_id: cuotaId } = pago.rows[0]!;

    // Residente: DELETE sin política no da error, simplemente no borra nada.
    await actuarComo(db, UID.residente);
    await db.query(`delete from pagos where id = $1`, [pagoId]);
    await actuarComoServidor(db);
    const sigue = await db.query<{ n: number }>(
      `select count(*)::int as n from pagos where id = $1`,
      [pagoId],
    );
    expect(sigue.rows[0]!.n).toBe(1);

    // Tesorería: sí puede anular y el trigger recalcula el estado.
    await actuarComo(db, UID.tesoreria);
    await db.query(`delete from pagos where id = $1`, [pagoId]);
    await actuarComoServidor(db);
    const borrado = await db.query<{ n: number }>(
      `select count(*)::int as n from pagos where id = $1`,
      [pagoId],
    );
    expect(borrado.rows[0]!.n).toBe(0);
    const estado = await db.query<{ estado: string }>(
      `select estado from cuotas where id = $1`,
      [cuotaId],
    );
    expect(estado.rows[0]!.estado).toBe("pendiente");
  });

  it("constancias: el residente sube la suya, no a nombre de otro; solo tesorería confirma (3.7)", async () => {
    // El residente sube su propia constancia (creado_por = su uid) → OK.
    await actuarComo(db, UID.residente);
    const ins = await db.query<{ id: number }>(
      `insert into constancias_pago (periodo_id, dpto_id, monto_cent, creado_por)
       values ($1, 101, 45813, $2) returning id`,
      [periodoId, UID.residente],
    );
    const constanciaId = ins.rows[0]!.id;
    expect(constanciaId).toBeGreaterThan(0);

    // No puede subir una constancia a nombre de otro (creado_por != auth.uid()).
    await expect(
      db.query(
        `insert into constancias_pago (periodo_id, dpto_id, creado_por) values ($1, 102, $2)`,
        [periodoId, UID.admin],
      ),
    ).rejects.toThrow(/row-level security/);

    // El residente NO puede confirmar (update sin política → 0 filas, sin efecto).
    await db.query(
      `update constancias_pago set estado = 'confirmada' where id = $1`,
      [constanciaId],
    );
    await actuarComoServidor(db);
    let estado = await db.query<{ estado: string }>(
      `select estado from constancias_pago where id = $1`,
      [constanciaId],
    );
    expect(estado.rows[0]!.estado).toBe("pendiente");

    // Tesorería SÍ confirma.
    await actuarComo(db, UID.tesoreria);
    await db.query(
      `update constancias_pago set estado = 'confirmada' where id = $1`,
      [constanciaId],
    );
    await actuarComoServidor(db);
    estado = await db.query<{ estado: string }>(
      `select estado from constancias_pago where id = $1`,
      [constanciaId],
    );
    expect(estado.rows[0]!.estado).toBe("confirmada");
  });

  it("PÚBLICO (anon): lee transparencia, NO lee datos personales y NO escribe (0008)", async () => {
    // Conteos como servidor para comparar.
    const suCuotas = (await db.query<{ n: number }>(`select count(*)::int as n from cuotas`)).rows[0]!.n;
    const suPagos = (await db.query<{ n: number }>(`select count(*)::int as n from pagos`)).rows[0]!.n;
    expect(suCuotas).toBeGreaterThan(0); // hay un periodo emitido con cuotas

    await actuarComoAnon(db);

    // LEE las tablas de transparencia igual que el servidor (acceso completo).
    const anCuotas = (await db.query<{ n: number }>(`select count(*)::int as n from cuotas`)).rows[0]!.n;
    const anPagos = (await db.query<{ n: number }>(`select count(*)::int as n from pagos`)).rows[0]!.n;
    const anEgresos = (await db.query<{ n: number }>(`select count(*)::int as n from egresos`)).rows[0]!.n;
    expect(anCuotas).toBe(suCuotas);
    expect(anPagos).toBe(suPagos);
    expect(anEgresos).toBeGreaterThanOrEqual(0);

    // NO ve datos personales (RLS sin política anon → 0 filas).
    const perf = await db.query<{ n: number }>(`select count(*)::int as n from perfiles`);
    expect(perf.rows[0]!.n).toBe(0);
    const aud = await db.query<{ n: number }>(`select count(*)::int as n from audit_log`);
    expect(aud.rows[0]!.n).toBe(0);
    const con = await db.query<{ n: number }>(`select count(*)::int as n from constancias_pago`);
    expect(con.rows[0]!.n).toBe(0);

    // NO escribe nada.
    const unaCuota = await db.query<{ id: number }>(`select id from cuotas limit 1`);
    await actuarComoServidor(db);
    const cuotaId = unaCuota.rows[0]!.id;
    await actuarComoAnon(db);
    await expect(
      db.query(
        `insert into pagos (cuota_id, monto_cent, fecha_pago) values ($1, 1, '2026-06-15')`,
        [cuotaId],
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      db.query(
        `insert into egresos (periodo_id, concepto, monto_cent, fecha) values ($1, 'x', 1, '2026-06-01')`,
        [periodoId],
      ),
    ).rejects.toThrow(/row-level security/);

    // NO ejecuta el motor / emisión / cierre (execute revocado a anon).
    await expect(db.query(`select emitir_periodo($1)`, [periodoId])).rejects.toThrow(
      /permission denied|no autoriz/i,
    );
    await expect(db.query(`select cerrar_periodo($1)`, [periodoId])).rejects.toThrow(
      /permission denied|no autoriz/i,
    );

    await actuarComoServidor(db);
  });

  it("cuotas fijas: solo admin las versiona; tesorería NO; queda en la bitácora (CF)", async () => {
    // Admin crea una versión nueva → OK.
    await actuarComo(db, UID.admin);
    const ins = await db.query<{ id: number }>(
      `insert into cuotas_fijas (vigente_desde, vigilancia_total_cent, manto_total_cent, materiales_dpto_cent, agua_comun_dpto_cent)
       values ('2026-08-01', 210000, 140000, 2000, 1500) returning id`,
    );
    expect(ins.rows[0]!.id).toBeGreaterThan(0);
    await actuarComoServidor(db);

    // Tesorería NO puede versionar cuotas fijas (w_fijas es admin).
    await actuarComo(db, UID.tesoreria);
    await expect(
      db.query(
        `insert into cuotas_fijas (vigente_desde, vigilancia_total_cent, manto_total_cent, materiales_dpto_cent, agua_comun_dpto_cent)
         values ('2026-09-01', 1, 1, 1, 1)`,
      ),
    ).rejects.toThrow(/row-level security/);
    await actuarComoServidor(db);

    // La versión del admin quedó registrada en la bitácora.
    const audit = await db.query<{ n: number }>(
      `select count(*)::int as n from audit_log where tabla = 'cuotas_fijas' and accion = 'INSERT'`,
    );
    expect(audit.rows[0]!.n).toBeGreaterThanOrEqual(1);
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
