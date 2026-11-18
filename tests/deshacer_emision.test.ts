import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import {
  crearDbConSchema,
  sembrarBorrador,
  actuarComo,
  actuarComoServidor,
} from "./helpers/pg";
import junio from "./fixtures/junio_2026.json";
import { avisoConsumo } from "@/lib/revision-cuotas";

// 6.11 · Deshacer la emisión mientras nadie haya pagado. Reproduce lo del
// 17/11/2026 de punta a punta contra el esquema real: lecturas en 0 → 10
// cuotas idénticas → tesorería deshace (update permitido por w_periodos) →
// portería corrige → se recalcula (las cuotas viejas quedan en audit_log) →
// se emite de nuevo. Y lo que NO puede pasar: residente/portería deshaciendo,
// y reemplazar cuotas que ya tienen un pago (la clave foránea lo impide).

const UID = {
  tesoreria: "00000000-0000-0000-0000-0000000000b2",
  porteria: "00000000-0000-0000-0000-0000000000b3",
  residente: "00000000-0000-0000-0000-0000000000b4",
} as const;

let db: PGlite;
let periodoId: number;

async function estado(): Promise<{ estado: string; cuotas: number; distintos: number }> {
  await actuarComoServidor(db);
  const r = await db.query<{ estado: string; cuotas: number; distintos: number }>(
    `select p.estado::text as estado,
            (select count(*)::int from cuotas c where c.periodo_id = p.id) as cuotas,
            (select count(distinct total_cent)::int from cuotas c where c.periodo_id = p.id) as distintos
       from periodos p where p.id = $1`,
    [periodoId],
  );
  return r.rows[0]!;
}

beforeAll(async () => {
  db = await crearDbConSchema();
  await db.exec(`
    insert into auth.users (id, email) values
      ('${UID.tesoreria}', 'tesoreria@chardin177.pe'),
      ('${UID.porteria}', 'porteria@chardin177.pe'),
      ('${UID.residente}', 'vecinos@chardin177.pe');
    insert into perfiles (user_id, nombre, rol) values
      ('${UID.tesoreria}', 'Tesorería', 'tesoreria'),
      ('${UID.porteria}', 'Portería', 'porteria'),
      ('${UID.residente}', 'Vecinos', 'residente');
  `);
  // Noviembre "real": lecturas con la actual igual a la anterior (consumo 0).
  periodoId = await sembrarBorrador(db, junio as never, 2026, 11);
  await db.query(
    `update lecturas_agua set lectura_actual = lectura_anterior where periodo_id = $1`,
    [periodoId],
  );
  await db.query(`select generar_cuotas($1)`, [periodoId]);
  await db.query(`select emitir_periodo($1)`, [periodoId]);
}, 60000);

afterAll(async () => {
  await db?.close();
});

