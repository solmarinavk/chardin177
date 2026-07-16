# Fase 2 · Caja completa y transparencia — qué se construyó y cómo probarlo

Con esta fase el ciclo mensual queda **completo**: lecturas → recibos → calcular
→ emitir → cobrar → **cerrar el mes** (el saldo pasa solo al mes siguiente).
Además los vecinos ven la caja, los gastos con comprobante y el consumo de agua.

## 🚨 Primero: aplica la migración 0005 en tu Supabase

Igual que antes: **SQL Editor → New query**, pega TODO el contenido de
`supabase/migrations/0005_caja_cierre.sql` y pulsa **Run**. Sin esto, el cierre
de mes y el libro de caja no funcionan.

Qué trae (y por qué importa): arregla un problema contable de fondo del schema
original — un **pago atrasado** (ej. la deuda de julio pagada en septiembre) no
entraba a la caja de ningún mes y el saldo del sistema se desviaba del real para
siempre. Ahora la caja funciona **por fecha de cobro**, como una caja de verdad:

- Al cerrar un mes se suman TODOS los pagos aún no contabilizados (del mes o
  atrasos de meses cerrados) y quedan marcados con ese cierre.
- Un pago que ya entró a un cierre es **inmutable** (ni editar ni anular).
- Los egresos de un mes cerrado quedan **congelados**; un recibo que llega tarde
  se registra como egreso del mes abierto.

## Lo nuevo en la app

| Dónde | Qué hay | Quién |
|---|---|---|
| `/caja` | **Libro de caja** en vivo (saldo inicial → + ingresos − egresos = saldo actual), **registro de egresos** (concepto, categoría, monto, fecha, comprobante, pagado sí/no), lista **filtrable** por mes y categoría con marcar pagado/anular, e **historial de meses cerrados** | tesorería/admin gestionan; residentes ven |
| `/periodos/[id]` | Sección **"Cerrar el mes"** (paso 6 del GPS): resumen de caja, aviso de morosos ("X dptos deben S/ Y, pasarán como deuda") y de egresos por pagar, botón Cerrar con confirmación | tesorería/admin |
| `/inicio` | **Dashboard de transparencia**: saldo de caja en vivo, provisiones apartadas y disponible real, últimos 5 gastos con comprobante, y **gráfico de consumo de agua por dpto (6 meses)** | todos menos portería |
| `/estado-cuenta` | **"Deudas por departamento"**: cuánto debe cada uno, desglosado por mes con **antigüedad** (alerta roja si pasa de 2 meses) | tesorería/admin/residentes |

## Cómo lo pruebas TÚ (flujo completo de un mes)

1. Como **tesorería**, con julio emitido: entra a **Caja** → registra un par de
   egresos (ej. "Sueldo vigilante" S/ 2,000 pagado; "Luz común" por pagar).
   Mira cómo el saldo actual baja solo con los pagados.
2. Registra algunos **pagos** en el periodo (Periodos → julio → Cobranza).
3. Abre el periodo → baja a **"Cerrar el mes"**: revisa el resumen (inicial +
   ingresos − egresos), lee los avisos y pulsa **Cerrar**.
4. Verifica: el periodo queda **cerrado** con su saldo final; **agosto ya
   existe** en borrador con ese saldo como inicial; en **Caja** aparece julio en
   "Meses cerrados".
5. Prueba la regla de oro: intenta **anular un pago de julio** (ya cerrado) —
   la base lo bloquea con un mensaje claro. Un moroso de julio **sí** puede
   pagar: su pago entrará a la caja del mes en que se cobre.
6. Entra como **vecinos**: el inicio muestra la caja, los gastos y el gráfico
   de agua; en **Cuenta** está la sección de deudas con antigüedad.

## Verificado con tests (47 en verde)

- Cierre cuadra caja y arrastra saldo; **pago atrasado entra al cierre
  siguiente** (test dedicado); pago contabilizado inmutable; egresos bloqueados
  en mes cerrado.
- Todo lo anterior (motor al céntimo, RLS por rol, PWA) sigue en verde.

## Nota sobre el saldo inicial del primer mes

El primer periodo operativo muestra saldo inicial S/ 0.00 con una nota: el saldo
real (~S/ 9,746) se fijará con la **migración histórica del Excel (Fase 4)**.
Nunca se digita a mano (regla de oro #4).
