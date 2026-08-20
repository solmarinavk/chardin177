# Chardin 177 — Guía completa: quién hace qué y el mes de principio a fin

Todo lo que se puede ver y hacer en la plataforma, quién puede hacerlo, y el
flujo completo de un mes hasta que cierra. Pensado para la junta directiva y para
quien reciba el cargo de tesorería o administración.

**En una frase:** el portero anota el agua, la plataforma calcula sola la cuota de
cada departamento, tesorería cobra y paga, el mes se cierra arrastrando el saldo, y
**todo queda a la vista de los vecinos en una página pública**.

---

## 1. Los cuatro actores

| Actor | ¿Tiene clave? | Para qué |
|---|---|---|
| **Vecino / público** | **No** | Ver las cuentas del edificio (página abierta). Solo consulta. |
| **Portería** | Sí | Anotar las lecturas de agua. |
| **Tesorería** | Sí | El día a día del dinero: recibos, cuotas, cobros, gastos, cierre. |
| **Administración** | Sí | Todo lo de tesorería + ajustes de fondo (cuotas fijas, usuarios, bitácora). |

> El "vecino" **ya no es un usuario con clave**. Es cualquiera que abra el enlace
> público. El login es solo para los tres roles que **escriben**.

---

## 2. El VECINO (página pública, sin cuenta)

**Cómo entra:** abre el enlace `…/transparencia` (se comparte por WhatsApp del
edificio) o entra a la portada y toca **"Ver las cuentas del edificio"**. No pide
usuario ni clave.

### Qué VE

- **Caja del edificio** en vivo: cuánto hay, cuánto está apartado en provisiones
  (vacaciones, CTS, gratificación) y el **disponible real**.
- **El edificio visual** 🏢: la fachada del Chardin 177 con una ventana por
  departamento, pintada según el pago del mes — **verde** (pagó), **ámbar**
  (parcial), **rojo** (pendiente). Al tocar una ventana ve el detalle (cuánto pagó
  / cuánto debe).
- **Selector de mes**: puede mirar el edificio y los pagos de **meses anteriores**,
  no solo el actual.
- **Estado de cuenta de cada departamento** y las **deudas por antigüedad**.
- **Gastos del edificio** (los 15 más recientes) con su comprobante.
- **Consumo de agua** por departamento de los últimos 6 meses.

### Qué puede HACER

- **Descargar en Excel** las cuentas (cuotas, pagos, gastos, caja, consumo), con
  filtros de rango de meses — **sin necesidad de cuenta**.
- **Compartir por WhatsApp** el resumen del mes (los 10 dptos + recaudado + enlace)
  con un botón, listo para pegar en el grupo.
- **Copiar** ese mismo texto.

### Qué NO puede hacer

- No ve datos personales (nombres, correos, teléfonos, bitácora): la página solo
  muestra números del edificio.
- **No puede modificar nada.** Registrar pagos, gastos, emitir o cerrar exige entrar
  con un rol. Es una página de **solo consulta**.

---

## 3. Los perfiles con login — qué ve cada uno

Al entrar, cada rol ve solo su menú:

| Sección | Portería | Tesorería | Administración |
|---|:---:|:---:|:---:|
| Inicio (resumen del mes) | ✅ | ✅ | ✅ |
| Lecturas de agua | ✅ | ✅ | ✅ |
| Periodos (recibos, calcular, emitir, cobrar, cerrar) | — | ✅ | ✅ |
| Estado de cuenta | — | ✅ | ✅ |
| Caja y egresos | — | ✅ | ✅ |
| Exportar a Excel | — | ✅ | ✅ |
| Documentos | — | ✅ | ✅ |
| Ayuda | ✅ | ✅ | ✅ |
| **Administración** (cuotas fijas, usuarios, bitácora) | — | — | ✅ |

- **Portería** entra y ve **una sola misión**: las lecturas del mes. Nada de dinero.
- **Tesorería** ve el "GPS del mes" en su inicio: qué paso toca ahora.
- **Administración** ve lo mismo que tesorería **más** el engranaje de Administración.

---

## 4. EL MES COMPLETO, paso a paso 🗓️

Este es el corazón. La plataforma guía con un "GPS" en el inicio de tesorería: te
dice **qué paso toca ahora**. En orden:

