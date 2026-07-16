# Auditoría por roles · 15/07/2026

Recorrido completo de la app poniéndome en los zapatos de cada perfil, buscando
**omisiones**: cosas que faltan, flujos que se rompen y huecos de permisos.

**Método:** (1) tests automatizados que simulan a cada rol contra Postgres real
(`tests/rls.test.ts`, 10 tests); (2) revisión de cada página y acción del
código; (3) recorrido visual de cada pantalla con datos reales de julio 2026.

---

## Qué puede hacer cada rol (verificado)

| Acción | Admin | Tesorería | Portería | Residente |
|---|:-:|:-:|:-:|:-:|
| Crear periodo / recibos / calcular / emitir | ✅ | ✅ | ⛔ | ⛔ |
| Registrar y anular pagos | ✅ | ✅ | ⛔ | ⛔ |
| Ingresar lecturas de agua | ✅ | ✅ | ✅ | ⛔ |
| Ver periodos, semáforo y estado de cuenta | ✅ | ✅ | ⛔ (solo UI)¹ | ✅ |
| Ver la bitácora (audit_log) | ✅ (por SQL)² | ⛔ | ⛔ | ⛔ |
| Escribir en cuotas o audit_log directo | ⛔ | ⛔ | ⛔ | ⛔ |

⛔ = verificado que NO puede (test automatizado o redirección a /sin-acceso).

¹ La PROPUESTA (§5) dice que portería solo ve el módulo de lecturas. La interfaz
ya lo cumple (menú y páginas bloqueadas). **Nota:** a nivel de base de datos, el
`schema.sql` (fuente de verdad de permisos) da LECTURA de datos a todo usuario
autenticado por transparencia, así que portería podría leer datos vía API con
sus credenciales. Decidir en junta si se restringe también en la base; quedó
registrado en el backlog del ROADMAP.

² La pantalla de bitácora para admin es la tarea 4.2 del ROADMAP (Fase 4).

---

## Hallazgos y su estado

### Corregidos ahora

1. **El portero no podía guardar lecturas a medias.** Todos los campos eran
   obligatorios: si subía piso por piso, no podía guardar hasta tener las 10.
   → Ahora guarda las que tenga (las vacías quedan pendientes) y el mensaje
   dice cuántas faltan.
2. **No había forma de anular un pago mal digitado.** Un error de tipeo dejaba
   la cuota mal para siempre (la regla del proyecto prohíbe UPDATEs directos).
   → Botón "Anular" en la cobranza (tesorería/admin), con confirmación; el
   estado de la cuota se recalcula solo y la anulación queda en la bitácora.
   Test automatizado incluido (residente NO puede anular).
3. **Las fotos subidas eran invisibles.** Se subían al Storage pero ninguna
   pantalla las mostraba. → Enlaces con URL firmada: foto del recibo (en el
   formulario y en el periodo emitido), comprobante de cada pago (en la
   cobranza) y foto del medidor (en lecturas).
4. **Portería podía abrir /periodos y /estado-cuenta escribiendo la URL.**
   El menú se los ocultaba, pero la página cargaba. → Ahora redirigen a
   /sin-acceso (ver nota ¹ sobre el nivel API).
5. **Sin aviso de borrador desactualizado.** Si cambiabas una lectura después
   de calcular, la tabla vieja seguía visible sin advertencia. → Nota junto al
   botón: "si cambias lecturas o recibos, vuelve a calcular antes de emitir".
6. **La app no era instalable en el celular.** → Ahora es una PWA completa:
   manifest, iconos (incluye maskable para Android y apple-touch-icon para
   iPhone), pantalla completa standalone, accesos directos (long-press) a
   Lecturas y Periodos. Ver `docs/INSTALAR_APP.md`.
7. **El manifest quedaba bloqueado por el middleware de sesión** (redirigía a
   /login y rompía la instalación). → Excluido del middleware.

### Pendientes conocidos (con su fase)

| Qué falta | Dónde queda |
|---|---|
| Egresos, libro de caja y **cerrar mes** (paso 6 del GPS) | Fase 2 (2.1–2.3) |
| Dashboard público de transparencia y morosidad | Fase 2 (2.4–2.5) |
| Residente sube su constancia de pago para confirmación | Backlog (PROPUESTA §5, opcional) |
| Pantalla de bitácora para admin | Fase 4.2 |
| Usuarios y roles (traspaso de cargo) | Fase 4.5 |
| Modo offline de la PWA (service worker) | Backlog |

---

## Garantías que quedaron cubiertas por tests (44 en total)

- El motor reproduce junio y julio 2026 al céntimo (tolerancia documentada).
- Un solo borrador a la vez; periodos emitidos inmutables.
- Pagos: estados pendiente→parcial→pagado; anulación revierte el estado.
- Cierre de caja cuadra y arrastra el saldo.
- Permisos por rol simulando usuarios reales (incluye la regresión del bug
  "stack depth limit exceeded" de producción).
