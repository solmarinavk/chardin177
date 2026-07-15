-- FASE 2 · Caja coherente y cierre de mes.
--
-- Problema que corrige: un pago ATRASADO (ej. la deuda de julio pagada en
-- septiembre, con julio ya cerrado) no entraba a la caja de ningún mes: el
-- cierre solo sumaba pagos de cuotas del propio periodo, y el saldo real del
-- edificio se desviaba para siempre del saldo del sistema.
--
-- Solución (caja por fecha de cobro, como una caja real):
--   · Cada pago se "contabiliza" en el cierre que lo recoge: al cerrar un mes
--     se suman TODOS los pagos aún no contabilizados (del mes o atrasados de
--     meses anteriores) y quedan marcados con ese cierre.
--   · Un pago ya contabilizado es intocable (ni editar ni anular): las
--     correcciones posteriores van como ajuste del periodo siguiente, igual
--     que el resto de la plataforma.
--   · Los egresos de un periodo cerrado quedan bloqueados (su caja ya cuadró).
--     Un recibo que llega tarde se registra como egreso del mes abierto.

-- 1) Columna de contabilización
alter table pagos add column if not exists
  contabilizado_en_periodo bigint references periodos(id);

comment on column pagos.contabilizado_en_periodo is
  'Cierre de caja que recogió este pago. NULL = aún no entra a ningún cierre. Lo fija cerrar_periodo(); un pago contabilizado es inmutable.';

-- 2) Cierre de mes: suma pagos NO contabilizados + egresos pagados del periodo,
--    fija saldo_final, marca los pagos y abre el mes siguiente con el saldo.
create or replace function cerrar_periodo(p_periodo bigint)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  v_ing integer; v_egr integer; v_ini integer; v_fin integer;
  v_anio smallint; v_mes smallint; v_next bigint;
begin
  select coalesce(saldo_inicial_cent, 0), anio, mes into v_ini, v_anio, v_mes
    from periodos where id = p_periodo and estado = 'emitido';
  if not found then raise exception 'El periodo debe estar emitido'; end if;

  select coalesce(sum(monto_cent), 0) into v_ing
    from pagos where contabilizado_en_periodo is null;
  select coalesce(sum(monto_cent), 0) into v_egr
    from egresos where periodo_id = p_periodo and pagado;

  v_fin := v_ini + v_ing - v_egr;

  update pagos set contabilizado_en_periodo = p_periodo
   where contabilizado_en_periodo is null;

  update periodos set estado='cerrado', cerrado_en=now(), saldo_final_cent=v_fin
   where id = p_periodo;

  if v_mes = 12 then v_anio := v_anio + 1; v_mes := 1; else v_mes := v_mes + 1; end if;
  insert into periodos (anio, mes, saldo_inicial_cent) values (v_anio, v_mes, v_fin)
    on conflict (anio, mes) do update set saldo_inicial_cent = excluded.saldo_inicial_cent
    returning id into v_next;
  return v_next;
end $$;

-- 3) Un pago contabilizado en un cierre es inmutable
create or replace function fn_bloquea_pago_contabilizado()
returns trigger language plpgsql as $$
begin
  if old.contabilizado_en_periodo is not null then
    raise exception 'Este pago ya entró al cierre de caja de un mes: no se puede modificar ni anular. Registra un ajuste en el periodo siguiente.';
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists tg_lock_pagos_contabilizados on pagos;
create trigger tg_lock_pagos_contabilizados
  before update or delete on pagos
  for each row execute function fn_bloquea_pago_contabilizado();

-- 4) Los egresos de un periodo cerrado son inmutables
create or replace function fn_bloquea_egreso_cerrado()
returns trigger language plpgsql as $$
declare v_estado estado_periodo;
begin
  select estado into v_estado from periodos
   where id = coalesce(new.periodo_id, old.periodo_id);
  if v_estado = 'cerrado' then
    raise exception 'El periodo ya está cerrado y su caja cuadrada: registra el egreso en el mes abierto.';
  end if;
  -- Si un UPDATE intenta mover el egreso HACIA un periodo cerrado, también se bloquea.
  if tg_op = 'UPDATE' and new.periodo_id is distinct from old.periodo_id then
    select estado into v_estado from periodos where id = new.periodo_id;
    if v_estado = 'cerrado' then
      raise exception 'No se puede mover un egreso a un periodo cerrado.';
    end if;
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists tg_lock_egresos_cerrado on egresos;
create trigger tg_lock_egresos_cerrado
  before insert or update or delete on egresos
  for each row execute function fn_bloquea_egreso_cerrado();
