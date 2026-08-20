import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import {
  crearDbConSchema,
  actuarComo,
  actuarComoAnon,
  actuarComoServidor,
} from "./helpers/pg";
import {
  esCategoriaValida,
  etiquetaCategoria,
  CATEGORIAS_OCURRENCIA,
} from "@/lib/ocurrencias-cat";

// Fase 6 · Cuaderno de ocurrencias. Verifica los permisos: el personal
// (portería/tesorería/admin) escribe y lee; el residente y el público (anon)
// NO ven nada (es interno — las evidencias incluyen datos de terceros, DNI).

const UID = {
  admin: "00000000-0000-0000-0000-0000000000b1",
  tesoreria: "00000000-0000-0000-0000-0000000000b2",
  porteria: "00000000-0000-0000-0000-0000000000b3",
  residente: "00000000-0000-0000-0000-0000000000b4",
} as const;

let db: PGlite;

beforeAll(async () => {
  db = await crearDbConSchema();
  await db.exec(`
    insert into auth.users (id, email) values
      ('${UID.admin}', 'admin@x'), ('${UID.tesoreria}', 'tes@x'),
      ('${UID.porteria}', 'por@x'), ('${UID.residente}', 'res@x');
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

describe("Cuaderno de ocurrencias · categorías (puro)", () => {
  it("valida categorías conocidas y rechaza inventadas", () => {
    expect(esCategoriaValida("mantenimiento")).toBe(true);
    expect(esCategoriaValida("general")).toBe(true);
    expect(esCategoriaValida("cualquier-cosa")).toBe(false);
  });

  it("la etiqueta cae a 'Otro' si no reconoce la categoría", () => {
    expect(etiquetaCategoria("mantenimiento")).toBe("Mantenimiento");
    expect(etiquetaCategoria("zzz")).toBe("Otro");
  });

  it("existen al menos mantenimiento e incidente", () => {
    const valores = CATEGORIAS_OCURRENCIA.map((c) => c.valor);
    expect(valores).toContain("mantenimiento");
    expect(valores).toContain("incidente");
  });
});

describe("Cuaderno de ocurrencias · RLS", () => {
  let ocId: number;

  it("portería registra una ocurrencia con foto y la vuelve a leer", async () => {
    await actuarComo(db, UID.porteria);
    const oc = await db.query<{ id: number }>(
      `insert into ocurrencias (titulo, categoria, detalle, creado_por)
       values ('Mantenimiento del montavehículo', 'mantenimiento', 'Gatwick, mes agosto', $1)
       returning id`,
      [UID.porteria],
    );
    ocId = oc.rows[0]!.id;
    expect(ocId).toBeGreaterThan(0);

    await db.query(
      `insert into ocurrencia_fotos (ocurrencia_id, ruta) values ($1, 'oc-1/evidencia.jpg')`,
      [ocId],
    );

    const oks = await db.query<{ n: number }>(
      `select count(*)::int as n from ocurrencias`,
    );
    expect(oks.rows[0]!.n).toBe(1);
    const fotos = await db.query<{ n: number }>(
      `select count(*)::int as n from ocurrencia_fotos where ocurrencia_id = $1`,
      [ocId],
    );
    expect(fotos.rows[0]!.n).toBe(1);
    await actuarComoServidor(db);
  });

  it("tesorería y admin también leen el cuaderno", async () => {
    await actuarComo(db, UID.tesoreria);
    expect(
      (await db.query<{ n: number }>(`select count(*)::int as n from ocurrencias`)).rows[0]!.n,
    ).toBe(1);
    await actuarComoServidor(db);

    await actuarComo(db, UID.admin);
    expect(
      (await db.query<{ n: number }>(`select count(*)::int as n from ocurrencias`)).rows[0]!.n,
    ).toBe(1);
    await actuarComoServidor(db);
  });

  it("residente NO ve ni escribe el cuaderno (es interno)", async () => {
    await actuarComo(db, UID.residente);
    expect(
      (await db.query<{ n: number }>(`select count(*)::int as n from ocurrencias`)).rows[0]!.n,
    ).toBe(0);
    expect(
      (await db.query<{ n: number }>(`select count(*)::int as n from ocurrencia_fotos`)).rows[0]!.n,
    ).toBe(0);
    await expect(
      db.query(`insert into ocurrencias (titulo) values ('colada de residente')`),
    ).rejects.toThrow(/row-level security/);
    await actuarComoServidor(db);
  });

  it("PÚBLICO (anon) NO ve el cuaderno ni sus fotos ni escribe", async () => {
    await actuarComoAnon(db);
    expect(
      (await db.query<{ n: number }>(`select count(*)::int as n from ocurrencias`)).rows[0]!.n,
    ).toBe(0);
    expect(
      (await db.query<{ n: number }>(`select count(*)::int as n from ocurrencia_fotos`)).rows[0]!.n,
    ).toBe(0);
    await expect(
      db.query(`insert into ocurrencias (titulo) values ('colada anónima')`),
    ).rejects.toThrow(/row-level security/);
    await actuarComoServidor(db);
  });

  it("borrar una ocurrencia arrastra sus fotos (on delete cascade)", async () => {
    await actuarComo(db, UID.admin);
    await db.query(`delete from ocurrencias where id = $1`, [ocId]);
    await actuarComoServidor(db);
    expect(
      (await db.query<{ n: number }>(`select count(*)::int as n from ocurrencia_fotos where ocurrencia_id = $1`, [ocId])).rows[0]!.n,
    ).toBe(0);
  });
});
