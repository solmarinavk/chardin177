-- Verificación de datos semilla tras aplicar la migración 0001 (ROADMAP 0.3).
-- Pégalo en Supabase → SQL Editor → New query y ejecuta. Todo debe decir OK.

-- 1) Deben existir los 10 departamentos (101..502)
select
  case when count(*) = 10 then 'OK' else 'FALLA' end as check_departamentos,
  count(*) as filas
from departamentos;

-- 2) Categorías de egreso sembradas (10)
select
  case when count(*) = 10 then 'OK' else 'FALLA' end as check_categorias,
  count(*) as filas
from categorias_egreso;

-- 3) Provisiones sembradas (Vacaciones, CTS, Gratificación)
select
  case when count(*) = 3 then 'OK' else 'FALLA' end as check_provisiones,
  count(*) as filas
from provisiones;

-- 4) Cuota fija vigente cargada (valores jun-2026)
select
  case when count(*) >= 1 then 'OK' else 'FALLA' end as check_cuotas_fijas,
  count(*) as filas
from cuotas_fijas;

-- 5) RLS activo en TODAS las tablas del esquema público (regla de oro #5)
select
  case when count(*) = 0 then 'OK: RLS en todas' else 'FALLA: hay tablas sin RLS' end as check_rls,
  coalesce(string_agg(tablename, ', '), '(ninguna)') as tablas_sin_rls
from pg_tables
where schemaname = 'public'
  and rowsecurity = false;

-- 6) Listado de los departamentos (debe mostrar 101,102,201,...,502)
select id, piso, activo from departamentos order by id;
