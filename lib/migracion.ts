// Lógica pura de la migración histórica (tarea 4.1). NO recalcula con el motor:
// carga los valores del Excel auditado tal cual, como periodos CERRADOS.
// Aquí no se lee el .xlsx ni se toca Supabase (eso vive en scripts/migrar_excel.ts);
// así esta lógica —validación del empalme, cuadre de céntimos y el SQL— se prueba
// sin red y sin archivo.

export type FilaCuotaHist = {
  anio: number;
  mes: number;
  dpto: number;
  total_cent: number; // total pagado por ese dpto ese mes (céntimos enteros)
};

// Saldos de un mes. Pueden ser null: hay meses con cuotas pero sin registro de
// caja en el Excel (la hoja Caja empieza más tarde que la hoja Cuotas).
export type SaldoMesHist = {
  anio: number;
  mes: number;
  saldo_inicial_cent: number | null;
  saldo_final_cent: number | null;
};

export type PlanMigracion = {
  meses: SaldoMesHist[]; // un elemento por periodo a crear (con o sin saldo)
  cuotas: FilaCuotaHist[]; // hoja "Cuotas"
};

// Empalme: el periodo operativo ya existente cuyo saldo inicial se debe fijar
// con el saldo final del último mes histórico.
export type Empalme = { anio: number; mes: number };

export type Validacion = {
  ok: boolean;
  errores: string[]; // bloquean la carga
  advertencias: string[]; // no bloquean
  saldoFinalUltimoCent: number | null; // el que empalma con lo operativo
  ultimoMes: { anio: number; mes: number } | null;
  totalMeses: number;
  totalCuotas: number;
};

const orden = (x: { anio: number; mes: number }) => x.anio * 12 + x.mes;

function esCentimosEntero(n: unknown): boolean {
  return typeof n === "number" && Number.isInteger(n);
}

function etiqueta(x: { anio: number; mes: number }): string {
  return `${String(x.mes).padStart(2, "0")}/${x.anio}`;
}

// Valida el plan: céntimos enteros, cadena de saldos sin saltos (solo donde hay
// saldos), 10 dptos por mes. Devuelve el saldo final del último mes.
export function validarMigracion(plan: PlanMigracion): Validacion {
  const errores: string[] = [];
  const advertencias: string[] = [];

  const meses = [...plan.meses].sort((a, b) => orden(a) - orden(b));

  // 1) Céntimos enteros (regla de oro: nada de floats).
  for (const m of meses) {
    if (m.saldo_inicial_cent !== null && !esCentimosEntero(m.saldo_inicial_cent))
      errores.push(`Saldo inicial no entero (céntimos) en ${etiqueta(m)}.`);
    if (m.saldo_final_cent !== null && !esCentimosEntero(m.saldo_final_cent))
      errores.push(`Saldo final no entero (céntimos) en ${etiqueta(m)}.`);
  }
  for (const c of plan.cuotas) {
    if (!esCentimosEntero(c.total_cent))
      errores.push(`Cuota no entera (céntimos): dpto ${c.dpto} en ${etiqueta(c)}.`);
  }

  // 2) Meses únicos.
  const vistos = new Set<number>();
  for (const m of meses) {
    if (vistos.has(orden(m))) errores.push(`Mes repetido: ${etiqueta(m)}.`);
    vistos.add(orden(m));
  }

  // 3) Empalme interno sin saltos: solo entre meses consecutivos que tengan
  //    saldos en ambos extremos (los meses sin caja no cortan la validación).
  for (let i = 1; i < meses.length; i++) {
    const prev = meses[i - 1]!;
    const cur = meses[i]!;
    const consecutivos = orden(cur) === orden(prev) + 1;
    if (
      consecutivos &&
      prev.saldo_final_cent !== null &&
      cur.saldo_inicial_cent !== null &&
      prev.saldo_final_cent !== cur.saldo_inicial_cent
    ) {
      errores.push(
        `Salto de saldo: el final de ${etiqueta(prev)} (${prev.saldo_final_cent}) no coincide con el inicial de ${etiqueta(cur)} (${cur.saldo_inicial_cent}).`,
      );
    }
    if (orden(cur) > orden(prev) + 1) {
      advertencias.push(`Hueco de meses entre ${etiqueta(prev)} y ${etiqueta(cur)}.`);
    }
  }

  // 4) 10 departamentos por mes (aviso, no bloquea).
  const porMes = new Map<number, Set<number>>();
  const mesesConPeriodo = new Set(meses.map(orden));
  for (const c of plan.cuotas) {
    const k = orden(c);
    if (!porMes.has(k)) porMes.set(k, new Set());
    porMes.get(k)!.add(c.dpto);
    if (!mesesConPeriodo.has(k))
      advertencias.push(`Cuota de un mes sin periodo: ${etiqueta(c)} (dpto ${c.dpto}).`);
  }
  for (const m of meses) {
    const n = porMes.get(orden(m))?.size ?? 0;
    if (n !== 10) advertencias.push(`${etiqueta(m)} tiene ${n} dptos (se esperaban 10).`);
  }

  const ultimo = meses.length ? meses[meses.length - 1]! : null;

  return {
    ok: errores.length === 0,
    errores,
    advertencias,
    saldoFinalUltimoCent: ultimo ? ultimo.saldo_final_cent : null,
    ultimoMes: ultimo ? { anio: ultimo.anio, mes: ultimo.mes } : null,
    totalMeses: meses.length,
    totalCuotas: plan.cuotas.length,
  };
}

