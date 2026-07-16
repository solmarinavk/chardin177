# ROADMAP · Chardin 177

Cada fase es una serie de sesiones de Claude Code. Marca los checkboxes al completar. No avanzar de fase con tests en rojo.

---

## Cambio de diseño · Transparencia PÚBLICA (jul-2026)

Decisión tomada: **la transparencia del edificio es una web abierta, sin login.** El
"vecino/residente" deja de ser un usuario con clave y pasa a ser el **público general**
que abre el link (se comparte por WhatsApp). El login queda **solo para los roles que
escriben**: administración, tesorería y portería. Ver `docs/MATRIZ_ROLES.md`.

- [x] T.1 Página pública `/transparencia` (sin login, solo lectura): caja + provisiones
  + disponible, semáforo de pagos del mes con montos y número de dpto, estado de cuenta
  de cada dpto con deudas por antigüedad, gastos con comprobante y consumo de agua 6
  meses. _(app/transparencia + lib/transparencia.ts con cliente anónimo)_
- [x] T.2 Portada: botón grande **"Ver la transparencia del edificio"** + enlace discreto
  **"Ingresar"** (administración). _(app/page.tsx)_
- [x] T.3 Se elimina el rol `residente` de los menús, `requireRol` y el seed; el login es
  solo admin/tesorería/portería. La auto-subida de constancias (3.7) queda obsoleta.
- [x] T.4 **RLS de lectura pública** (`supabase/migrations/0008_transparencia_publica.sql`):
  el rol `anon` LEE solo las tablas de transparencia; **no** lee `perfiles`/`residentes`/
  `audit_log`/`constancias_pago`; **no** escribe nada; se revoca EXECUTE de las funciones
  del motor a `anon`. Verificado con `tests/rls.test.ts` (test del público anónimo).
- [ ] T.5 **Lo que corres tú en Supabase:** aplicar la migración `0008` en el SQL Editor y
  **eliminar el usuario `vecinos@chardin177.pe`** en Authentication → Users (ya no se usa).
  Luego re-deploy en Netlify.

---

## FASE 0 · Fundaciones (1 a 2 sesiones)

- [x] 0.1 Inicializar Next.js 14 + TypeScript + Tailwind. Configurar `netlify.toml` con el plugin de Next.js. Primer deploy a Netlify (página "Chardin 177, próximamente"). _(Código y config listos; el deploy es el Paso 5 de la guía, lo haces tú.)_
- [ ] 0.2 Crear proyecto en Supabase (región `sa-east-1`). Guardar keys en `.env.local` y en Netlify env vars. _(Paso manual tuyo en supabase.com; ver resumen.)_
- [x] 0.3 Aplicar `supabase/schema.sql` como primera migración. Verificar que las 10 filas de `departamentos` y los datos semilla existen. _(Migración `supabase/migrations/0001_schema_inicial.sql` + `supabase/verificar_semilla.sql`.)_
- [x] 0.4 Auth con magic link. Página de login. Hook `useSession`. Tabla `perfiles` conectada a `auth.users` con trigger de alta. _(Implementado con **email + contraseña** y `scripts/seed_perfiles.ts`, según el Prompt Maestro, no magic link.)_
- [x] 0.5 Sistema de roles: helper `getRol()`, layout protegido por rol, página de "sin acceso".
- [ ] 0.6 Crear los **3 usuarios reales** con login (admin, tesorería, portería) y verificar RLS a mano: el portero NO puede leer pagos, y el público anónimo NO puede escribir nada (ver test del público en `tests/rls.test.ts`). _(Los usuarios se crean en Supabase Auth + `npm run seed:perfiles`; pasos en el resumen. El "vecino" ya no es un usuario — ver "Cambio de diseño · Transparencia PÚBLICA".)_
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
- [x] 1.10 PWA instalable (pedida 15/07/2026): manifest + iconos + modo standalone, para agregar la app a la pantalla de inicio del celular como una app nativa.
- [x] 1.11 Ajustes de la auditoría por roles (15/07/2026): guardado parcial de lecturas, anular pagos equivocados, ver las fotos subidas (recibos/comprobantes/medidores), y cierre de módulos financieros para portería a nivel UI. Detalle en `docs/AUDITORIA_ROLES.md`.

**Salida de fase:** la operación mensual básica ya no necesita el Excel. _(Motor y ciclo de vida verificados con tests contra Postgres real; falta prueba del UI en vivo — pendiente de habilitar el acceso de red a Supabase, ver docs/FASE_1.md.)_

