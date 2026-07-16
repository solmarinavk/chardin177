-- Corrige TRES bugs del schema original que rompen la operación con usuarios
-- reales (aparecen recién al escribir datos con un rol autenticado):
--
-- 1) "stack depth limit exceeded" al crear un periodo (o cualquier escritura
--    protegida por rol): mi_rol() lee `perfiles`, y las políticas RLS de
--    `perfiles` llaman a mi_rol() → recursión infinita. Con SECURITY DEFINER la
--    lectura interna corre como dueño de la tabla y salta RLS, cortando el
--    ciclo. La función solo devuelve el rol del propio usuario: sigue segura.
--
-- 2) Los triggers de auditoría insertan en `audit_log` con los permisos del
--    usuario que escribe, y `audit_log` no tiene (a propósito) política de
--    INSERT: toda escritura en tablas auditadas (lecturas, recibos, pagos,
--    egresos…) fallaría. SECURITY DEFINER deja que el trigger escriba la
--    bitácora sin abrirle la tabla a nadie.
--
-- 3) El trigger que recalcula el estado de la cuota tras cada pago hace UPDATE
--    a `cuotas`, tabla sin política de escritura (solo la escribe el motor):
--    registrar un pago fallaría. Mismo remedio.
--
-- Nota: esta migración incluye también el arreglo de la 0002 (cast a
-- estado_cuota); si no la aplicaste, no importa: con esta basta.

-- (1) mi_rol sin recursión
create or replace function mi_rol() returns rol_usuario
language sql stable security definer set search_path = public as
$$ select rol from perfiles where user_id = auth.uid() $$;

-- (2) auditoría escribe la bitácora con privilegios propios
create or replace function fn_audit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into audit_log (tabla, registro_id, accion, usuario, antes, despues)
  values (tg_table_name,
          coalesce((to_jsonb(coalesce(new,old))->>'id'),'?'),
          tg_op, auth.uid(),
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return null;
end $$;

-- (3) el estado de la cuota se recalcula con privilegios propios
create or replace function fn_actualiza_estado_cuota() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_pagado integer; v_total integer; v_cuota bigint;
begin
  v_cuota := coalesce(new.cuota_id, old.cuota_id);
  select total_cent into v_total from cuotas where id = v_cuota;
  select coalesce(sum(monto_cent),0) into v_pagado from pagos where cuota_id = v_cuota;
  update cuotas set estado = (case
      when v_pagado = 0 then 'pendiente'
      when v_pagado < v_total then 'parcial'
      else 'pagado' end)::estado_cuota
   where id = v_cuota;
  return null;
end $$;
