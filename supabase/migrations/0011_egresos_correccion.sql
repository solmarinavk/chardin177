-- 0011 · Correcciones de caja: permitir egresos con monto negativo.
--
-- Por qué (set-2026): el recibo de Sedapal de S/ 434.40 se registró dos veces
-- y el error se descubrió cuando agosto YA estaba cerrado. El candado
-- `fn_bloquea_egreso_cerrado` impide (correctamente) borrar el duplicado, y
-- CLAUDE.md manda corregir "como ajustes en el periodo siguiente"... pero no
-- había forma de devolver plata a la caja: `monto_cent` sólo aceptaba valores
-- >= 0, así que la corrección era imposible sin editar a mano un saldo, que es
-- justo lo que la regla #4 prohíbe.
--
-- Ahora un egreso puede ser negativo. Un egreso negativo DEVUELVE dinero a la
-- caja (saldo = inicial + ingresos − egresos), queda como una línea visible en
-- el libro y en la vista pública, y no toca ni un dato del mes cerrado.
-- Se sigue prohibiendo el 0, que nunca significa nada.

alter table egresos drop constraint if exists egresos_monto_cent_check;

alter table egresos
  add constraint egresos_monto_cent_check check (monto_cent <> 0);

comment on column egresos.monto_cent is
  'Céntimos. Positivo = sale plata de la caja. Negativo = corrección que devuelve plata a la caja (p. ej. anular un gasto duplicado de un mes ya cerrado). Nunca 0.';