describe("6.11 · deshacer la emisión", () => {
  it("el caso real: emitido con 10 cuotas idénticas, y el aviso lo detecta", async () => {
    expect(await estado()).toEqual({ estado: "emitido", cuotas: 10, distintos: 1 });
    const cuotas = await db.query<{ dpto_id: number; m3_variacion: number }>(
      `select dpto_id, m3_variacion from cuotas where periodo_id = $1`,
      [periodoId],
    );
    expect(avisoConsumo(cuotas.rows)?.nivel).toBe("bloquea");
  });

  it("portería intenta corregir una lectura del mes emitido: candado", async () => {
    await actuarComo(db, UID.porteria);
    await expect(
      db.query(
        `update lecturas_agua set lectura_actual = lectura_actual + 3 where periodo_id = $1 and dpto_id = 101`,
        [periodoId],
      ),
    ).rejects.toThrow(/emitido/);
    await actuarComoServidor(db);
  });

  it("residente y portería NO pueden deshacer la emisión (w_periodos)", async () => {
    for (const uid of [UID.residente, UID.porteria]) {
      await actuarComo(db, uid);
      const r = await db.query(
        `update periodos set estado = 'borrador', emitido_en = null where id = $1 and estado = 'emitido'`,
        [periodoId],
      );
      expect(r.affectedRows ?? 0).toBe(0);
    }
    expect((await estado()).estado).toBe("emitido");
  });

  it("tesorería SÍ: el mes vuelve a preparación con lecturas, recibos y cuotas intactos", async () => {
    await actuarComo(db, UID.tesoreria);
    const r = await db.query(
      `update periodos set estado = 'borrador', emitido_en = null where id = $1 and estado = 'emitido'`,
      [periodoId],
    );
    expect(r.affectedRows).toBe(1);
    expect(await estado()).toEqual({ estado: "borrador", cuotas: 10, distintos: 1 });
    const n = await db.query<{ l: number; r: number; a: number }>(
      `select (select count(*)::int from lecturas_agua where periodo_id = $1) as l,
              (select count(*)::int from recibos_servicios where periodo_id = $1) as r,
              (select count(*)::int from ajustes where periodo_id = $1 and origen = 'cuota_extra') as a`,
      [periodoId],
    );
    expect(n.rows[0]).toEqual({ l: 10, r: 2, a: 10 });
  });

  it("ya en preparación, portería corrige las lecturas con los consumos reales", async () => {
    await actuarComo(db, UID.porteria);
    for (const d of junio.deptos) {
      await db.query(
        `update lecturas_agua set lectura_actual = lectura_anterior + $3, registrado_por = $4
          where periodo_id = $1 and dpto_id = $2`,
        [periodoId, d.dpto, d.lectura_actual - d.lectura_anterior, UID.porteria],
      );
    }
    await actuarComoServidor(db);
    const m3 = await db.query<{ m3: number }>(
      `select sum(lectura_actual - lectura_anterior)::int as m3 from lecturas_agua where periodo_id = $1`,
      [periodoId],
    );
    expect(m3.rows[0]!.m3).toBeGreaterThan(0);
  });

  it("tesorería recalcula: cuotas distintas, mismo total, y las viejas quedan en la bitácora a su nombre", async () => {
    const antes = await db.query<{ t: number }>(
      `select sum(total_cent)::int as t from cuotas where periodo_id = $1`,
      [periodoId],
    );
    await actuarComo(db, UID.tesoreria);
    await db.query(`select generar_cuotas($1)`, [periodoId]);
    const despues = await estado();
    expect(despues).toMatchObject({ estado: "borrador", cuotas: 10 });
    expect(despues.distintos).toBeGreaterThan(1);
    const total = await db.query<{ t: number }>(
      `select sum(total_cent)::int as t from cuotas where periodo_id = $1`,
      [periodoId],
    );
    expect(total.rows[0]!.t).toBe(antes.rows[0]!.t); // recibos + fijas + extra no cambian
    const audit = await db.query<{ n: number }>(
      `select count(*)::int as n from audit_log
        where tabla = 'cuotas' and accion = 'DELETE' and usuario = $1`,
      [UID.tesoreria],
    );
    expect(audit.rows[0]!.n).toBe(10);
  });

  it("y se emite de nuevo", async () => {
    await actuarComo(db, UID.tesoreria);
    await db.query(`select emitir_periodo($1)`, [periodoId]);
    expect((await estado()).estado).toBe("emitido");
  });

  it("con un pago registrado, la base impide reemplazar las cuotas aunque el mes vuelva a borrador", async () => {
    await actuarComo(db, UID.tesoreria);
    await db.query(
      `insert into pagos (cuota_id, monto_cent, fecha_pago)
       select id, total_cent, '2026-11-18' from cuotas where periodo_id = $1 and dpto_id = 101`,
      [periodoId],
    );
    // La app no lo permitiría (cuenta los pagos antes); aun si lo hiciera:
    await db.query(
      `update periodos set estado = 'borrador', emitido_en = null where id = $1`,
      [periodoId],
    );
    await expect(db.query(`select generar_cuotas($1)`, [periodoId])).rejects.toThrow(
      /foreign key|pagos/i,
    );
    await actuarComoServidor(db);
    // Nada se perdió: 10 cuotas, el pago sigue ahí.
    expect((await estado()).cuotas).toBe(10);
    const pagos = await db.query<{ n: number }>(
      `select count(*)::int as n from pagos p join cuotas c on c.id = p.cuota_id where c.periodo_id = $1`,
      [periodoId],
    );
    expect(pagos.rows[0]!.n).toBe(1);
  });
});
