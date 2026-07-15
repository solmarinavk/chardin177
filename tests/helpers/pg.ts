import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Stub del esquema auth de Supabase + roles que usan las políticas RLS.
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
  fileURLToPath(new URL("../../supabase/schema.sql", import.meta.url)),
  "utf8",
);

export async function crearDbConSchema(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(PRELUDE);
  await db.exec(schemaSql);
  return db;
}

export type FixtureLike = {
  recibo_agua_cent: number;
  recibo_luz_cent: number;
  extra_dpto_cent: number;
  agua_comun_dpto_cent: number;
  deptos: Array<{
    dpto: number;
    lectura_anterior: number;
    lectura_actual: number;
  }>;
};

// Crea un periodo en borrador con recibos, 10 lecturas y (si hay) el extra.
export async function sembrarBorrador(
  db: PGlite,
  f: FixtureLike,
  anio: number,
  mes: number,
): Promise<number> {
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

  if (f.extra_dpto_cent !== 0) {
    for (const d of f.deptos) {
      await db.query(
        `insert into ajustes (periodo_id, dpto_id, concepto, monto_cent, origen)
         values ($1, $2, 'Cuota extra', $3, 'cuota_extra')`,
        [periodoId, d.dpto, f.extra_dpto_cent],
      );
    }
  }

  return periodoId;
}