// Último día del mes como 'YYYY-MM-DD' (para las fechas de cierre/pago).
function finDeMes(anio: number, mes: number): string {
  return new Date(Date.UTC(anio, mes, 0)).toISOString().slice(0, 10);
}

const lit = (v: number | null): string => (v === null ? "null" : String(v));

// Bloque de empalme cuando se conoce el periodo operativo (ej. julio 2026):
// fija su saldo inicial con el saldo final histórico y ABORTA si ya tuviera otro.
function bloqueEmpalmeUpdate(emp: Empalme, saldoFinal: number): string {
  return `-- 0) Empalme con el periodo operativo ${emp.anio}-${String(emp.mes).padStart(2, "0")}:
--    fija su saldo inicial con el saldo final histórico (${saldoFinal}) y aborta si ya tuviera otro.
do $$
declare v_ini integer;
begin
  if not exists (select 1 from periodos where anio = ${emp.anio} and mes = ${emp.mes}) then
    raise exception 'No existe el periodo ${emp.anio}-${emp.mes} en la plataforma; no se puede empalmar.';
  end if;
  select saldo_inicial_cent into v_ini from periodos where anio = ${emp.anio} and mes = ${emp.mes};
  if v_ini is not null and v_ini is distinct from ${saldoFinal} then
    raise exception 'Empalme roto: ${emp.anio}-${emp.mes} ya tiene saldo inicial % pero el histórico cierra en ${saldoFinal}', v_ini;
  end if;
  update periodos set saldo_inicial_cent = ${saldoFinal} where anio = ${emp.anio} and mes = ${emp.mes};
end $$;`;
}

// Bloque de empalme genérico (sin periodo objetivo conocido): solo comprueba.
function bloqueEmpalmeCheck(ordenUltimo: number, saldoFinal: number): string {
  return `-- 0) Empalme: si ya existe un periodo operativo posterior, su saldo inicial
--    DEBE ser el saldo final histórico (${saldoFinal}). Si no, aborta todo.
do $$
declare v_ini integer;
begin
  select saldo_inicial_cent into v_ini from periodos
   where (anio * 12 + mes) > ${ordenUltimo}
   order by anio, mes limit 1;
  if v_ini is not null and v_ini is distinct from ${saldoFinal} then
    raise exception 'Empalme roto: el primer periodo operativo tiene saldo inicial % pero el histórico cierra en %', v_ini, ${saldoFinal};
  end if;
end $$;`;
}

