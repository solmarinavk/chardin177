-- 0012 · Portería puede registrar los recibos de agua y luz del mes.
--
-- Por qué (set-2026): los recibos le llegan al portero (Sedapal por la web,
-- Luz del Sur en papel). Hasta ahora tenía que mandarlos por WhatsApp para
-- que tesorería los digitara: un paso más y otra persona escribiendo montos
-- a mano. Ahora el portero sube el monto y la foto/PDF desde su pantalla de
-- lecturas; tesorería los ve en el periodo y sigue siendo quien calcula y
-- emite.
--
-- Alcance acotado a propósito:
--   · INSERT y UPDATE, nunca DELETE.
--   · El trigger `tg_lock_recibos` ya impide tocar recibos de un mes emitido
--     o cerrado, así que sólo puede cargar/corregir los del mes en preparación.
--   · La subida del archivo al bucket `comprobantes` ya estaba permitida a
--     portería desde la migración 0004 (sube ahí las fotos de los medidores).

drop policy if exists ins_recibos_porteria on recibos_servicios;
create policy ins_recibos_porteria on recibos_servicios
  for insert to authenticated
  with check (mi_rol() = 'porteria');

drop policy if exists upd_recibos_porteria on recibos_servicios;
create policy upd_recibos_porteria on recibos_servicios
  for update to authenticated
  using (mi_rol() = 'porteria')
  with check (mi_rol() = 'porteria');