## FASE 2 · Caja completa y transparencia (2 a 3 sesiones)

- [x] 2.1 Módulo de egresos: concepto, categoría (catálogo del edificio), monto, fecha, comprobante, pagado sí/no. Lista filtrable. _(/caja, con marcar pagado/por pagar y anular)_
- [x] 2.2 Libro de caja del periodo: saldo inicial (auto), ingresos (Σ pagos), egresos, saldo actual en vivo. _(/caja + resumen en el cierre; requiere migración 0005)_
- [x] 2.3 Cierre de mes: botón **Cerrar** (tesorería) que valida que no queden cuotas pendientes sin decisión (o las pasa a cuenta corriente como deuda), fija saldo_final y crea el periodo siguiente con saldo arrastrado. _(Paso 6 del GPS; los pagos atrasados de meses cerrados entran a la caja del mes en que se cobran — migración 0005)_
- [x] 2.4 Dashboard de transparencia (home para residentes): saldo de caja, semáforo del mes, últimos 10 egresos con comprobante, gráfico de consumo de agua por dpto de los últimos 6 meses, provisiones. _(/inicio; el gráfico es small multiples accesible)_
- [x] 2.5 Morosidad: vista de deudas acumuladas por dpto entre periodos, con antigüedad. _(sección "Deudas por departamento" en /estado-cuenta)_

## FASE 3 · Fino operativo (3 a 4 sesiones)

> Los roles de cada flujo siguen `docs/MATRIZ_ROLES.md` (fuente de verdad del reparto de permisos).

- [x] 3.1 Provisiones: catálogo (vacaciones, CTS, gratificación), aporte mensual automático al cerrar mes, registro de uso, saldo acumulado en dashboard.
- [x] 3.2 Cuota extraordinaria / derrama (roles: **admin o tesorería**, ver matriz): crear la derrama con concepto y monto total **o** monto por dpto, con prorrateo **igual o personalizado**; se inyecta como **EXTRA** en el borrador del siguiente periodo, sumándose a la cuota normal; cada vecino la ve desglosada en su recibo. A nivel de datos ya está soportado (tabla `ajustes` con `origen='cuota_extra'`, que el motor lee); falta la UI de creación con vista previa.
- [x] 3.3 Conciliación de agua: asistente que toma un rango de periodos, compara cobrado vs facturado real (input manual del total Sedapal del rango), prorratea la diferencia por consumo y genera AJUSTES para el siguiente periodo, con vista previa antes de aplicar. Replicar la lógica de la hoja "Cuadre Agua".
- [x] 3.4 Recibo por dpto: vista imprimible/compartible con desglose completo, botón "compartir por WhatsApp" (link wa.me con texto del resumen).
- [x] 3.5 Notificaciones por Resend: al emitir (cuota del mes a cada residente) y recordatorio a pendientes el día 25.
- [x] 3.6 Mantenimiento / incidencia como egreso (roles: **tesorería o admin**, ver matriz): el vecino avisa por fuera (WhatsApp del edificio) y tesorería/admin lo registran como un **egreso** con su categoría (Ascensor, Reparaciones, etc.), monto, fecha y comprobante; entra a la caja del mes en curso y se ve en el dashboard de transparencia con su comprobante. **NO hay módulo de reporte del vecino** (decisión de la matriz: se mantiene simple). _Hoy ya se puede registrar como egreso normal; esta tarea es formalizar el flujo: un acceso directo "Registrar mantenimiento" que precargue la categoría, y dejarlo documentado._ Si el arreglo es grande y se cobra aparte, se usa la cuota extraordinaria (3.2).
- [x] 3.7 Constancia de pago del vecino (opcional) + confirmación de tesorería. **⚠️ Superado por el cambio de diseño (jul-2026):** al abrir la transparencia, el vecino ya no tiene login y la **auto-subida de constancias queda obsoleta**. Ahora el vecino envía su comprobante por WhatsApp y **tesorería registra el pago directamente** en Cobranza (mismo resultado). Se retiró la UI de subida del vecino y la acción `subirConstancia`; la confirmación por tesorería se mantiene para resolver constancias que existieran de antes.

## FASE 4 · Historia y blindaje (2 a 3 sesiones)

