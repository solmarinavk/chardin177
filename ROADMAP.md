# ROADMAP · Chardin 177

Cada fase es una serie de sesiones de Claude Code. Marca los checkboxes al completar. No avanzar de fase con tests en rojo.

---

## FASE 0 · Fundaciones (1 a 2 sesiones)

- [x] 0.1 Inicializar Next.js 14 + TypeScript + Tailwind. Configurar `netlify.toml` con el plugin de Next.js. Primer deploy a Netlify (página "Chardin 177, próximamente"). _(Código y config listos; el deploy es el Paso 5 de la guía, lo haces tú.)_
- [ ] 0.2 Crear proyecto en Supabase (región `sa-east-1`). Guardar keys en `.env.local` y en Netlify env vars. _(Paso manual tuyo en supabase.com; ver resumen.)_
- [x] 0.3 Aplicar `supabase/schema.sql` como primera migración. Verificar que las 10 filas de `departamentos` y los datos semilla existen. _(Migración `supabase/migrations/0001_schema_inicial.sql` + `supabase/verificar_semilla.sql`.)_
- [x] 0.4 Auth con magic link. Página de login. Hook `useSession`. Tabla `perfiles` conectada a `auth.users` con trigger de alta. _(Implementado con **email + contraseña** y `scripts/seed_perfiles.ts`, según el Prompt Maestro, no magic link.)_
- [x] 0.5 Sistema de roles: helper `getRol()`, layout protegido por rol, página de "sin acceso".
- [ ] 0.6 Crear los 4 usuarios reales iniciales (admin, tesorería, portería, 1 residente de prueba) y verificar RLS a mano: el portero NO puede leer pagos, el residente NO puede escribir nada. _(Los usuarios se crean en Supabase Auth + `npm run seed:perfiles`; pasos en el resumen.)_
- [x] 0.7 `lib/centimos.ts`: helpers `aCentimos`, `aSoles`, `formatoPEN`, `prorratear` (con la regla del residuo al mayor consumidor) + tests unitarios.

**Salida de fase:** app deployada con login funcionando y base de datos viva con RLS.

## FASE 1 · MVP núcleo: del medidor al "quién pagó" (3 a 5 sesiones)

- [x] 1.1 CRUD de periodos: crear periodo (año, mes), estados borrador/emitido/cerrado. Solo puede existir un periodo en borrador a la vez. _(/periodos)_
- [x] 1.2 Módulo de lecturas (rol portería): formulario móvil con los 10 dptos, muestra lectura anterior, valida ≥ anterior, alerta variación > 60%, subida opcional de foto del medidor a Storage. _(/lecturas)_
- [x] 1.3 Módulo de recibos (tesorería): registrar monto de recibo de agua y de luz del periodo, con foto del recibo. _(/periodos/[id])_
- [x] 1.4 **Motor de cálculo**: función Postgres `generar_cuotas(periodo_id)`. Implementar exactamente las reglas de `docs/PROPUESTA.md` sección 4.1. Ejecutable solo en borrador; regenera si ya existían cuotas del borrador. _(ya en schema.sql; acción `generarCuotas`)_
- [x] 1.5 **Tests dorados**: script que carga `tests/fixtures/junio_2026.json` y `julio_2026.json` en una DB de prueba, corre el motor y compara cuota por cuota (tolerancia 1 céntimo). Integrar a `npm test`. _(tests/motor.test.ts con pglite, en `npm test`)_
- [x] 1.6 Vista de borrador: tabla de las 10 cuotas calculadas con desglose, invariantes visibles (suma % = 100%, cuadre total). Botón **Emitir** (congela, cambia estado, registra en audit_log). _(CuotasDesglose + Emitir)_
- [x] 1.7 Módulo de pagos (tesorería): en el periodo emitido, marcar pago por dpto con monto (predefinido = pendiente), fecha, medio (yape/plin/transferencia/efectivo), comprobante. Soporta pago parcial.
- [x] 1.8 **Semáforo público**: página del periodo con los 10 dptos en verde (pagó) / ámbar (parcial) / rojo (pendiente), visible para todo residente logueado.
- [x] 1.9 Estado de cuenta por dpto: cargos vs abonos, saldo. El residente ve el suyo (y el semáforo general). _(/estado-cuenta)_

