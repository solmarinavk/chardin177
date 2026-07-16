-- FASE 3.1 · Provisiones automáticas al cerrar el mes.
--
-- Cada mes, al cerrar, se aparta automáticamente el aporte mensual de cada
-- provisión activa (vacaciones, CTS, gratificación del vigilante) como un
-- movimiento memo en `movimientos_provision`. NO afecta el saldo de caja: la
-- provisión es dinero "reservado" dentro del saldo; el dashboard muestra
-- "disponible real = saldo − provisiones" para que el superávit no engañe.
--
-- El uso de una provisión (cuando se paga la obligación) se registra aparte
-- como un movimiento negativo.

create or replace function cerrar_periodo(p_periodo bigint)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  v_ing integer; v_egr integer; v_ini integer; v_fin integer;
  v_anio smallint; v_mes smallint; v_next bigint;
begin
  select coalesce(saldo_inicial_cent, 0), anio, mes into v_ini, v_anio, v_mes
    from periodos where id = p_periodo and estado='emitido';
  if not found then raise exception 'El periodo debe estar emitido'; end if;

  select coalesce(sum(monto_cent),0) into v_ing
    from pagos where contabilizado_en_periodo is null;
  select coalesce(sum(monto_cent),0) into v_egr
    from egresos where periodo_id = p_periodo and pagado;

  v_fin := v_ini + v_ing - v_egr;

  update pagos set contabilizado_en_periodo = p_periodo
   where contabilizado_en_periodo is null;

  -- Aporte mensual automático a las provisiones activas (memo, no toca caja).
  insert into movimientos_provision (provision_id, periodo_id, monto_cent, concepto)
  select id, p_periodo, aporte_mensual_cent, 'Aporte mensual automático'
    from provisiones
   where activo and aporte_mensual_cent > 0;

  update periodos set estado='cerrado', cerrado_en=now(), saldo_final_cent=v_fin
   where id = p_periodo;

  if v_mes = 12 then v_anio := v_anio+1; v_mes := 1; else v_mes := v_mes+1; end if;
  insert into periodos (anio, mes, saldo_inicial_cent) values (v_anio, v_mes, v_fin)
    on conflict (anio,mes) do update set saldo_inicial_cent = excluded.saldo_inicial_cent
    returning id into v_next;
  return v_next;
end $$;
