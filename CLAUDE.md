# CLAUDE.md · Reglas del proyecto Chardin 177

Eres el desarrollador principal de la plataforma de administración del edificio Chardin 177 (Lima, Perú). Lee `docs/PROPUESTA.md` para el contexto de negocio completo y `ROADMAP.md` para saber qué toca construir. Trabaja fase por fase, en orden, y no avances a la siguiente fase sin que la actual pase sus tests.

## Stack (no cambiar sin justificación explícita)

- Next.js 14+ con App Router, TypeScript estricto, Tailwind CSS
- Supabase: Postgres, Auth (magic link), Row Level Security, Storage
- Deploy en Netlify con `@netlify/plugin-nextjs`
- Tests: Vitest para lógica, tests SQL con pgTAP o scripts de verificación para RLS
- Email: Resend

## Reglas de oro (violarlas es bug crítico)

1. **DINERO EN CÉNTIMOS.** Toda cantidad monetaria es `integer` (céntimos de sol). Nunca `float`, nunca `numeric` con aritmética en JS. Se formatea a soles solo en la UI. Regla de redondeo del prorrateo de agua: repartir por consumo, redondear cada dpto a céntimo, y el residuo (positivo o negativo) se asigna al dpto de mayor consumo del mes.
2. **El motor de cálculo vive en Postgres** como función `generar_cuotas(periodo_id)` dentro de una transacción. El frontend nunca calcula cuotas, solo las muestra.
3. **Periodos emitidos son inmutables.** Ninguna ruta, función ni política permite modificar cuotas, lecturas o recibos de un periodo en estado `emitido` o `cerrado`. Las correcciones se registran como ajustes en el periodo siguiente.
4. **El saldo inicial de un periodo se calcula, jamás se digita.**
5. **RLS activo en TODAS las tablas** desde el primer día. Ninguna tabla sin políticas. Los permisos por rol están definidos en `supabase/schema.sql` y son la fuente de verdad.
6. **Bitácora de auditoría**: triggers de `audit_log` en `pagos`, `egresos`, `cuotas`, `lecturas_agua`, `perfiles`, `cuotas_fijas`. Solo INSERT, nunca UPDATE/DELETE sobre `audit_log`.
7. **Tests dorados obligatorios**: `tests/fixtures/junio_2026.json` y `tests/fixtures/julio_2026.json` contienen datos reales del edificio con resultados esperados. `generar_cuotas` debe reproducirlos con tolerancia de 1 céntimo por dpto, salvo el dpto que absorbe el residuo de redondeo (el de mayor consumo), donde se admite hasta 5 céntimos. Además la suma de todas las cuotas debe cuadrar EXACTA con recibos + fijas + extras. Si un cambio rompe estos tests, el cambio está mal, no los tests.
8. **Validaciones de lectura**: lectura_actual ≥ lectura_anterior (bloquear), variación > 60% vs promedio 6 meses (alertar, no bloquear), Σ Δm3 = 0 (repartir en partes iguales y alertar).

## Convenciones

- Idioma: UI y datos en español (es-PE). Código, variables y commits en inglés. Formato de moneda `S/ 1,234.56`, fechas `dd/mm/yyyy`, zona horaria `America/Lima`.
- Nombres de tablas y columnas en español snake_case (coinciden con el dominio: `cuotas`, `lecturas_agua`, `egresos`).
- Commits convencionales: `feat:`, `fix:`, `test:`, `chore:`, `docs:`. Una feature por rama, PR contra `main`.
- Migraciones en `supabase/migrations/` numeradas; nunca editar una migración ya aplicada, crear una nueva.
- Variables de entorno solo vía `.env.local` (git-ignored) y Netlify env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (solo server), `RESEND_API_KEY`.
- Mobile first: el portero y los vecinos usan celular. Cada pantalla se diseña primero a 380px.
- Componentes de servidor por defecto; cliente solo donde hay interacción.
- Accesibilidad básica: labels, contraste, botones grandes (usuarios de 60+ años).

## Estructura del repo