### Paso 1 · Crear el periodo del mes — *Tesorería o Admin*
En **Periodos → Crear periodo**, elige mes y año. Nace en estado **borrador**.
Solo puede haber **un borrador a la vez**.

### Paso 2 · Lecturas de agua — *Portería*
En **Lecturas**, el portero anota la **lectura actual** de los 10 medidores.
- La **lectura anterior se jala sola** del mes pasado (no se digita).
- Valida que la actual no sea menor que la anterior (bloquea) y **avisa** si el
  consumo es muy distinto al promedio.
- **Se guarda solo** cada lectura al salir del campo (si se corta el internet, no
  se pierde lo avanzado); el botón **Guardar** es la confirmación final.
- Puede subir foto del medidor (opcional).

### Paso 3 · Recibos del mes — *Tesorería*
En el periodo, registra el monto del **recibo de agua (Sedapal)** y el de **luz
común**, con su foto. Junto al campo aparece **"el mes pasado: S/ …"** como
referencia para detectar errores de tipeo.

### Paso 4 *(opcional)* · Cuota extraordinaria (derrama) — *Tesorería o Admin*
Si hay un gasto extra que se cobra aparte (ej. pintar la fachada), se crea aquí y
se suma como **EXTRA** a la cuota de cada dpto al recalcular.

### Paso 5 · Calcular cuotas — *Tesorería*
Botón **Calcular cuotas**. La plataforma:
- Reparte el agua **por consumo** (Δm³), con la regla del céntimo sobrante al que
  más consumió.
- Suma agua común, luz, vigilancia, mantenimiento, materiales (las **cuotas fijas**)
  y cualquier extra/ajuste.
- **Nadie digita la cuota**: sale sola de los datos base. Se puede recalcular las
  veces que haga falta mientras esté en borrador.

### Paso 6 · Emitir el periodo — *Tesorería o Admin*
Botón **Emitir**. Congela las 10 cuotas y las **publica**. Desde aquí:
- **Ya no se editan** lecturas ni recibos de este mes.
- Cualquier corrección va como **ajuste del mes siguiente** (nunca se "arregla"
  hacia atrás).
- Las cuotas aparecen en el edificio público y en el estado de cuenta de cada dpto.

### Paso 7 · Cobranza — *Tesorería*
En el periodo emitido, registra cada pago (monto, fecha, medio: Yape/Plin/
transferencia/efectivo, y comprobante opcional).
- **Pago en un toque**: desde el edificio o el semáforo, tocar un dpto en rojo/ámbar
  abre su formulario con **el monto pendiente y la fecha de hoy ya puestos**.
- Acepta **pagos parciales** (queda en ámbar).
- El **semáforo y el edificio se pintan de verde solos** al registrar el pago.
- Un pago mal puesto se puede **anular** (queda en la bitácora).

### Paso 8 · Gastos del mes (egresos) — *Tesorería o Admin*
En **Caja y egresos**, registra lo que se paga del edificio (vigilancia, agua, luz,
mantenimiento, reparaciones…), con categoría, monto, fecha, comprobante y si **ya
está pagado**. Los pagados salen de la caja del mes. El **mantenimiento** se
registra igual, como un egreso con su categoría.

### Paso 9 · Cerrar el mes — *Tesorería o Admin*
Botón **Cerrar el mes**. Antes muestra el cuadre de caja y avisa de morosos. Al
cerrar:
- Se **fija el saldo final** del mes.
- Las cuotas impagas pasan como **deuda** a la cuenta corriente del dpto (se cobran
  en meses siguientes; entran a la caja del mes en que se cobran).
- Las **provisiones activas acumulan su aporte** del mes.
- Se **abre el mes siguiente** con el saldo arrastrado como saldo inicial.
- El mes queda **cerrado e inmutable**.

> **Regla de empalme:** el saldo inicial de un mes **se calcula** del cierre del
> anterior. **Jamás se digita.**

---

## 5. Flujos especiales

| Flujo | Quién | Qué es |
|---|---|---|
| **Cuota extraordinaria (derrama)** | Tesorería / Admin | Cobro extra prorrateado (igual o por dpto) que se suma como EXTRA en el borrador. |
| **Conciliación de agua** | Tesorería / Admin | Compara lo cobrado por agua contra el total real de Sedapal en un rango y reparte la diferencia como ajuste. |
| **Provisiones** | Admin define, Tesorería usa | Fondos apartados (vacaciones, CTS, gratificación): acumulan al cerrar y se descuentan del "disponible real". |
| **Mantenimiento / incidencia** | Tesorería / Admin | El vecino avisa por WhatsApp; se registra como egreso con su categoría y comprobante. |
| **Comprobante del vecino** | Tesorería | El vecino manda su voucher por WhatsApp y tesorería registra el pago directo en Cobranza. |
| **Morosidad** | (automático) | Las deudas por dpto con su antigüedad se ven en Estado de cuenta y en la página pública. |

