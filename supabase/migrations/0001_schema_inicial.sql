-- ============================================================
-- CHARDIN 177 · Esquema de base de datos (Supabase / Postgres)
-- Fuente de verdad del modelo. Aplicar como migración inicial.
-- Regla de oro: TODO dinero en céntimos (integer).
-- ============================================================

-- ---------- Tipos ----------
create type rol_usuario as enum ('admin','tesoreria','porteria','residente');
create type estado_periodo as enum ('borrador','emitido','cerrado');
create type estado_cuota as enum ('pendiente','parcial','pagado');
create type tipo_recibo as enum ('agua','luz');
create type medio_pago as enum ('yape','plin','transferencia','efectivo','otro');

-- ---------- Núcleo ----------
create table departamentos (
  id smallint primary key,            -- 101, 102, 201 ... 502
  piso smallint not null check (piso between 1 and 5),
  activo boolean not null default true
);

create table perfiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  rol rol_usuario not null default 'residente',
  dpto_id smallint references departamentos(id),
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create table residentes (
  id bigint generated always as identity primary key,
  dpto_id smallint not null references departamentos(id),
  nombre text not null,
  email text,
  telefono text,
  es_propietario boolean not null default true,
  desde date,
  hasta date,                          -- null = residente actual
  activo boolean not null default true
);

-- Cuotas fijas versionadas (vigilancia, manto, materiales, agua común)
create table cuotas_fijas (
  id bigint generated always as identity primary key,
  vigente_desde date not null,
  vigilancia_total_cent integer not null check (vigilancia_total_cent >= 0),
  manto_total_cent integer not null check (manto_total_cent >= 0),
  materiales_dpto_cent integer not null default 2000,
  agua_comun_dpto_cent integer not null default 1500,
  notas text
);

create table periodos (
  id bigint generated always as identity primary key,
  anio smallint not null,
  mes smallint not null check (mes between 1 and 12),
  estado estado_periodo not null default 'borrador',
  saldo_inicial_cent integer,          -- lo fija el cierre del anterior
  saldo_final_cent integer,            -- lo fija el cierre de este
  emitido_en timestamptz,
  cerrado_en timestamptz,
  unique (anio, mes)
);
-- Un solo borrador a la vez
create unique index un_borrador on periodos ((true)) where estado = 'borrador';

create table lecturas_agua (
  id bigint generated always as identity primary key,
  periodo_id bigint not null references periodos(id),
  dpto_id smallint not null references departamentos(id),
  lectura_anterior integer not null check (lectura_anterior >= 0),
  lectura_actual integer not null,
  foto_url text,
  registrado_por uuid references auth.users(id),
  registrado_en timestamptz not null default now(),
  unique (periodo_id, dpto_id),
  check (lectura_actual >= lectura_anterior)
);

create table recibos_servicios (
  id bigint generated always as identity primary key,
  periodo_id bigint not null references periodos(id),
  tipo tipo_recibo not null,
  monto_cent integer not null check (monto_cent >= 0),
  foto_url text,
  registrado_por uuid references auth.users(id),
  unique (periodo_id, tipo)
);

-- Ajustes que se inyectan a un periodo (correcciones de agua, devoluciones, extras puntuales)
create table ajustes (
  id bigint generated always as identity primary key,
  periodo_id bigint not null references periodos(id),
  dpto_id smallint not null references departamentos(id),
  concepto text not null,
  monto_cent integer not null,          -- puede ser negativo (devolución)
  origen text,                          -- 'conciliacion_agua', 'manual', 'cuota_extra'
  creado_por uuid references auth.users(id),
  creado_en timestamptz not null default now()
);

-- Snapshot inmutable una vez emitido el periodo
create table cuotas (
  id bigint generated always as identity primary key,
  periodo_id bigint not null references periodos(id),
  dpto_id smallint not null references departamentos(id),
  m3_variacion integer not null,
  agua_consumo_cent integer not null,
  agua_comun_cent integer not null,
  luz_cent integer not null,
  vigilancia_cent integer not null,
  manto_cent integer not null,
  materiales_cent integer not null,
  extra_cent integer not null default 0,
  ajuste_cent integer not null default 0,
  total_cent integer not null,
  estado estado_cuota not null default 'pendiente',
  unique (periodo_id, dpto_id)
);

