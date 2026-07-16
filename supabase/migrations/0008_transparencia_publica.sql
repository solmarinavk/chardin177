-- Transparencia PÚBLICA (sin login) — cambio de diseño (jul-2026).
--
-- La parte de transparencia del edificio pasa a ser abierta: cualquiera con el
-- link (WhatsApp del edificio) puede LEER caja, gastos, consumo, semáforo de
-- pagos y estados de cuenta. El rol "residente" deja de existir como usuario.
--
-- SEGURIDAD (lo esencial):
--   · anon (público) puede LEER solo las tablas de transparencia (abajo).
--   · anon NO puede leer datos personales: perfiles, residentes, audit_log,
--     constancias_pago (no llevan política anon → siguen negadas).
--   · anon NO puede ESCRIBIR nada: todas las políticas de escritura son
--     `to authenticated` con mi_rol(); anon no las cumple.
--   · Se cierra un hueco: las funciones generar_cuotas/emitir/cerrar son
--     SECURITY DEFINER; se revoca su ejecución a anon/public (solo authenticated).

-- 1) Privilegio de tabla + política de SELECT para anon en las 14 tablas de
--    transparencia (NO se incluye residentes: tiene datos personales).
grant select on
  departamentos, periodos, cuotas, pagos, recibos_servicios, lecturas_agua,
  egresos, categorias_egreso, provisiones, movimientos_provision, ajustes,
  cuotas_fijas, conciliaciones_agua, documentos
to anon;

do $$ declare t text;
begin
  foreach t in array array['departamentos','periodos','cuotas','pagos',
    'recibos_servicios','lecturas_agua','egresos','categorias_egreso',
    'provisiones','movimientos_provision','ajustes','cuotas_fijas',
    'conciliaciones_agua','documentos']
  loop
    execute format('drop policy if exists pub_%I on %I', t, t);
    execute format('create policy pub_%I on %I for select to anon using (true)', t, t);
  end loop;
end $$;

-- 2) Storage: el público puede ver SOLO los comprobantes de egresos
--    (objetos con nombre 'egreso-%'). Los comprobantes de pagos, constancias y
--    fotos de medidores siguen privados.
drop policy if exists pub_egreso_comprobantes on storage.objects;
create policy pub_egreso_comprobantes on storage.objects for select to anon
  using (bucket_id = 'comprobantes' and name like 'egreso-%');

-- 3) Cerrar el hueco de las funciones (evita que se emita/cierre/calcule con la
--    anon key). anon/public no ejecutan; solo authenticated (la app) y service_role.
revoke execute on function generar_cuotas(bigint) from public, anon;
revoke execute on function emitir_periodo(bigint) from public, anon;
revoke execute on function cerrar_periodo(bigint) from public, anon;
grant execute on function generar_cuotas(bigint), emitir_periodo(bigint), cerrar_periodo(bigint)
  to authenticated, service_role;
