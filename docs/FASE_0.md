# Fase 0 · Fundaciones — qué se construyó y cómo probarlo

Esta fase deja la app con **login funcionando por email y contraseña**, el
**sistema de roles** y los **helpers de dinero en céntimos con tests**. La base
de datos (Supabase) y el deploy (Netlify) son pasos manuales tuyos; abajo están.

## Lo que ya está en el repo

| Archivo / carpeta | Qué es |
|---|---|
| `app/page.tsx` | Página pública "Chardin 177, próximamente" con botón Ingresar |
| `app/login/` | Login con email y contraseña (mobile first, botones grandes) |
| `app/(app)/` | Zona autenticada: layout protegido + `/inicio` según rol |
| `app/sin-acceso/` | Pantalla para quien no tiene el rol necesario |
| `lib/supabase/` | Clientes de Supabase (navegador, servidor, middleware) |
| `lib/roles.ts` | `getRol()`, `requireRol()`, menú por rol |
| `lib/centimos.ts` | Dinero en céntimos: `aCentimos`, `aSoles`, `formatoPEN`, `prorratear` |
| `middleware.ts` | Refresca sesión y protege rutas privadas |
| `scripts/seed_perfiles.ts` | Conecta los 4 usuarios de Auth con su rol en `perfiles` |
| `supabase/migrations/0001_schema_inicial.sql` | El esquema como migración inicial |
| `tests/centimos.test.ts` | 20 tests (incluye verificación contra junio y julio reales) |

## Prueba que YA puedes hacer ahora mismo (sin Supabase)

```bash
npm install
npm test        # deben pasar 20 tests en verde
npm run build   # debe compilar sin errores
```

## Pasos manuales que faltan (tú, una sola vez)

1. **Crear el proyecto en Supabase** (Paso 2 de la guía): crea el proyecto,
   pega `supabase/schema.sql` en el SQL Editor y ejecútalo. Luego pega
   `supabase/verificar_semilla.sql` y confirma que todo diga **OK** (10 dptos).
2. **Crear los 4 usuarios** en Authentication → Users (con Auto Confirm):
   `admin@`, `tesoreria@`, `porteria@`, `vecinos@` (usa tus correos reales).
   Apaga el registro público (Authentication → Sign In / Up).
3. **Llaves**: crea `.env.local` copiando `.env.local.example` y pega tus 3
   llaves de Supabase (Settings → API).
4. **Sembrar los perfiles** (conecta cada usuario con su rol):
   ```bash
   npm run seed:perfiles
   ```
   Si tus correos son distintos a los de ejemplo, cámbialos arriba en
   `scripts/seed_perfiles.ts` (o usa las variables `SEED_ADMIN_EMAIL`, etc.).

## Prueba del login (después de los pasos de arriba)

```bash
npm run dev     # abre http://localhost:3000
```

1. Entra con `tesoreria@…` → debes ver "Hola, Tesorería" y su menú.
2. Sal y entra con `porteria@…` → el menú es más corto (solo lecturas).
3. Entra con `vecinos@…` (residente) → solo ve inicio, nada de escribir.

## Verificación de RLS a mano (tarea 0.6, en Supabase)

En el SQL Editor, con el rol de cada usuario, comprueba que:
- El **portero** NO puede leer `pagos` ni escribir en `egresos`.
- El **residente** (`vecinos@`) NO puede escribir en ninguna tabla.

## Deploy a Netlify (Paso 5 de la guía)

Importa el repo en Netlify, agrega las mismas 3 variables de entorno y
deploya. Cada push actualiza la web sola.
