# Fase 1 · MVP núcleo — qué se construyó y cómo probarlo

Con esta fase la operación mensual básica **ya no necesita el Excel**: lecturas →
recibos → cálculo automático → emisión → pagos → semáforo de quién pagó.

## ⚠️ Primero: aplica la migración 0002 en tu Supabase

Encontré un **bug en el `schema.sql`** que ya aplicaste: el trigger que marca una
cuota como pagada fallaba (asignaba texto a una columna de tipo enum). Sin esto,
**registrar cualquier pago da error**. Arréglalo en 1 minuto:

1. Supabase → **SQL Editor** → **New query**.
2. Pega el contenido de `supabase/migrations/0002_fix_estado_cuota_cast.sql` y pulsa **Run**.
3. Debe decir "Success". Listo.

(Los proyectos nuevos ya no tienen el bug: `schema.sql` quedó corregido.)

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

## Notas de diseño

- Todo el dinero se muestra en `S/` pero se guarda en **céntimos enteros**.
- Las escrituras respetan **RLS**: portería solo lecturas; tesorería/admin recibos,
  pagos y emisión; residentes solo lectura.
- Las fotos (medidor, recibo, comprobante) son **opcionales** y van a los buckets
  privados de Supabase.
