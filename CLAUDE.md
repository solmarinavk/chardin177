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

## Qué NO hacer

- No agregar librerías de UI pesadas (nada de MUI/AntD). Tailwind + componentes propios.
- No usar `service_role` key en el cliente jamás.
- No crear features fuera del roadmap sin registrarlas primero en `ROADMAP.md`.
- No "arreglar" datos históricos con UPDATE directo: siempre vía ajustes visibles.
- No usar floats para dinero (repetido a propósito).