**Salida de fase:** la operación mensual básica ya no necesita el Excel. _(Motor y ciclo de vida verificados con tests contra Postgres real; falta prueba del UI en vivo — pendiente de habilitar el acceso de red a Supabase, ver docs/FASE_1.md.)_

## FASE 2 · Caja completa y transparencia (2 a 3 sesiones)

- [ ] 2.1 Módulo de egresos: concepto, categoría (catálogo del edificio), monto, fecha, comprobante, pagado sí/no. Lista filtrable.
- [ ] 2.2 Libro de caja del periodo: saldo inicial (auto), ingresos (Σ pagos), egresos, saldo actual en vivo.
- [ ] 2.3 Cierre de mes: botón **Cerrar** (tesorería) que valida que no queden cuotas pendientes sin decisión (o las pasa a cuenta corriente como deuda), fija saldo_final y crea el periodo siguiente con saldo arrastrado.
- [ ] 2.4 Dashboard de transparencia (home para residentes): saldo de caja, semáforo del mes, últimos 10 egresos con comprobante, gráfico de consumo de agua por dpto de los últimos 6 meses, provisiones.
- [ ] 2.5 Morosidad: vista de deudas acumuladas por dpto entre periodos, con antigüedad.

## FASE 3 · Fino operativo (2 a 3 sesiones)

- [ ] 3.1 Provisiones: catálogo (vacaciones, CTS, gratificación), aporte mensual automático al cerrar mes, registro de uso, saldo acumulado en dashboard.
- [ ] 3.2 Cuotas extra: crear derrama con concepto y monto total, prorrateo igual o personalizado, se inyecta como EXTRA en el siguiente borrador.
- [ ] 3.3 Conciliación de agua: asistente que toma un rango de periodos, compara cobrado vs facturado real (input manual del total Sedapal del rango), prorratea la diferencia por consumo y genera AJUSTES para el siguiente periodo, con vista previa antes de aplicar. Replicar la lógica de la hoja "Cuadre Agua".
- [ ] 3.4 Recibo por dpto: vista imprimible/compartible con desglose completo, botón "compartir por WhatsApp" (link wa.me con texto del resumen).
- [ ] 3.5 Notificaciones por Resend: al emitir (cuota del mes a cada residente) y recordatorio a pendientes el día 25.

## FASE 4 · Historia y blindaje (2 a 3 sesiones)

- [ ] 4.1 Migración histórica (`scripts/migrar_excel.ts`): importar el Excel `Chardin_177_Historico.xlsx` (formato tabla larga, ya auditado y validado), leído vía **service role key solo en local**. Cargar la hoja `Cuotas` (una fila por depto por mes, feb-2024 a jul-2026) como periodos en estado `cerrado` con sus cuotas por depto, y la hoja `Caja` como los saldos mensuales arrastrados. **Se carga tal cual, sin recalcular con el motor** (los datos ya están validados). El script valida que los saldos cuadran y que el **saldo final del último mes histórico (jul-2026) empalma sin saltos** con el saldo inicial del primer periodo operativo de la plataforma; aborta si no cuadra. Guardar además el Excel histórico como **documento descargable** en el módulo Documentos.
- [ ] 4.2 Bitácora visible: página de auditoría (admin) con filtros por tabla, usuario y fecha.
- [ ] 4.3 Backup: GitHub Action semanal que exporta las tablas a CSV en el repo (rama `backups`).
- [ ] 4.4 Manual de usuario embebido: página /ayuda con el flujo mensual paso a paso con capturas.
- [ ] 4.5 Traspaso de cargo: pantalla de admin para reasignar roles con confirmación y registro en bitácora.
- [ ] 4.6 Exportador a Excel: botón **"Descargar Excel"** en cada módulo (pagos, egresos, estado de cuenta, caja) que exporta lo que se ve, más una pantalla de **"Exportación total"** con filtros por periodo, rango de meses, dpto y tipo de dato, generando un `.xlsx` con **una hoja por tipo de dato y montos en soles**. Generación **del lado servidor** con `exceljs` o `SheetJS`. Permisos: **admin y tesorería exportan todo; residente solo su propio estado de cuenta** (respetando RLS).

## Backlog (ideas futuras, no bloquean nada)

- [ ] PIN de acceso rápido para portería
- [ ] Registro de incidencias/mantenimientos del edificio
- [ ] Reserva de áreas comunes
- [ ] Exportar reporte anual PDF para la junta
- [ ] Votaciones de junta en línea