---

## 6. Herramientas de administración *(solo Admin)*

En **Administración**:
- **Cuotas fijas**: cambiar vigilancia, mantenimiento, materiales y agua común. Cada
  cambio crea una **versión nueva** (con fecha de vigencia); los meses viejos
  conservan sus valores.
- **Usuarios y roles**: **traspaso de cargo** (cambiar quién es tesorería, portería,
  admin) con confirmación, activar/desactivar accesos, y el **padrón de residentes**
  (para los avisos). No se puede quitar al último admin.
- **Bitácora**: quién cambió qué y cuándo. Solo lectura; nadie la puede editar.

Fuera del engranaje, disponibles para tesorería y admin:
- **Documentos**: reglamento, actas, presupuestos y el Excel histórico, descargables.
- **Exportar a Excel**: botón en cada módulo + una pantalla de exportación total con
  filtros (rango de meses, dpto, categoría). Montos en soles.

Automático (sin que nadie lo toque):
- **Backup semanal**: todas las tablas se respaldan a CSV cada lunes.
- **Avisos por correo** (si está configurado Resend): al emitir y recordatorio a
  pendientes el día 25.

---

## 7. Reglas de oro (las que nunca se rompen)

1. **El dinero siempre en céntimos enteros.** Se muestra en soles solo en pantalla.
2. **La plataforma calcula las cuotas.** Nadie las digita.
3. **Un mes emitido o cerrado es inmutable.** Las correcciones van como ajuste del
   mes siguiente, nunca hacia atrás.
4. **El saldo inicial se calcula del cierre anterior.** Jamás se digita.
5. **Cada cambio sensible queda en la bitácora** (pagos, egresos, cuotas, lecturas,
   perfiles, cuotas fijas…).
6. **La página pública es de solo consulta.** Toda escritura exige login; el público
   solo lee las cuentas del edificio, nunca datos personales.

---

## 8. Checklist mensual rápido

**Portería** (una vez al mes, cuando abre el periodo):
- [ ] Anotar las 10 lecturas de agua y Guardar.

**Tesorería** (el grueso del mes):
- [ ] Crear el periodo del mes.
- [ ] Registrar los recibos de agua y luz.
- [ ] Calcular las cuotas y revisarlas.
- [ ] Emitir el periodo.
- [ ] Cobrar cada pago conforme entran (compartir el resumen por WhatsApp ayuda).
- [ ] Registrar los gastos del mes (vigilancia, agua, luz, etc.).
- [ ] Cerrar el mes.

**Administración** (esporádico):
- [ ] Actualizar cuotas fijas cuando cambian (aumento de vigilancia, etc.).
- [ ] Gestionar usuarios/roles y el padrón de residentes.
- [ ] Revisar la bitácora si hace falta.

**Vecino** (cuando quiera):
- [ ] Abrir la página pública, ver el edificio del mes, descargar el Excel o compartir el resumen.

---

## 9. Preguntas frecuentes

**¿Qué pasa si me equivoco al emitir?** No se edita el mes; registras un **ajuste**
en el mes siguiente (queda visible y trazable).

**¿Un vecino puede pagar parcial?** Sí: su ventana queda en **ámbar** y se ve cuánto
pagó y cuánto debe.

**¿La deuda de un mes se pierde al cerrar?** No: pasa como **deuda** del dpto y se
cobra después; entra a la caja del mes en que se paga.

**¿Cómo cambio quién es tesorero?** Administración → Usuarios y roles → cambiar el
rol (pide confirmación y queda en la bitácora). El usuario nuevo se crea primero en
Supabase Auth.

**¿Los vecinos ven quién debe?** Sí, por número de dpto (sin nombres) en el edificio
y en el estado de cuenta público. Es la presión de cobranza del edificio.

**¿Los datos de la página pública están al día?** Sí, en vivo: apenas tesorería
registra un pago, aparece en el siguiente refresh de la página.
