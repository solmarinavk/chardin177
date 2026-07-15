# CHARDIN 177 · Plataforma 360 de Administración del Edificio

**Propuesta técnica y operativa completa.** Versión 1.0, julio 2026.

---

## 1. El problema

Hoy la contabilidad vive en un Excel que depende de dos personas (presidenta y tesorera) que van a renunciar. La auditoría del archivo demostró que la lógica es sana pero el archivo es frágil: 178 fórmulas muertas, referencias rotas, y todo el conocimiento operativo está en la cabeza de quien lo maneja. Si nadie lo hereda bien, el edificio pierde su contabilidad.

## 2. La solución

Una plataforma web donde **el sistema es el que sabe cómo se calcula todo**, y las personas solo ingresan datos simples:

- El **portero** ingresa las lecturas del medidor de agua de cada departamento (desde su celular).
- La **tesorera** (o quien la reemplace) sube el monto de los recibos de agua y luz, registra pagos y gastos.
- El **sistema** calcula automáticamente la cuota de cada departamento, genera los recibos, lleva la caja, arrastra saldos y muestra en tiempo real quién pagó y quién no.
- **Todos los vecinos** ven todo: transparencia total de ingresos, gastos, saldo y comprobantes. Pero solo los roles autorizados pueden escribir.

El cambio de junta directiva deja de ser un drama: se reasigna un rol en 30 segundos y la historia completa queda intacta.

## 3. Contexto del edificio (datos duros)

| Dato | Valor |
|---|---|
| Departamentos | 10 (5 pisos × 2): 101, 102, 201, 202, 301, 302, 401, 402, 501, 502 |
| Cuota mensual típica | S/ 430 a 590 por departamento |
| Recaudación mensual | ~S/ 4,500 a 5,300 |
| Componentes de la cuota | Agua (común + consumo), Luz común, Vigilancia, Mantenimiento, Materiales, Extras/Ajustes |
| Provisiones | Vacaciones, CTS y gratificación del vigilante (~S/ 3,600 acumulado) |
| Saldo de caja actual | ~S/ 9,750 |
| Servicios recurrentes | Sedapal, luz común, vigilante, ascensor, montavehículo, jardinería, limpieza |

## 4. Reglas de negocio (el corazón, extraídas del Excel real)

### 4.1 Cálculo de la cuota mensual por departamento

```
AGUA COMÚN     = S/ 15.00 fijo por departamento (S/ 150 en total)
AGUA CONSUMO   = (Δm3 del dpto / Σ Δm3 de todos) × (recibo Sedapal − 150)
                 donde Δm3 = lectura_actual − lectura_anterior
LUZ            = recibo de luz común / 10
VIGILANCIA     = total presupuestado / 10   (versionable en el tiempo)
MANTENIMIENTO  = total presupuestado / 10   (ascensor, montavehículo, etc.)
MATERIALES     = S/ 20.00 fijo por departamento (versionable)
EXTRA          = cuota extraordinaria del mes, si la hay
AJUSTE         = corrección de agua u otros arrastrada de conciliaciones

TOTAL DPTO     = suma de todo lo anterior
```

**Invariantes que el sistema debe validar SIEMPRE (lección del Excel):**
1. La suma de los porcentajes de agua debe ser exactamente 100%.
2. La suma de los totales por dpto debe igualar recibo agua + recibo luz + cuotas fijas + extras (al céntimo).
3. Lectura actual ≥ lectura anterior. Si no, bloquear y pedir revisión.
4. Si Σ Δm3 = 0 (caso borde), repartir el agua en partes iguales y alertar.
5. Alertar si el consumo de un dpto varía más de 60% vs su promedio de 6 meses (posible mala lectura del portero).

### 4.2 Ciclo de vida del periodo mensual

```
BORRADOR  →  EMITIDO  →  CERRADO
```
- **Borrador**: se cargan lecturas y recibos, el sistema muestra el cálculo en vivo. Editable.
- **Emitido**: se congelan las cuotas (snapshot inmutable). Los vecinos ven cuánto deben. Ya no se editan lecturas ni recibos de ese mes; toda corrección posterior entra como AJUSTE del mes siguiente (así es como el edificio ya lo hace hoy con las devoluciones de agua).
- **Cerrado**: todos pagaron o la deuda pasó a cuenta corriente. Se calcula el saldo final y se arrastra al mes siguiente automáticamente.

### 4.3 Caja

```
saldo_final = saldo_inicial + Σ pagos recibidos − Σ egresos pagados
```
El saldo_inicial de un periodo es SIEMPRE el saldo_final del anterior (lo calcula el sistema, nunca se digita). Superávit visible = saldo − provisiones − cuentas por pagar.

### 4.4 Pagos y cuenta corriente