```
/app                    rutas Next.js (App Router)
  /(public)             dashboard transparente, login
  /(app)                módulos autenticados por rol
/components
/lib                    cliente supabase, helpers de dinero (centimos.ts), fechas
/supabase
  schema.sql            esquema completo de referencia (fuente de verdad)
  /migrations
/tests
  /fixtures             junio_2026.json, julio_2026.json (NO TOCAR: datos reales)
  motor.test.ts         tests dorados del motor de cálculo
  rls.test.ts           tests de permisos por rol
/docs
  PROPUESTA.md          contexto de negocio
ROADMAP.md              fases y tareas
CLAUDE.md               este archivo
```

## Definición de "terminado" para cualquier tarea

1. Compila sin warnings de TypeScript.
2. Tests dorados en verde.
3. RLS verificado para la tabla tocada (un usuario del rol equivocado NO puede escribir).
4. Funciona en viewport móvil de 380px.
5. Toda escritura sensible genera fila en `audit_log`.
6. Deploy preview de Netlify funcionando.
7. **Las vistas públicas sirven datos EN VIVO** (sin caché congelada): tras registrar un pago, `/transparencia` y el export público lo muestran en el siguiente refresh. Todo lo público lleva `no-store` en todas las capas (segmento `force-dynamic` + `fetchCache`, fetch del cliente anon, y cabeceras `Cache-Control`/`CDN-Cache-Control`/`Netlify-CDN-Cache-Control` desde el middleware) — la CDN de Netlify llegó a servir la página congelada con los datos del deploy.

## Qué NO hacer

- No agregar librerías de UI pesadas (nada de MUI/AntD). Tailwind + componentes propios.
- No usar `service_role` key en el cliente jamás.
- No crear features fuera del roadmap sin registrarlas primero en `ROADMAP.md`.
- No "arreglar" datos históricos con UPDATE directo: siempre vía ajustes visibles.
- No usar floats para dinero (repetido a propósito).

## Fase 4 · Migración histórica y exportación a Excel (reglas para cuando se construyan)

Estas dos features están planificadas en `ROADMAP.md` (tareas 4.1 y 4.6). No se construyen hasta la Fase 4, pero estas reglas aplican desde el diseño.

### Migración histórica del Excel (tarea 4.1)

- El archivo fuente es `Chardin_177_Historico.xlsx` (formato tabla larga, ya auditado y validado): hoja `Cuotas` (una fila por depto por mes, feb-2024 a jul-2026), hoja `Caja` (saldos mensuales), `Resumen mensual` y `Departamentos`. El usuario lo entrega al llegar a la Fase 4.
- Los datos históricos **se cargan tal cual, SIN recalcular con el motor**. Es la única excepción documentada a "el motor calcula": los periodos migrados son un volcado fiel del Excel auditado. `generar_cuotas` NO se ejecuta sobre ellos.
- Cada mes histórico entra como un periodo en estado `cerrado`, con sus cuotas por depto; la hoja `Caja` fija los saldos mensuales arrastrados. Como todo periodo cerrado, son **inmutables** (no se editan; correcciones futuras van como ajustes del periodo siguiente).
- **Empalme sin saltos:** el saldo final del último mes histórico (jul-2026) de la hoja `Caja` debe ser exactamente el saldo inicial del primer periodo operativo. El script valida que los saldos cuadran y **aborta si no cuadra** (no carga nada a medias).
- `scripts/migrar_excel.ts` lee el `.xlsx` con la **service role key SOLO en local** (nunca en el cliente).
- El Excel histórico se guarda además como **documento descargable** en el módulo Documentos.

### Exportador a Excel (tarea 4.6)

- Cada módulo (pagos, egresos, estado de cuenta, caja) lleva un botón **"Descargar Excel"** que exporta lo que el usuario ve; además una pantalla de **"Exportación total"** con filtros (periodo, rango de meses, dpto, tipo de dato) que genera un `.xlsx` con **una hoja por tipo de dato**.
- La generación del `.xlsx` es **del lado servidor** con `exceljs` o `SheetJS`. Aclaración a "no librerías de UI pesadas": esa regla es para UI; las librerías de datos del lado servidor (exceljs/SheetJS) **sí están permitidas**.
- En el Excel los montos van **en soles** (formateados desde céntimos con los helpers de `lib/centimos.ts`), aunque internamente todo siga en céntimos enteros.
- Permisos: **admin y tesorería exportan todo; el residente solo su propio estado de cuenta.** La exportación respeta RLS igual que el resto de la app (nunca se salta permisos con la service role).
