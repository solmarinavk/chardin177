# Fase 1 · MVP núcleo — qué se construyó y cómo probarlo

Con esta fase la operación mensual básica **ya no necesita el Excel**: lecturas →
recibos → cálculo automático → emisión → pagos → semáforo de quién pagó.

## 🚨 URGENTE: pon tu base al día (arregla el error al crear periodos)

El error **"stack depth limit exceeded"** que sale en la web al crear un periodo
es un bug del `schema.sql` original (recursión infinita en los permisos por rol).
Se arregla pegando DOS scripts en Supabase → **SQL Editor** → **New query**.
**No necesitas redeploy**: el arreglo vive en la base de datos y aplica al
instante sobre la web ya publicada.

1. Pega TODO el contenido de
   `supabase/migrations/0003_fix_rls_recursion_y_triggers.sql` → **Run**.
   Arregla: crear periodos, guardar lecturas y recibos (auditoría) y registrar
   pagos. _Incluye también el fix de la migración 0002, así que no importa si
   esa no la corriste._
2. Pega TODO el contenido de
   `supabase/migrations/0004_storage_policies.sql` → **Run**.
   Habilita subir y ver las fotos (medidores, recibos, comprobantes).

Después de esto, vuelve a la web, recarga y crea el periodo: debe funcionar.

(Los proyectos nuevos no necesitan nada de esto: `schema.sql` quedó corregido.)

## Lo que ya está en el repo

| Ruta | Qué hace | Quién entra |
|---|---|---|
| `/periodos` | Crear periodo del mes (un solo borrador a la vez) y ver la lista | tesorería, admin (residentes ven) |
| `/lecturas` | Ingresar las 10 lecturas: valida ≥ anterior, alerta variación > 60%, foto opcional | portería, tesorería, admin |
| `/periodos/[id]` | Recibos de agua/luz, **calcular cuotas**, revisar el borrador con desglose e invariantes, **Emitir**, y registrar **pagos** | tesorería, admin (todos ven) |
| semáforo | En el periodo emitido, los 10 dptos en 🟢 pagó / 🟡 parcial / 🔴 pendiente | todos |
| `/estado-cuenta` | Cargos vs. abonos y saldo por departamento | todos |

## Lo que está VERIFICADO con tests (corre `npm test`)

- **Motor `generar_cuotas`** reproduce junio y julio reales al céntimo (tolerancia
  de la regla del residuo). `tests/motor.test.ts`
- **Ciclo de vida**: un solo borrador, periodo emitido inmutable, el pago cambia el
  estado (pendiente→parcial→pagado), y el cierre cuadra la caja y arrastra el saldo.
  `tests/lifecycle.test.ts`
- **Dinero en céntimos** y prorrateo. `tests/centimos.test.ts`

Los tests corren contra **Postgres de verdad** (embebido, sin depender de internet).

## Cómo pruebas TÚ el flujo completo (en la web, tras el deploy o en local)

> Nota: desde este entorno en la nube no pude probar la interfaz en vivo porque el
> acceso de red a Supabase está bloqueado por la política del entorno (ver el
> resumen del chat). Estos son los pasos para que lo verifiques tú.

1. Entra como **tesorería** → **Periodos** → crea el periodo del mes (ej. julio 2026).
2. Entra como **portería** → **Lecturas** → ingresa las 10 lecturas actuales. Guarda.
3. Vuelve como **tesorería** → abre el periodo → sube el **recibo de agua** y el de **luz**.
4. Pulsa **Calcular cuotas** → revisa el borrador: el desglose por dpto y el cuadre
   (Σ agua = recibo, Σ luz = recibo). Deben salir ✓.
5. Pulsa **Emitir**. A partir de aquí las cuotas quedan congeladas.
6. En el periodo emitido, registra un **pago** de un dpto (parcial o total). Mira cómo
   el **semáforo** cambia a 🟡/🟢 y el **estado de cuenta** refleja el abono.
7. Intenta editar una lectura del periodo emitido: la base lo **bloquea** (inmutable).

## La experiencia (rediseño UX)

La app está pensada para que **nadie tenga que preguntarse qué toca hacer**:

- **El GPS del mes**: en Inicio y en cada periodo hay una guía de 6 pasos
  (lecturas → recibos → calcular → emitir → cobranza → cerrar) que marca lo
  hecho en verde y lo que toca con un botón grande "Te toca ahora".
- **Barra inferior tipo app** en el celular (Inicio · Lecturas · Periodos ·
  Cuenta), pensada para el portero y los vecinos.
- **Lecturas**: cada departamento es una tarjeta que se pone verde al
  completarse, muestra los m³ consumidos al instante, alerta si el consumo es
  raro, y el botón Guardar flota siempre a la vista con el avance (7/10). El
  campo de foto abre directo la cámara del celular.
- **Cobranza**: barra de recaudación (S/ X de S/ Y), semáforo con montos por
  departamento y registro de pago con el saldo exacto precargado.
- **Cada rol ve solo lo suyo**: el inicio de portería es un solo botón gigante;
  el de tesorería es el GPS; el del residente muestra su cuota y el semáforo.

## Notas de diseño

- Todo el dinero se muestra en `S/` pero se guarda en **céntimos enteros**.
- Las escrituras respetan **RLS**: portería solo lecturas; tesorería/admin recibos,
  pagos y emisión; residentes solo lectura. Ahora hay **tests por rol**
  (`tests/rls.test.ts`) que simulan usuarios reales y cubren la regresión del
  bug de producción.
- Las fotos (medidor, recibo, comprobante) son **opcionales** y van a los buckets
  privados de Supabase (políticas en la migración 0004).