create table pagos (
  id bigint generated always as identity primary key,
  cuota_id bigint not null references cuotas(id),
  monto_cent integer not null check (monto_cent > 0),
  fecha_pago date not null,
  medio medio_pago not null default 'transferencia',
  comprobante_url text,
  nota text,
  registrado_por uuid references auth.users(id),
  registrado_en timestamptz not null default now()
);

create table categorias_egreso (
  id smallint generated always as identity primary key,
  nombre text not null unique
);

create table egresos (
  id bigint generated always as identity primary key,
  periodo_id bigint not null references periodos(id),
  categoria_id smallint references categorias_egreso(id),
  concepto text not null,
  monto_cent integer not null check (monto_cent >= 0),
  fecha date not null,
  pagado boolean not null default true,
  comprobante_url text,
  registrado_por uuid references auth.users(id),
  registrado_en timestamptz not null default now()
);

create table provisiones (
  id smallint generated always as identity primary key,
  concepto text not null unique,        -- Vacaciones, CTS, Gratificación
  aporte_mensual_cent integer not null default 0,
  activo boolean not null default true
);

create table movimientos_provision (
  id bigint generated always as identity primary key,
  provision_id smallint not null references provisiones(id),
  periodo_id bigint references periodos(id),
  monto_cent integer not null,          -- + aporte, - uso
  concepto text,
  creado_en timestamptz not null default now()
);

create table conciliaciones_agua (
  id bigint generated always as identity primary key,
  periodo_desde bigint not null references periodos(id),
  periodo_hasta bigint not null references periodos(id),
  facturado_real_cent integer not null,
  cobrado_cent integer not null,
  aplicada boolean not null default false,
  notas text,
  creado_en timestamptz not null default now()
);

create table documentos (
  id bigint generated always as identity primary key,
  titulo text not null,
  categoria text,                       -- reglamento, acta, presupuesto
  url text not null,
  subido_por uuid references auth.users(id),
  creado_en timestamptz not null default now()
);

create table audit_log (
  id bigint generated always as identity primary key,
  tabla text not null,
  registro_id text not null,
  accion text not null,                 -- INSERT / UPDATE / DELETE
  usuario uuid,
  antes jsonb,
  despues jsonb,
  creado_en timestamptz not null default now()
);

-- ---------- Datos semilla ----------
insert into departamentos (id, piso) values
 (101,1),(102,1),(201,2),(202,2),(301,3),(302,3),(401,4),(402,4),(501,5),(502,5);

insert into categorias_egreso (nombre) values
 ('Vigilancia'),('Agua'),('Luz'),('Ascensor'),('Montavehículo'),
 ('Jardinería'),('Limpieza'),('Reparaciones'),('Materiales'),('Otros');

insert into provisiones (concepto, aporte_mensual_cent) values
 ('Vacaciones', 0),('CTS', 0),('Gratificación', 0);

-- Cuotas fijas vigentes al arrancar (valores reales junio/julio 2026)
insert into cuotas_fijas (vigente_desde, vigilancia_total_cent, manto_total_cent, materiales_dpto_cent, agua_comun_dpto_cent, notas)
values ('2026-06-01', 200000, 137610, 2000, 1500, 'Valores del Excel a jun-2026: vigilancia S/2000, manto S/1376.10');

-- ---------- Motor de cálculo ----------
create or replace function generar_cuotas(p_periodo bigint)
returns void language plpgsql security definer as $$
declare
  v_estado estado_periodo;
  v_agua integer; v_luz integer;
  v_fijas cuotas_fijas%rowtype;
  v_sum_var integer;
  v_pool_agua integer;         -- recibo agua - agua común total
  v_asignado integer := 0;
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
end $$;

