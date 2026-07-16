# Matriz de responsabilidades y flujos · Chardin 177

Documento de referencia para validar que cada tarea está asignada a un solo rol, sin duplicaciones ni vacíos. Fuente de verdad para el reparto de permisos. Julio 2026.

> **Cambio de diseño (jul-2026): la transparencia es PÚBLICA.**
> El "vecino" ya **no es un usuario con clave**: es el **público general** que abre la
> web `/transparencia` (link que se comparte por WhatsApp). Esa página muestra caja,
> gastos con comprobante, consumo de agua, semáforo de pagos (con montos y número de
> dpto) y el estado de cuenta de cada dpto, **en vivo y sin login**. Es de **solo
> lectura**. El login queda **solo para los roles que escriben**: administración,
> tesorería y portería. A nivel de base de datos, el rol `anon` (público) puede LEER
> únicamente las tablas de transparencia (RLS `pub_*`, migración `0008`) y **no puede
> escribir nada** (ver "Nota de seguridad" al final).

## Principio rector

**Cada dato se ingresa una sola vez, por el rol más cercano a la fuente, y todo lo demás se calcula o se jala automáticamente.** Nadie re-digita un dato que el sistema ya tiene.

## Matriz: quién hace qué (una X = responsable; "ve" = solo lectura)

Los tres primeros son roles **con login**. La última columna es el **público** (web
abierta `/transparencia`), no un usuario: solo lectura, sin clave.

| Tarea | Portero | Tesorería | Administración | Público (web) |
|---|---|---|---|---|
| Ingresar las 10 lecturas de agua del mes | **X** | (respaldo) | (respaldo) | ve |
| Subir foto del medidor | **X** | | | |
| Registrar recibo de agua (Sedapal) y luz | | **X** | (respaldo) | ve |
| Calcular cuotas del mes | | **X** | (respaldo) | |
| Emitir el periodo | | **X** | **X** | ve resultado |
| Registrar pagos de cuotas + comprobante | | **X** | (respaldo) | ve |
| Registrar egresos / gastos + comprobante | | **X** | **X** | ve |
| Registrar mantenimiento / incidencia | | **X** | **X** | ve |
| Cerrar el mes (cuadra caja, arrastra saldo) | | **X** | **X** | ve |
| Crear cuota extraordinaria / derrama | | **X** | **X** | ve |
| Definir cuotas fijas (vigilancia, manto) | | | **X** | ve |
| Gestionar usuarios/roles | | | **X** | |
| Ver caja, gastos, semáforo, consumo | ve* | ve | ve | **ve (web pública)** |
| Ver estado de cuenta de cada dpto | | ve | ve | **ve (web pública)** |

\* El portero, por diseño, solo entra a Lecturas. No se le muestra el resto en la
interfaz; a nivel de datos sigue siendo un usuario autenticado (ver nota de seguridad).

## Reglas anti-duplicación (lo que pediste)

1. **La lectura anterior NUNCA se digita.** El sistema la jala automáticamente de la lectura actual del mes anterior. El portero solo ingresa la lectura ACTUAL de cada dpto. (Verificar en la app: en la prueba de julio se ingresaron ambas; el primer mes es la única excepción porque no hay mes previo, ahí sí se carga la base una vez.)
2. **El recibo se sube una vez** (tesorería) y de ahí la cuota de agua se calcula sola por consumo. Nadie más lo toca.
3. **La cuota no se digita:** se calcula del recibo + lecturas + cuotas fijas. El único input humano son esos datos base.
4. **El saldo inicial de caja no se digita:** es el saldo final del mes anterior, automático.
5. **El pago cambia el estado solo:** al registrar un pago, el semáforo y el estado (pendiente/parcial/pagado) se recalculan sin intervención.

## Flujo de mantenimiento / incidencias (el vacío que faltaba)

Decisión tomada: **el vecino avisa por fuera (WhatsApp del edificio); tesorería o administración lo registran en el sistema.** No hay un módulo de "reporte del vecino"; se mantiene simple.

Flujo:
1. Un vecino avisa de un problema (ascensor, filtración, etc.) por el canal del edificio.
2. **Tesorería o administración** registra el mantenimiento como un egreso, con su categoría (Ascensor, Reparaciones, etc.), monto, fecha y comprobante.
3. Ese egreso entra a la caja del mes en curso automáticamente.
4. Todos los vecinos lo ven en el dashboard de transparencia con su comprobante.

Si el arreglo es grande y requiere cobrar aparte a los vecinos, se usa el flujo de cuota extraordinaria (abajo).

## Flujo de cuota extraordinaria / derrama

Decisión tomada: **administración o tesorería pueden crearlas.**

Flujo:
1. Se acuerda en junta el gasto extraordinario (ej. pintar fachada, S/200 por dpto).
2. **Administración o tesorería** crea la cuota extra: concepto, monto total o monto por dpto, y prorrateo (igual para todos, o personalizado).
3. Se inyecta como "Extra" en el borrador del siguiente periodo, sumándose a la cuota normal de cada dpto.
4. Cada vecino la ve desglosada en su recibo.

## Flujo de constancia / comprobante de pago del vecino

Decisión tomada (jul-2026): **el vecino ya no sube constancias por sí mismo** (no
tiene login). El flujo se simplifica:

1. El vecino paga por yape/transferencia y **envía su comprobante por el WhatsApp del edificio.**
2. **Tesorería registra el pago** directamente en Cobranza (con el comprobante adjunto).
3. El pago cambia el semáforo del dpto al instante y queda visible en la web pública.

(La auto-subida de constancias por el vecino, de la Fase 3.7, quedó obsoleta al
abrir la transparencia; el registro directo por tesorería cubre el mismo caso.)

## Nota de seguridad (resuelta por la migración 0008)

La transparencia es pública **por diseño**, pero con límites claros a nivel de base de datos:

- **Lectura pública (rol `anon`) SOLO de las tablas de transparencia:** departamentos,
  periodos, cuotas, pagos, recibos, lecturas, egresos, categorías, provisiones,
  movimientos, ajustes, cuotas fijas, conciliaciones y documentos.
- **Datos personales fuera del alcance público:** `perfiles`, `residentes`,
  `audit_log` y `constancias_pago` **no** tienen política `anon` → el público no las lee.
- **Toda escritura exige un rol autenticado.** Ninguna acción (registrar pagos, egresos,
  emitir, cerrar, calcular) corre sin login: las políticas de escritura son
  `to authenticated` con `mi_rol()`, y a las funciones `generar_cuotas` / `emitir_periodo`
  / `cerrar_periodo` se les **revocó el EXECUTE** a `anon`.
- **Comprobantes:** el público ve solo los comprobantes de **egresos** (objetos
  `egreso-%` en Storage). Los comprobantes de pagos y las fotos de medidores siguen privados.
- El **portero** sigue siendo un usuario autenticado; la interfaz solo le muestra Lecturas.
