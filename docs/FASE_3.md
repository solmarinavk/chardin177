# Fase 3 · Fino operativo — qué se construyó y cómo probarlo

Provisiones, cuota extraordinaria, conciliación de agua, recibo por WhatsApp,
mantenimiento, constancia del vecino y notificaciones por correo.

## 🚨 Primero: aplica las migraciones nuevas en Supabase

En **SQL Editor → New query**, pega y ejecuta en orden:

1. `supabase/migrations/0006_provisiones_aporte_cierre.sql` — al cerrar el mes,
   acumula solo el aporte de cada provisión.
2. `supabase/migrations/0007_constancias_pago.sql` — tabla de constancias del
   vecino + permiso para que el residente suba su foto.

(Proyectos nuevos: `schema.sql` ya las incluye, salvo las políticas de Storage,
que siempre van por migración.)

## Lo que se construyó

| Tarea | Dónde | Quién |
|---|---|---|
| **3.1 Provisiones** | `/provisiones` (enlace desde Caja) | admin define aporte; tesorería registra uso; todos ven saldo |
| **3.2 Derrama** | Periodo en borrador → "Cuota extraordinaria" | tesorería / admin |
| **3.3 Conciliación de agua** | `/conciliacion` (desde Caja) | tesorería / admin |
| **3.4 Recibo por dpto** | Periodo emitido → "Recibos por departamento" | todos (compartir por WhatsApp / imprimir) |
| **3.5 Notificaciones** | Automático al emitir + cron del día 25 | — |
| **3.6 Mantenimiento** | Caja → "Registrar mantenimiento / incidencia" | tesorería / admin |
| **3.7 Constancia** | Residente en `/estado-cuenta`; tesorería en la cobranza | vecino sube, tesorería confirma |

## Verificado con tests (corre `npm test` → 51 en verde)

- Provisión: al cerrar, solo las que tienen aporte > 0 generan movimiento.
- Derrama: `cuota_extra` → el motor la suma como EXTRA.
- Conciliación: `conciliacion_agua` → el motor la suma como AJUSTE (no extra).
- Constancia (RLS): el residente sube la suya, **no** a nombre de otro, y **no**
  puede confirmar; tesorería sí.

## Cómo lo pruebas tú

1. **Provisiones**: entra como admin → Caja → Provisiones → pon un aporte
   mensual (ej. Vacaciones S/300). Al cerrar un mes, verás el movimiento sumado.
2. **Derrama**: en el mes en borrador → "Cuota extraordinaria" → crea una (ej.
   Pintado de fachada, S/200 por dpto) → **Recalcular cuotas** → aparece como
   EXTRA en cada recibo.
3. **Conciliación**: Caja → Conciliación de agua → elige un rango, pon el total
   real de Sedapal → mira la vista previa por dpto → Aplicar (agrega ajustes al
   borrador; recalcula).
4. **Recibo**: en un mes emitido → "Recibos por departamento" → abre uno →
   **Compartir por WhatsApp** / Imprimir.
5. **Constancia**: entra como vecino → Estado de cuenta → "Subir mi constancia"
   → sube una foto. Luego, como tesorería, abre el periodo → en Cobranza verás
   "Constancias por confirmar" → confírmala (crea el pago).

## Notificaciones por correo (3.5) — opcional

Sin configurar, la app funciona igual (no envía correos). Para activarlas:

1. Crea una cuenta en **resend.com**, verifica un dominio y saca una API key.
2. En Netlify → Environment variables agrega:
   - `RESEND_API_KEY=re_...`
   - `EMAIL_FROM=Chardin 177 <avisos@tudominio.pe>`
   - `CRON_SECRET=una_clave_larga_secreta`
3. **Requisito**: los correos van a la tabla `residentes` (con su email). Esa
   tabla se llena al gestionar residentes (Fase 4). Mientras esté vacía, no hay
   a quién enviar.
4. **Recordatorio del día 25**: programa un cron (Netlify Scheduled Function,
   GitHub Action o cron-job.org) que haga `POST` a
   `https://tu-sitio/api/recordatorios` con la cabecera
   `Authorization: Bearer <CRON_SECRET>`.

## Recordatorio de siempre
El nuevo código se ve en tu web tras un **re-deploy en Netlify** (Trigger deploy
→ Clear cache and deploy site).