-- Emitir: congela el periodo
create or replace function emitir_periodo(p_periodo bigint)
returns void language plpgsql security definer as $$
begin
  if (select count(*) from cuotas where periodo_id = p_periodo) <> 10 then
    raise exception 'Genera las cuotas antes de emitir';
  end if;
  update periodos set estado='emitido', emitido_en=now()
   where id = p_periodo and estado='borrador';
end $$;

-- Cerrar: fija saldos y abre el siguiente
create or replace function cerrar_periodo(p_periodo bigint)
returns bigint language plpgsql security definer as $$
declare
  v_ing integer; v_egr integer; v_ini integer; v_fin integer;
  v_anio smallint; v_mes smallint; v_next bigint;
begin
  select saldo_inicial_cent, anio, mes into v_ini, v_anio, v_mes
    from periodos where id = p_periodo and estado='emitido';
  if not found then raise exception 'El periodo debe estar emitido'; end if;

  select coalesce(sum(p.monto_cent),0) into v_ing
    from pagos p join cuotas c on c.id=p.cuota_id where c.periodo_id = p_periodo;
  select coalesce(sum(monto_cent),0) into v_egr
    from egresos where periodo_id = p_periodo and pagado;

  v_fin := coalesce(v_ini,0) + v_ing - v_egr;
  update periodos set estado='cerrado', cerrado_en=now(), saldo_final_cent=v_fin
   where id = p_periodo;

  if v_mes = 12 then v_anio := v_anio+1; v_mes := 1; else v_mes := v_mes+1; end if;
  insert into periodos (anio, mes, saldo_inicial_cent) values (v_anio, v_mes, v_fin)
    on conflict (anio,mes) do update set saldo_inicial_cent = excluded.saldo_inicial_cent
    returning id into v_next;
  return v_next;
end $$;

-- Recalcular estado de cuota tras cada pago
create or replace function fn_actualiza_estado_cuota() returns trigger language plpgsql as $$
declare v_pagado integer; v_total integer; v_cuota bigint;
begin
  v_cuota := coalesce(new.cuota_id, old.cuota_id);
  select total_cent into v_total from cuotas where id = v_cuota;
  select coalesce(sum(monto_cent),0) into v_pagado from pagos where cuota_id = v_cuota;
  update cuotas set estado = case
      when v_pagado = 0 then 'pendiente'
      when v_pagado < v_total then 'parcial'
      else 'pagado' end
   where id = v_cuota;
  return null;
end $$;
create trigger tg_pagos_estado after insert or update or delete on pagos
  for each row execute function fn_actualiza_estado_cuota();

