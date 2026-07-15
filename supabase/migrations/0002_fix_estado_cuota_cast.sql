-- Corrige un bug del trigger que actualiza el estado de la cuota al registrar pagos.
--
-- Problema: `update cuotas set estado = case ... 'pagado' end` construye un CASE
-- de literales de texto; Postgres lo resuelve como `text` y NO existe conversión
-- implícita text → estado_cuota (enum). Resultado: cualquier INSERT/UPDATE/DELETE
-- en `pagos` fallaba con "column estado is of type estado_cuota but expression is
-- of type text". Sin pagos registrados aún, el error no se había manifestado.
--
-- Solución: castear el CASE a estado_cuota. Aplica esta migración en tu Supabase
-- (SQL Editor) para dejar la base al día.

create or replace function fn_actualiza_estado_cuota() returns trigger language plpgsql as $$
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
