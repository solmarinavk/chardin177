-- 0009 · Residuo de redondeo de la LUZ al dpto de mayor consumo
--
-- Bug latente del motor: la luz se repartía como round(recibo_luz / 10) por dpto,
-- sin repartir el residuo. Cuando el recibo de luz NO es múltiplo de 10 (p. ej.
-- agosto 2026 = S/ 536.14), la suma de las 10 luces quedaba 1–9 céntimos por
-- debajo del recibo, rompiendo el cuadre exacto (regla #7) y mostrando "NO cuadra"
-- en el desglose. El agua ya repartía su residuo al dpto de mayor consumo; esta
-- migración hace lo mismo con la luz.
--
-- Seguro para los tests dorados: junio (54450) y julio (50890) tienen el recibo
-- de luz múltiplo de 10, así que su residuo es 0 y sus cuotas no cambian.
--
-- Solo reemplaza la función; no toca datos. Periodos ya emitidos/cerrados son
-- inmutables y no se recalculan.

create or replace function generar_cuotas(p_periodo bigint)
returns void language plpgsql security definer as $$
declare
  v_estado estado_periodo;
  v_agua integer; v_luz integer;
  v_fijas cuotas_fijas%rowtype;
  v_sum_var integer;
  v_pool_agua integer;         -- recibo agua - agua común total
  v_asignado integer := 0;
  v_luz_asignado integer := 0;
  v_residuo integer;
  v_max_dpto smallint;
  r record;
begin
  select estado into v_estado from periodos where id = p_periodo;
  if v_estado is distinct from 'borrador' then
    raise exception 'Solo se calculan cuotas de un periodo en borrador';
  end if;

  select monto_cent into v_agua from recibos_servicios where periodo_id = p_periodo and tipo='agua';
  select monto_cent into v_luz  from recibos_servicios where periodo_id = p_periodo and tipo='luz';
  if v_agua is null or v_luz is null then
    raise exception 'Faltan recibos de agua y/o luz del periodo';
  end if;
  if (select count(*) from lecturas_agua where periodo_id = p_periodo) <> 10 then
    raise exception 'Deben existir las 10 lecturas de agua';
  end if;

  select * into v_fijas from cuotas_fijas
   where vigente_desde <= (select make_date(anio, mes, 1) from periodos where id = p_periodo)
   order by vigente_desde desc limit 1;

  select coalesce(sum(lectura_actual - lectura_anterior),0) into v_sum_var
    from lecturas_agua where periodo_id = p_periodo;

  v_pool_agua := v_agua - (v_fijas.agua_comun_dpto_cent * 10);
  if v_pool_agua < 0 then v_pool_agua := 0; end if;

  delete from cuotas where periodo_id = p_periodo;  -- regenerable en borrador

  select dpto_id into v_max_dpto from lecturas_agua
   where periodo_id = p_periodo
   order by (lectura_actual - lectura_anterior) desc, dpto_id limit 1;

  for r in
    select la.dpto_id, (la.lectura_actual - la.lectura_anterior) as var,
           coalesce((select sum(monto_cent) from ajustes a
                     where a.periodo_id = p_periodo and a.dpto_id = la.dpto_id
                       and coalesce(a.origen,'') <> 'cuota_extra'),0) as ajuste,
           coalesce((select sum(monto_cent) from ajustes a
                     where a.periodo_id = p_periodo and a.dpto_id = la.dpto_id
                       and a.origen = 'cuota_extra'),0) as extra
    from lecturas_agua la where la.periodo_id = p_periodo
  loop
    declare
      v_ac integer; v_luz_d integer; v_vig integer; v_man integer; v_tot integer;
    begin
      if v_sum_var = 0 then
        v_ac := round(v_pool_agua / 10.0);
      else
        v_ac := round(v_pool_agua * r.var::numeric / v_sum_var);
      end if;
      v_asignado := v_asignado + v_ac;
      v_luz_d := round(v_luz / 10.0);
      v_luz_asignado := v_luz_asignado + v_luz_d;
      v_vig := round(v_fijas.vigilancia_total_cent / 10.0);
      v_man := round(v_fijas.manto_total_cent / 10.0);
      v_tot := v_ac + v_fijas.agua_comun_dpto_cent + v_luz_d + v_vig + v_man
             + v_fijas.materiales_dpto_cent + r.extra + r.ajuste;
      insert into cuotas (periodo_id,dpto_id,m3_variacion,agua_consumo_cent,agua_comun_cent,
        luz_cent,vigilancia_cent,manto_cent,materiales_cent,extra_cent,ajuste_cent,total_cent)
      values (p_periodo,r.dpto_id,r.var,v_ac,v_fijas.agua_comun_dpto_cent,
        v_luz_d,v_vig,v_man,v_fijas.materiales_dpto_cent,r.extra,r.ajuste,v_tot);
    end;
  end loop;

  -- Residuo de redondeo del agua al dpto de mayor consumo
  v_residuo := v_pool_agua - v_asignado;
  if v_residuo <> 0 then
    update cuotas set agua_consumo_cent = agua_consumo_cent + v_residuo,
                      total_cent = total_cent + v_residuo
     where periodo_id = p_periodo and dpto_id = v_max_dpto;
  end if;

  -- Residuo de redondeo de la luz (cuando el recibo NO es múltiplo de 10) al
  -- mismo dpto de mayor consumo, para que Σ luz = recibo y las cuotas cuadren
  -- exacto con los recibos (regla #7). En junio/julio el recibo de luz era
  -- múltiplo de 10: el residuo era 0 y nada cambia (tests dorados intactos).
  v_residuo := v_luz - v_luz_asignado;
  if v_residuo <> 0 then
    update cuotas set luz_cent = luz_cent + v_residuo,
                      total_cent = total_cent + v_residuo
     where periodo_id = p_periodo and dpto_id = v_max_dpto;
  end if;
end $$;