- Cada dpto tiene una cuenta corriente: cargos (cuotas) vs abonos (pagos).
- Se aceptan pagos parciales y redondeos (en el Excel hay diferencias de céntimos: el sistema los registra como saldo a favor/en contra que se aplica al mes siguiente, automático).
- Estados por cuota: pendiente, parcial, pagado, vencido.
- El comprobante (foto del yape/transferencia) se adjunta al pago.

### 4.5 Conciliación de agua (el "Cuadre Agua")

Cada cierto número de meses se compara lo cobrado por agua contra lo realmente facturado por Sedapal según lecturas del medidor general. La diferencia se prorratea por consumo y se aplica como AJUSTE (positivo o negativo) en el siguiente periodo. El sistema genera este cuadre con un botón, mostrando el detalle por dpto antes de aplicar.

### 4.6 Provisiones

Fondos apartados mensualmente para obligaciones laborales del vigilante (vacaciones, CTS, gratificación). El sistema acumula y descuenta cuando se paga, y los muestra en el dashboard para que el "superávit" nunca engañe.

## 5. Roles y permisos

| Rol | Puede ver | Puede hacer |
|---|---|---|
| **Admin** (presidencia) | Todo | Todo: configurar cuotas fijas, emitir/cerrar periodos, gestionar usuarios y roles, editar residentes |
| **Tesorería** | Todo | Subir recibos, registrar pagos y egresos con comprobantes, generar conciliaciones |
| **Portería** | Solo módulo de lecturas | Ingresar lecturas de agua del mes (con foto del medidor opcional) |
| **Residente** | Todo en modo lectura: su estado de cuenta, dashboard del edificio, egresos con comprobantes, actas | Nada de escritura. Opcional: subir su constancia de pago para que tesorería la confirme |

Notas de diseño:
- Un usuario puede tener más de un rol (la tesorera también es residente).
- La transferencia de cargo es reasignar el rol: la historia no se toca.
- **Todo cambio queda en bitácora de auditoría** (quién, qué, cuándo, valor anterior y nuevo). Innegociable: es la garantía de confianza entre vecinos.

## 6. Módulos de la plataforma

1. **Dashboard público del edificio**: saldo de caja, quién pagó este mes (semáforo de 10 dptos), últimos gastos con foto de comprobante, provisiones, gráfico de consumo de agua.
2. **Lecturas** (portero): formulario móvil de 10 campos, muestra la lectura anterior al lado, valida en vivo, permite foto del medidor.
3. **Periodo mensual** (tesorería/admin): subir recibos de agua y luz, ver cálculo en borrador, emitir. Botón "generar recibos" produce el detalle por dpto compartible por WhatsApp.
4. **Pagos** (tesorería): marcar pagado por dpto con fecha, monto y comprobante. Vista de morosidad acumulada.
5. **Egresos** (tesorería): registrar gasto con concepto, categoría, monto, fecha, comprobante. Categorías del edificio: Vigilancia, Agua, Luz, Ascensor, Montavehículo, Jardinería, Limpieza, Reparaciones, Materiales, Otros.
6. **Caja**: libro mayor automático, saldo en vivo, cierre de mes.
7. **Conciliación de agua**: asistente del Cuadre Agua.
8. **Cuotas extra**: crear derramas (ej. pintado de fachada) prorrateadas por igual o por porcentaje.
9. **Estado de cuenta por dpto**: cada residente ve su historial de cargos y pagos, y su saldo.
10. **Documentos**: reglamento interno, actas de junta, presupuesto anual.
11. **Usuarios y roles** (admin).
12. **Migración histórica**: importar el Excel auditado para no perder los ~30 meses de historia (script incluido en el roadmap).

## 7. Arquitectura técnica

**Stack elegido pensando en tu flujo GitHub → Claude Code → Netlify y en costo S/ 0:**

```
Frontend:   Next.js 14 (App Router) + Tailwind CSS
Backend:    Supabase (Postgres + Auth + Row Level Security + Storage)
Deploy:     Netlify (plugin oficial de Next.js)
Email:      Resend (free tier) para avisos de emisión y recordatorios
Repo:       GitHub, con Claude Code como par de desarrollo
```

Por qué así:
- **Supabase RLS** hace que los permisos vivan en la base de datos, no en el frontend: aunque alguien manipule la web, la DB no le deja escribir lo que su rol no permite.
- **El motor de cálculo vive en Postgres** (función `generar_cuotas`): es atómico, testeable y no depende del navegador de nadie.
- **Dinero en céntimos (enteros), nunca floats.** El Excel acumulaba colas de decimales (443.7027777...). La plataforma trabaja en céntimos y redondea con regla explícita: el residuo del redondeo se asigna al dpto de mayor consumo (documentado y auditable).
- Sin servidores que mantener, todo free tier: Supabase free (500MB, sobra por décadas para 10 dptos), Netlify free, Resend free.
- Login por **magic link** al correo (los vecinos no manejan contraseñas). El portero puede tener un PIN simple si no usa correo.