// Genera el SQL de la migración (para pegar en el SQL Editor de Supabase).
// Todo en una transacción. Si se pasa `empalmarCon`, además FIJA el saldo inicial
// del periodo operativo con el saldo final histórico (y aborta si no cuadra).
export function generarSqlMigracion(
  plan: PlanMigracion,
  opciones: { empalmarCon?: Empalme } = {},
): string {
  const meses = [...plan.meses].sort((a, b) => orden(a) - orden(b));
  const cuotas = [...plan.cuotas].sort((a, b) => orden(a) - orden(b) || a.dpto - b.dpto);
  if (meses.length === 0) return "-- Sin meses que migrar.\n";

  const ultimo = meses[meses.length - 1]!;
  const saldoFinal = ultimo.saldo_final_cent;

  const filasPeriodos = meses
    .map((m) => {
      const fin = finDeMes(m.anio, m.mes);
      return `  (${m.anio}, ${m.mes}, 'cerrado', ${lit(m.saldo_inicial_cent)}, ${lit(m.saldo_final_cent)}, '${fin}T12:00:00Z', '${fin}T12:00:00Z')`;
    })
    .join(",\n");

  const filasCuotas = cuotas
    .map((c) => `  (${c.anio}, ${c.mes}, ${c.dpto}, ${c.total_cent})`)
    .join(",\n");

  const filasMesesLista = meses.map((m) => `(${m.anio}, ${m.mes})`).join(", ");

  const emp = opciones.empalmarCon;
  const bloqueEmpalme =
    emp && saldoFinal !== null
      ? bloqueEmpalmeUpdate(emp, saldoFinal)
      : saldoFinal !== null
        ? bloqueEmpalmeCheck(orden(ultimo), saldoFinal)
        : "-- (Sin saldo final en el último mes: no hay empalme que fijar.)";

  return `-- ============================================================
-- Migración histórica · Chardin 177 (generado por scripts/migrar_excel.ts)
-- Volcado FIEL del Excel auditado; NO se recalcula con el motor.
-- ${meses.length} periodos (${etiqueta(meses[0]!)} → ${etiqueta(ultimo)}), ${cuotas.length} cuotas.
-- Revísalo y pégalo en Supabase → SQL Editor. Es re-ejecutable (on conflict).
-- ============================================================
begin;

${bloqueEmpalme}

-- 1) Periodos históricos (cerrados) con sus saldos arrastrados (null = sin caja).
insert into periodos (anio, mes, estado, saldo_inicial_cent, saldo_final_cent, emitido_en, cerrado_en) values
${filasPeriodos}
on conflict (anio, mes) do nothing;

-- 2) Cuotas por departamento (solo el TOTAL, que es el valor auditado; el
--    desglose histórico del Excel no cuadra fila a fila, así que no se carga).
insert into cuotas (periodo_id, dpto_id, m3_variacion, agua_consumo_cent, agua_comun_cent,
  luz_cent, vigilancia_cent, manto_cent, materiales_cent, extra_cent, ajuste_cent, total_cent, estado)
select p.id, v.dpto, 0, 0, 0, 0, 0, 0, 0, 0, 0, v.total, 'pagado'
from (values
${filasCuotas}
) as v(anio, mes, dpto, total)
join periodos p on p.anio = v.anio and p.mes = v.mes
on conflict (periodo_id, dpto_id) do nothing;

-- 3) Un pago por cuota (fija el mes como saldado; contabilizado en su propio
--    periodo para que NO entre a la caja del primer mes operativo).
insert into pagos (cuota_id, monto_cent, fecha_pago, medio, nota, contabilizado_en_periodo)
select c.id, c.total_cent, (make_date(p.anio, p.mes, 1) + interval '1 month' - interval '1 day')::date,
  'otro', 'Migración histórica', p.id
from cuotas c
join periodos p on p.id = c.periodo_id
join (values ${filasMesesLista}) as m(anio, mes) on m.anio = p.anio and m.mes = p.mes
where c.total_cent > 0
  and not exists (select 1 from pagos pg where pg.cuota_id = c.id);

commit;
${
  emp
    ? `-- Listo: ${emp.anio}-${String(emp.mes).padStart(2, "0")} quedó con saldo inicial ${saldoFinal}.`
    : `-- Recuerda: el primer periodo operativo debe iniciar con saldo ${saldoFinal}.`
}
`;
}