-- ---------- Auditoría ----------
create or replace function fn_audit() returns trigger language plpgsql as $$
begin
  insert into audit_log (tabla, registro_id, accion, usuario, antes, despues)
  values (tg_table_name,
          coalesce((to_jsonb(coalesce(new,old))->>'id'),'?'),
          tg_op, auth.uid(),
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return null;
end $$;

do $$ declare t text;
begin
  foreach t in array array['pagos','egresos','cuotas','lecturas_agua','perfiles','cuotas_fijas','ajustes','recibos_servicios']
  loop
    execute format('create trigger tg_audit_%I after insert or update or delete on %I for each row execute function fn_audit()', t, t);
  end loop;
end $$;

-- ---------- Inmutabilidad de periodos emitidos ----------
create or replace function fn_bloquea_emitido() returns trigger language plpgsql as $$
declare v_estado estado_periodo; v_periodo bigint;
begin
  v_periodo := coalesce(new.periodo_id, old.periodo_id);
  select estado into v_estado from periodos where id = v_periodo;
  if v_estado <> 'borrador' then
    raise exception 'Periodo % ya emitido/cerrado: usa un ajuste en el periodo siguiente', v_periodo;
  end if;
  return coalesce(new, old);
end $$;
create trigger tg_lock_lecturas before insert or update or delete on lecturas_agua
  for each row execute function fn_bloquea_emitido();
create trigger tg_lock_recibos before insert or update or delete on recibos_servicios
  for each row execute function fn_bloquea_emitido();

-- ---------- RLS ----------
-- Helper de rol
create or replace function mi_rol() returns rol_usuario language sql stable as
$$ select rol from perfiles where user_id = auth.uid() $$;

alter table departamentos enable row level security;
alter table perfiles enable row level security;
alter table residentes enable row level security;
alter table cuotas_fijas enable row level security;
alter table periodos enable row level security;
alter table lecturas_agua enable row level security;
alter table recibos_servicios enable row level security;
alter table ajustes enable row level security;
alter table cuotas enable row level security;
alter table pagos enable row level security;
alter table categorias_egreso enable row level security;
alter table egresos enable row level security;
alter table provisiones enable row level security;
alter table movimientos_provision enable row level security;
alter table conciliaciones_agua enable row level security;
alter table documentos enable row level security;
alter table audit_log enable row level security;

-- Transparencia: todo usuario autenticado LEE todo
do $$ declare t text;
begin
  foreach t in array array['departamentos','residentes','cuotas_fijas','periodos','lecturas_agua',
    'recibos_servicios','ajustes','cuotas','pagos','categorias_egreso','egresos','provisiones',
    'movimientos_provision','conciliaciones_agua','documentos']
  loop
    execute format('create policy sel_%I on %I for select to authenticated using (true)', t, t);
  end loop;
end $$;

-- Perfiles: cada quien ve el suyo, admin ve y edita todos
create policy sel_perfiles on perfiles for select to authenticated
  using (user_id = auth.uid() or mi_rol() = 'admin');
create policy adm_perfiles on perfiles for all to authenticated
  using (mi_rol() = 'admin') with check (mi_rol() = 'admin');

-- Escrituras por rol
create policy w_lecturas on lecturas_agua for all to authenticated
  using (mi_rol() in ('porteria','tesoreria','admin'))
  with check (mi_rol() in ('porteria','tesoreria','admin'));

create policy w_recibos on recibos_servicios for all to authenticated
  using (mi_rol() in ('tesoreria','admin')) with check (mi_rol() in ('tesoreria','admin'));
create policy w_pagos on pagos for all to authenticated
  using (mi_rol() in ('tesoreria','admin')) with check (mi_rol() in ('tesoreria','admin'));
create policy w_egresos on egresos for all to authenticated
  using (mi_rol() in ('tesoreria','admin')) with check (mi_rol() in ('tesoreria','admin'));
create policy w_ajustes on ajustes for all to authenticated
  using (mi_rol() in ('tesoreria','admin')) with check (mi_rol() in ('tesoreria','admin'));
create policy w_conc on conciliaciones_agua for all to authenticated
  using (mi_rol() in ('tesoreria','admin')) with check (mi_rol() in ('tesoreria','admin'));
create policy w_movprov on movimientos_provision for all to authenticated
  using (mi_rol() in ('tesoreria','admin')) with check (mi_rol() in ('tesoreria','admin'));

create policy w_periodos on periodos for all to authenticated
  using (mi_rol() in ('tesoreria','admin')) with check (mi_rol() in ('tesoreria','admin'));
create policy w_fijas on cuotas_fijas for all to authenticated
  using (mi_rol() = 'admin') with check (mi_rol() = 'admin');
create policy w_residentes on residentes for all to authenticated
  using (mi_rol() = 'admin') with check (mi_rol() = 'admin');
create policy w_docs on documentos for all to authenticated
  using (mi_rol() in ('tesoreria','admin')) with check (mi_rol() in ('tesoreria','admin'));
create policy w_prov on provisiones for all to authenticated
  using (mi_rol() = 'admin') with check (mi_rol() = 'admin');

-- cuotas: solo las escribe el motor (security definer); nadie las toca directo
-- (sin política de escritura = denegado para todos los roles vía API)

-- audit_log: solo admin lee; nadie escribe directo (lo hacen los triggers)
create policy sel_audit on audit_log for select to authenticated using (mi_rol() = 'admin');