### 7.1 Modelo de datos (resumen; el SQL completo está en `supabase/schema.sql`)

```
departamentos ─┬─ residentes
               ├─ lecturas_agua ──── periodos
               ├─ cuotas (snapshot) ─┤
               │    └─ pagos         │
               └─ ajustes            │
periodos ─┬─ recibos_servicios (agua, luz)
          ├─ egresos
          └─ cierres de caja
cuotas_fijas (versionadas por vigencia)
provisiones + aportes_provision
conciliaciones_agua + detalle
perfiles (usuarios + roles)
audit_log (bitácora de todo)
documentos
```

## 8. Flujo operativo mensual (el manual de quien administre)

| Día aprox. | Quién | Qué hace | Tiempo |
|---|---|---|---|
| 1 al 5 | Portero | Ingresa las 10 lecturas de agua desde el celular | 5 min |
| 5 al 10 | Tesorería | Sube monto del recibo Sedapal y de luz (llegan esos días) | 2 min |
| 10 | Tesorería | Revisa el borrador que el sistema calculó y pulsa **Emitir** | 3 min |
| 10 | Sistema | Notifica a cada vecino su cuota por correo, con enlace a su recibo | 0 |
| 10 al 30 | Vecinos | Pagan por yape/transferencia y suben constancia (opcional) | |
| continuo | Tesorería | Marca pagos recibidos; registra gastos cuando ocurren | 1 min c/u |
| fin de mes | Tesorería | Pulsa **Cerrar mes**: el sistema cuadra caja y arrastra saldo | 1 min |
| trimestral | Tesorería | Corre el asistente de conciliación de agua | 10 min |

Total de trabajo humano: **menos de 30 minutos al mes.**

## 9. Seguridad, respaldo y continuidad

- RLS en cada tabla: los permisos se prueban con tests automáticos.
- Bitácora de auditoría inmutable (solo inserción) sobre pagos, egresos, cuotas y roles.
- Backups: Supabase hace backup diario; adicionalmente un GitHub Action semanal exporta la DB a CSV al repo privado (respaldo que el edificio controla).
- Periodos emitidos son inmutables: nadie "arregla el pasado", las correcciones son ajustes visibles.
- Si un día quieren migrar de proveedor, todo es Postgres estándar + CSVs: cero lock-in.

## 10. Costos

| Concepto | Costo |
|---|---|
| Supabase, Netlify, Resend (free tiers) | S/ 0 / mes |
| Dominio opcional (ej. chardin177.com) | ~S/ 45 / año (opcional, Netlify da subdominio gratis) |
| Desarrollo | Tu tiempo + Claude Code |

## 11. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| El portero se equivoca digitando una lectura | Validación en vivo (≥ anterior), alerta por variación anómala, foto del medidor, y el borrador es editable hasta emitir |
| Vecino disputa su cuota | El recibo muestra el desglose completo y las lecturas; la bitácora respalda cada dato |
| Nueva junta no sabe usarlo | El flujo mensual son 4 botones; manual embebido en la app; roles se traspasan en segundos |
| Se corta el free tier de Supabase | Con 10 dptos el uso es ínfimo; el backup semanal a CSV garantiza portabilidad |
| Doble dígito de pago o pago duplicado | Restricción de unicidad + confirmación con monto pendiente visible |

## 12. Fases de construcción

Detalladas con tareas ejecutables en `ROADMAP.md`. Resumen:

- **Fase 0** · Fundaciones: repo, Supabase, schema, auth, roles, deploy a Netlify. → *ya se puede entrar con login*
- **Fase 1** · MVP núcleo: lecturas, recibos, motor de cálculo con tests dorados, emisión, registro de pagos, semáforo de quién pagó. → *reemplaza el 80% del Excel*
- **Fase 2** · Caja completa: egresos con comprobantes, cierre de mes, arrastre de saldo, dashboard de transparencia, estados de cuenta.
- **Fase 3** · Fino: conciliación de agua, provisiones, cuotas extra, notificaciones por correo, recibos PDF/WhatsApp.
- **Fase 4** · Historia y blindaje: migración del Excel histórico, bitácora visible, backups automáticos, manual de usuario.

## 13. Criterio de éxito

La plataforma está lista cuando reproduce **al céntimo** dos meses reales del Excel (junio y julio 2026, incluidos como fixtures de test en `tests/fixtures/`), y cuando una persona que nunca vio el Excel puede cerrar un mes completo sola siguiendo la pantalla.