- [x] 4.1 Migración histórica (`scripts/migrar_excel.ts`): lee el Excel auditado y genera un `.sql` (volcado fiel, sin recalcular con el motor) con periodos `cerrado`, cuotas por depto y saldos arrastrados; valida céntimos y el empalme sin saltos (aborta si no cuadra). Módulo **Documentos** para guardar el Excel. _(Lógica en `lib/migracion.ts` con tests; SQL probado en pglite. Pasos en `docs/MIGRACION_HISTORICA.md`. Tú corres el `.sql` que genera.)_
- [x] 4.2 Bitácora visible: página `/bitacora` (admin) con filtros por módulo, acción y fecha, resumen legible y detalle antes/después. Solo lectura (RLS `sel_audit`).
- [x] 4.3 Backup: `scripts/backup_csv.ts` + Action `.github/workflows/backup.yml` semanal que vuelca las tablas a CSV en la rama `backups`. _(Requiere secrets `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en GitHub.)_
- [x] 4.4 Manual de usuario embebido: página `/ayuda` con el flujo mensual en 6 pasos y temas desplegables, en español simple.
- [x] 4.5 Traspaso de cargo: pantalla `/usuarios` (admin) para reasignar roles con confirmación (queda en bitácora) y gestionar el padrón de residentes. Salvaguarda: no se puede quitar el último admin.
- [x] 4.6 Exportador a Excel: botón **"Descargar Excel"** en caja, estado de cuenta y periodo, más `/exportar` (exportación total) con filtros; `.xlsx` del lado servidor con `exceljs`, una hoja por tipo de dato y montos en soles. Solo admin/tesorería, respetando RLS.

## FASE 5 · Pulido de entrega (UX/UI y flujos)

> Pulido final antes de entregar la plataforma al edificio (jul-2026).

- [x] 5.1 **Edificio visual**: fachada SVG del Chardin 177 (5 pisos × 2 dptos, puerta, azotea, letrero) donde cada ventana se pinta según el estado de pago del mes (verde/ámbar/rojo) y al tocarla muestra el detalle (pagado/pendiente). Reemplaza al semáforo en la página pública y en el inicio de tesorería/admin (ahí, tocar un dpto pendiente lleva directo a cobrarle). Mobile-first a 380px.
- [x] 5.2 **Exportar Excel público** (sin login): botón "Descargar Excel" en la página pública con filtros de rango de meses y tipo de dato. El endpoint usa el **cliente anon**: solo exporta lo que las políticas RLS `pub_*` permiten leer (cuotas, pagos, egresos, caja, consumo). **Nunca** residentes, perfiles, audit_log ni constancias — verificado con test de no-filtración.
- [x] 5.3 **Copy neutro** en la página pública: se renombra "Transparencia del edificio" por un título descriptivo sin narrativa de antes/después, y se revisa todo el texto de la página con ese criterio.
- [x] 5.4 **Flujos sin fricción** (regla: si el dato ya existe, no se vuelve a pedir): (a) registrar pago en un toque desde el edificio con monto y fecha precargados; (b) el monto del mes anterior como referencia junto a cada recibo; (c) autoguardado de lecturas al salir del campo (el botón queda como confirmación); (d) fecha de pago = hoy y medio de pago recordando el último usado; (e) selector de mes en la página pública para ver meses anteriores; (f) botón "Compartir por WhatsApp" con el resumen del mes.
- [x] 5.5 **Revisión general de UX**: recorrido con ojos de usuario nuevo — estados vacíos con guía, textos de botones que dicen qué pasa, confirmaciones solo donde el error es costoso, y lenguaje consistente en toda la app.

## Backlog (ideas futuras, no bloquean nada)

- [x] **Definir cuotas fijas desde la UI** (rol admin): pantalla `/cuotas-fijas` para versionar vigilancia, mantenimiento, materiales y agua común. Cada cambio crea una versión nueva (`vigente_desde`); el motor toma la vigente de cada periodo. Construida junto a la Fase 4.
- [ ] Modo offline para la PWA (service worker con caché del último estado)
- [ ] Decidir en junta si portería debe poder LEER datos financieros vía API (hoy el schema da lectura a todo autenticado; la UI ya se lo oculta). _Nota: el lado **público** ya está acotado por la migración `0008` (el rol `anon` solo lee las tablas de transparencia); esto es solo sobre el usuario autenticado portería._ Ver "Nota de seguridad" en `docs/MATRIZ_ROLES.md`.
- [ ] PIN de acceso rápido para portería
- [ ] Reserva de áreas comunes
- [ ] Exportar reporte anual PDF para la junta
- [ ] Votaciones de junta en línea
