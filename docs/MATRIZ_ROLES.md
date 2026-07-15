# Matriz de responsabilidades y flujos · Chardin 177

Documento de referencia para validar que cada tarea está asignada a un solo rol, sin duplicaciones ni vacíos. Fuente de verdad para el reparto de permisos. Julio 2026.

## Principio rector

**Cada dato se ingresa una sola vez, por el rol más cercano a la fuente, y todo lo demás se calcula o se jala automáticamente.** Nadie re-digita un dato que el sistema ya tiene.

## Matriz: quién hace qué (una X = responsable; "ve" = solo lectura)

| Tarea | Portero | Tesorería | Administración | Vecino |
|---|---|---|---|---|
| Ingresar las 10 lecturas de agua del mes | **X** | (respaldo) | (respaldo) | ve |
| Subir foto del medidor | **X** | | | |
| Registrar recibo de agua (Sedapal) y luz | | **X** | (respaldo) | ve |
| Calcular cuotas del mes | | **X** | (respaldo) | |
| Emitir el periodo | | **X** | **X** | ve resultado |
| Registrar pagos de cuotas + comprobante | | **X** | (respaldo) | ve el suyo |
| Confirmar constancia subida por vecino | | **X** | (respaldo) | |
| Registrar egresos / gastos + comprobante | | **X** | **X** | ve |
| Registrar mantenimiento / incidencia | | **X** | **X** | ve |
| Cerrar el mes (cuadra caja, arrastra saldo) | | **X** | **X** | ve |
| Crear cuota extraordinaria / derrama | | **X** | **X** | ve |
| Definir cuotas fijas (vigilancia, manto) | | | **X** | ve |
| Gestionar residentes y usuarios/roles | | | **X** | |
| Subir su propia constancia de pago (opcional) | | | | **X** |
| Ver dashboard, caja, gastos, semáforo | ve* | ve | ve | ve |
| Ver su estado de cuenta | | ve | ve | **X** (el suyo) |

\* El portero, por diseño, solo entra a Lecturas. No se le muestra el resto (ver nota de seguridad abajo).

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

## Flujo de constancia de pago del vecino (opcional)

Decisión tomada: **el vecino PUEDE subir su constancia, pero no es obligatorio.**

Flujo:
1. El vecino paga por yape/transferencia.
2. **Opcional:** sube la foto de su constancia desde su estado de cuenta (queda "pendiente de confirmar").
3. **Tesorería confirma** ese pago (lo valida y lo registra oficialmente), o lo registra directo si el vecino no subió nada.
4. El pago solo cuenta como oficial cuando tesorería lo confirma. La constancia del vecino es una ayuda, no reemplaza la confirmación.

## Nota de seguridad pendiente (decisión de junta)

Hoy, a nivel de base de datos, cualquier usuario autenticado puede LEER todo (transparencia total). La interfaz ya le oculta al portero todo lo que no sean lecturas, pero técnicamente por API podría leer datos de pagos. Dos opciones a decidir en junta:
- **Mantener así:** transparencia total, el portero es de confianza. Simple.
- **Restringir en base:** que el portero solo pueda leer lecturas también a nivel de datos. Más estricto, algo más de trabajo.

Esto no bloquea nada; es una decisión de política del edificio.
