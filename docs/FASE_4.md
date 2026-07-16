# Fase 4 · Historia y blindaje — qué se construyó y qué debes hacer

Migración histórica, exportador a Excel, bitácora, backups, manual embebido,
gestión de usuarios/residentes y cuotas fijas editables.

## 🟢 Buenas noticias: casi no hay que correr SQL

La base de datos ya traía las políticas (RLS) y los triggers de auditoría que
esta fase necesitaba. Así que **no hay migraciones nuevas de esquema**. Lo único
que corres en Supabase es el **SQL de datos del histórico** (4.1), y solo cuando
tengas el Excel.

## Lo que se construyó

| Tarea | Dónde | Quién |
|---|---|---|
| **4.6 Exportar a Excel** | Botón en Caja, Estado de cuenta y Periodo + pantalla **Exportar** | tesorería / admin |
| **Cuotas fijas** | `/cuotas-fijas` (desde Administración) | admin |
| **4.5 Usuarios y roles** | `/usuarios` (traspaso de cargo + padrón de residentes) | admin |
| **4.2 Bitácora** | `/bitacora` (quién cambió qué y cuándo) | admin |
| **4.1 Migración histórica** | `scripts/migrar_excel.ts` + módulo **Documentos** | tú (local) |
| **4.4 Manual** | `/ayuda` | todos |
| **4.3 Backups** | GitHub Action semanal → rama `backups` | automático |

Las herramientas de admin viven bajo **Administración** (`/administracion`).
Exportar, Documentos y Ayuda salen en el menú; en el celular se llega a todo
desde los accesos rápidos del Inicio.

## Verificado con tests (`npm test` → 78 en verde)

- **Exportador**: el `.xlsx` se genera y se relee bien; montos en soles como
  **número** (sumables), fechas reales, una hoja por tipo. Probado además de
  punta a punta: login → descarga → se abre el archivo con datos correctos.
- **Cuotas fijas**: selección de la versión vigente; solo admin versiona;
  tesorería no; queda auditado.
- **Usuarios**: admin cambia roles y gestiona el padrón; tesorería no; auditado.
- **Bitácora**: resumen de cambios (qué campos cambiaron).
- **Migración**: valida el empalme y el cuadre de céntimos; el SQL generado se
  ejecutó contra un Postgres real (pglite) sin romper nada.

## ✅ Lo que TÚ debes hacer

### 1) Backups automáticos (una vez)

En GitHub → **Settings → Secrets and variables → Actions → New repository secret**,
agrega dos secrets:

- `SUPABASE_URL` = `https://zlpnyetklehgaaouowdv.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` = tu service role key (la de siempre, **nunca** la
  publiques)

La Action corre sola cada lunes; también puedes lanzarla a mano en la pestaña
**Actions → Backup semanal → Run workflow**. Los CSV quedan en la rama `backups`.

### 2) Migración histórica (cuando tengas el Excel)

Sigue `docs/MIGRACION_HISTORICA.md`. En resumen:

```bash
npm run migrar:excel -- ./Chardin_177_Historico.xlsx
```

Genera `historico_generado.sql`, lo revisas y lo pegas en Supabase → SQL Editor.
El script te dice el **saldo con el que debe empezar el primer mes operativo**.
Luego sube el Excel a **Documentos**.

> Si prefieres, mándame el Excel y te devuelvo el `.sql` listo para pegar.

### 3) Re-deploy en Netlify

Como siempre, el código nuevo se ve tras **Trigger deploy → Clear cache and
deploy site**.

## Cómo lo pruebas tú

1. **Exportar**: en Caja o Estado de cuenta pulsa *Descargar Excel*; o entra a
   *Exportar*, marca los datos y filtra por mes/depto.
2. **Cuotas fijas**: Administración → Cuotas fijas → cambia un monto → se guarda
   como versión nueva (los meses viejos no cambian).
3. **Usuarios**: Administración → Usuarios y roles → cambia un rol (te pide
   confirmar) → míralo luego en la Bitácora.
4. **Bitácora**: Administración → Bitácora → filtra por módulo o fecha.
5. **Documentos**: sube un PDF o el Excel; aparece con su botón de descarga.
6. **Ayuda**: revisa el manual; compártelo con el vecino que entra por primera vez.
